// lib/db-sync/sync-service.ts
import { PrismaClient } from '@prisma/client';
import sql from 'mssql';

const prisma = new PrismaClient();

const mssqlConfig: sql.config = {
  user: process.env.MSSQL_USER!,
  password: process.env.MSSQL_PASSWORD!,
  server: process.env.MSSQL_SERVER!,
  database: process.env.MSSQL_DATABASE!,
  options: {
    encrypt: true,
    trustServerCertificate: false,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

interface TableConfig {
  mysqlTable: string;
  mssqlTable: string;
  primaryKey: string;
  mysqlPK: string;
  mssqlPK: string;
  fields: FieldMapping[];
}

interface FieldMapping {
  mysql: string;
  mssql: string;
  type: 'string' | 'int' | 'boolean' | 'date' | 'datetime' | 'text';
}

class BiDirectionalSyncService {
  private mssqlPool: sql.ConnectionPool | null = null;
  private pollInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private syncInProgress = false;

  private tableConfigs: TableConfig[] = [
    {
      mysqlTable: 'RatingPeriod',
      mssqlTable: 'tblRatingPeriod',
      primaryKey: 'id',
      mysqlPK: 'id',
      mssqlPK: 'RatingPeriodID',
      fields: [
        { mysql: 'periodName', mssql: 'PeriodName', type: 'string' },
        { mysql: 'startDate', mssql: 'StartDate', type: 'date' },
        { mysql: 'endDate', mssql: 'EndDate', type: 'date' },
        { mysql: 'isActive', mssql: 'IsActive', type: 'boolean' },
        { mysql: 'createdBy', mssql: 'CreatedBy', type: 'string' },
        { mysql: 'dateCreated', mssql: 'DateCreated', type: 'datetime' }
      ]
    },
    {
      mysqlTable: 'RatingCategory',
      mssqlTable: 'tblRatingCategory',
      primaryKey: 'id',
      mysqlPK: 'id',
      mssqlPK: 'CategoryID',
      fields: [
        { mysql: 'categoryName', mssql: 'CategoryName', type: 'string' },
        { mysql: 'sortOrder', mssql: 'SortOrder', type: 'int' }
      ]
    },
    {
      mysqlTable: 'RatingAssignment',
      mssqlTable: 'tblRatingAssignment',
      primaryKey: 'id',
      mysqlPK: 'id',
      mssqlPK: 'AssignmentID',
      fields: [
        { mysql: 'ratingPeriodId', mssql: 'RatingPeriodID', type: 'int' },
        { mysql: 'raterUserId', mssql: 'RaterUserID', type: 'int' },
        { mysql: 'raterEmail', mssql: 'RaterEmail', type: 'string' },
        { mysql: 'rateeUserId', mssql: 'RateeUserID', type: 'int' },
        { mysql: 'rateeEmail', mssql: 'RateeEmail', type: 'string' },
        { mysql: 'isCompleted', mssql: 'IsCompleted', type: 'boolean' },
        { mysql: 'dateCompleted', mssql: 'DateCompleted', type: 'datetime' },
        { mysql: 'createdDate', mssql: 'CreatedDate', type: 'datetime' }
      ]
    },
    {
      mysqlTable: 'RatingResponse',
      mssqlTable: 'tblRatingResponse',
      primaryKey: 'id',
      mysqlPK: 'id',
      mssqlPK: 'ResponseID',
      fields: [
        { mysql: 'assignmentId', mssql: 'AssignmentID', type: 'int' },
        { mysql: 'categoryId', mssql: 'CategoryID', type: 'int' },
        { mysql: 'ratingValue', mssql: 'RatingValue', type: 'int' },
        { mysql: 'comment', mssql: 'Comment', type: 'text' },
        { mysql: 'updatedDate', mssql: 'UpdatedDate', type: 'datetime' }
      ]
    },
    {
      mysqlTable: 'AdminReportsLog',
      mssqlTable: 'tblAdminReportsLog',
      primaryKey: 'id',
      mysqlPK: 'id',
      mssqlPK: 'LogID',
      fields: [
        { mysql: 'adminEmail', mssql: 'AdminEmail', type: 'string' },
        { mysql: 'reportType', mssql: 'ReportType', type: 'string' },
        { mysql: 'exportDate', mssql: 'ExportDate', type: 'datetime' }
      ]
    }
  ];

  async initialize() {
    try {
      this.mssqlPool = await sql.connect(mssqlConfig);
      console.log('✅ MSSQL connection established');
      
      // Validate which tables exist in both databases
      await this.validateTables();
      
      this.startPolling();
      console.log('✅ Sync service started - polling every 5 seconds');
    } catch (error) {
      console.error('❌ Sync service initialization failed:', error);
      // Don't throw - allow service to continue with limited functionality
      console.log('⚠️ Service will continue with available tables');
    }
  }

  private async validateTables() {
    const validConfigs: TableConfig[] = [];

    for (const config of this.tableConfigs) {
      try {
        // Check if MySQL table exists
        const mysqlExists = await this.checkMySQLTableExists(config.mysqlTable);
        
        // Check if MSSQL table exists
        const mssqlExists = await this.checkMSSQLTableExists(config.mssqlTable);

        if (mysqlExists && mssqlExists) {
          validConfigs.push(config);
          console.log(`✅ Table ${config.mysqlTable} <-> ${config.mssqlTable} validated`);
        } else {
          if (!mysqlExists) {
            console.warn(`⚠️ MySQL table ${config.mysqlTable} not found - skipping`);
          }
          if (!mssqlExists) {
            console.warn(`⚠️ MSSQL table ${config.mssqlTable} not found - skipping`);
          }
        }
      } catch (error) {
        console.error(`❌ Error validating ${config.mysqlTable}:`, error);
        // Continue with other tables
      }
    }

    this.tableConfigs = validConfigs;
    console.log(`✅ ${validConfigs.length} table(s) ready for sync`);
  }

  private async checkMySQLTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await prisma.$queryRaw<any[]>`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ${tableName}
      `;
      return result.length > 0;
    } catch (error) {
      console.error(`Error checking MySQL table ${tableName}:`, error);
      return false;
    }
  }

  private async checkMSSQLTableExists(tableName: string): Promise<boolean> {
    try {
      if (!this.mssqlPool) return false;
      
      const result = await this.mssqlPool.request().query(`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = '${tableName}'
      `);
      return result.recordset.length > 0;
    } catch (error) {
      console.error(`Error checking MSSQL table ${tableName}:`, error);
      return false;
    }
  }

  private startPolling() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Run immediately once
    this.syncAllTables().catch(console.error);
    
    // Then poll every 5 seconds
    this.pollInterval = setInterval(async () => {
      if (!this.syncInProgress) {
        await this.syncAllTables();
      }
    }, 5000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
  }

  private async syncAllTables() {
    this.syncInProgress = true;
    
    try {
      for (const config of this.tableConfigs) {
        await this.syncTable(config);
      }
    } catch (error) {
      console.error('❌ Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncTable(config: TableConfig) {
    try {
      // Get all records from both databases
      const mysqlRecords = await this.getMySQLRecords(config);
      const mssqlRecords = await this.getMSSQLRecords(config);

      // Create maps for comparison
      const mysqlMap = new Map(mysqlRecords.map(r => [r[config.mysqlPK], r]));
      const mssqlMap = new Map(mssqlRecords.map(r => [r[config.mssqlPK], r]));

      const mysqlIds = new Set(mysqlMap.keys());
      const mssqlIds = new Set(mssqlMap.keys());

      // Find differences
      const onlyInMySQL = [...mysqlIds].filter(id => !mssqlIds.has(id));
      const onlyInMSSQL = [...mssqlIds].filter(id => !mysqlIds.has(id));
      const inBoth = [...mysqlIds].filter(id => mssqlIds.has(id));

      // Sync records only in MySQL -> Insert to MSSQL
      for (const id of onlyInMySQL) {
        const record = mysqlMap.get(id)!;
        await this.insertToMSSQL(config, record);
        console.log(`➕ Inserted ${config.mssqlTable} ID ${id} to MSSQL`);
      }

      // Sync records only in MSSQL -> Insert to MySQL
      for (const id of onlyInMSSQL) {
        const record = mssqlMap.get(id)!;
        await this.insertToMySQL(config, record);
        console.log(`➕ Inserted ${config.mysqlTable} ID ${id} to MySQL`);
      }

      // Compare records in both and sync based on most recent update
      for (const id of inBoth) {
        const mysqlRecord = mysqlMap.get(id)!;
        const mssqlRecord = mssqlMap.get(id)!;

        const isDifferent = this.recordsDiffer(config, mysqlRecord, mssqlRecord);
        
        if (isDifferent) {
          // Determine which is more recent
          const mysqlTime = this.getRecordTimestamp(mysqlRecord);
          const mssqlTime = this.getRecordTimestamp(mssqlRecord);

          if (mysqlTime > mssqlTime) {
            // MySQL is newer, update MSSQL
            await this.updateMSSQL(config, id, mysqlRecord);
            console.log(`🔄 Updated ${config.mssqlTable} ID ${id} from MySQL`);
          } else if (mssqlTime > mysqlTime) {
            // MSSQL is newer, update MySQL
            await this.updateMySQL(config, id, mssqlRecord);
            console.log(`🔄 Updated ${config.mysqlTable} ID ${id} from MSSQL`);
          }
        }
      }

    } catch (error) {
      console.error(`❌ Error syncing ${config.mysqlTable}:`, error);
    }
  }

  private getRecordTimestamp(record: any): Date {
    // Try common timestamp fields
    const timestampFields = ['updatedDate', 'UpdatedDate', 'dateCreated', 'DateCreated', 'createdDate', 'CreatedDate'];
    
    for (const field of timestampFields) {
      if (record[field]) {
        return new Date(record[field]);
      }
    }
    
    // If no timestamp field, return epoch (treat as oldest)
    return new Date(0);
  }

  private recordsDiffer(config: TableConfig, mysqlRecord: any, mssqlRecord: any): boolean {
    for (const field of config.fields) {
      const mysqlValue = this.normalizeValue(mysqlRecord[field.mysql], field.type);
      const mssqlValue = this.normalizeValue(mssqlRecord[field.mssql], field.type);

      if (mysqlValue !== mssqlValue) {
        return true;
      }
    }
    return false;
  }

  private normalizeValue(value: any, type: string): any {
    if (value === null || value === undefined) return null;
    
    switch (type) {
      case 'boolean':
        return Boolean(value);
      case 'date':
      case 'datetime':
        return new Date(value).toISOString();
      case 'int':
        return Number(value);
      case 'string':
      case 'text':
        return String(value).trim();
      default:
        return value;
    }
  }

  private async getMySQLRecords(config: TableConfig): Promise<any[]> {
    const tableName = config.mysqlTable;
    
    switch (tableName) {
      case 'RatingPeriod':
        return await prisma.ratingPeriod.findMany();
      case 'RatingCategory':
        return await prisma.ratingCategory.findMany();
      case 'RatingAssignment':
        return await prisma.ratingAssignment.findMany();
      case 'RatingResponse':
        return await prisma.ratingResponse.findMany();
      case 'AdminReportsLog':
        return await prisma.adminReportsLog.findMany();
      default:
        return [];
    }
  }

  private async getMSSQLRecords(config: TableConfig): Promise<any[]> {
    if (!this.mssqlPool) return [];

    const result = await this.mssqlPool.request()
      .query(`SELECT * FROM ${config.mssqlTable}`);
    
    return result.recordset;
  }

  private async insertToMSSQL(config: TableConfig, mysqlRecord: any) {
    if (!this.mssqlPool) return;

    const request = this.mssqlPool.request();
    
    const fields = config.fields.map(f => f.mssql).join(', ');
    const params = config.fields.map((f, i) => `@param${i}`).join(', ');

    config.fields.forEach((field, i) => {
      const value = mysqlRecord[field.mysql];
      this.addSQLParameter(request, `param${i}`, field.type, value);
    });

    await request.query(`
      INSERT INTO ${config.mssqlTable} (${fields})
      VALUES (${params})
    `);
  }

  private async insertToMySQL(config: TableConfig, mssqlRecord: any) {
    const data: any = {};
    
    config.fields.forEach(field => {
      data[field.mysql] = mssqlRecord[field.mssql];
    });

    switch (config.mysqlTable) {
      case 'RatingPeriod':
        await prisma.ratingPeriod.create({ data });
        break;
      case 'RatingCategory':
        await prisma.ratingCategory.create({ data });
        break;
      case 'RatingAssignment':
        await prisma.ratingAssignment.create({ data });
        break;
      case 'RatingResponse':
        await prisma.ratingResponse.create({ data });
        break;
      case 'AdminReportsLog':
        await prisma.adminReportsLog.create({ data });
        break;
    }
  }

  private async updateMSSQL(config: TableConfig, id: number, mysqlRecord: any) {
    if (!this.mssqlPool) return;

    const request = this.mssqlPool.request();
    
    const setClause = config.fields
      .map((f, i) => `${f.mssql} = @param${i}`)
      .join(', ');

    config.fields.forEach((field, i) => {
      const value = mysqlRecord[field.mysql];
      this.addSQLParameter(request, `param${i}`, field.type, value);
    });

    request.input('id', sql.Int, id);

    await request.query(`
      UPDATE ${config.mssqlTable}
      SET ${setClause}
      WHERE ${config.mssqlPK} = @id
    `);
  }

  private async updateMySQL(config: TableConfig, id: number, mssqlRecord: any) {
    const data: any = {};
    
    config.fields.forEach(field => {
      data[field.mysql] = mssqlRecord[field.mssql];
    });

    const where = { [config.mysqlPK]: id };

    switch (config.mysqlTable) {
      case 'RatingPeriod':
        await prisma.ratingPeriod.update({ where, data });
        break;
      case 'RatingCategory':
        await prisma.ratingCategory.update({ where, data });
        break;
      case 'RatingAssignment':
        await prisma.ratingAssignment.update({ where, data });
        break;
      case 'RatingResponse':
        await prisma.ratingResponse.update({ where, data });
        break;
      case 'AdminReportsLog':
        await prisma.adminReportsLog.update({ where, data });
        break;
    }
  }

  private addSQLParameter(request: sql.Request, name: string, type: string, value: any) {
    if (value === null || value === undefined) {
      request.input(name, sql.NVarChar, null);
      return;
    }

    switch (type) {
      case 'string':
        request.input(name, sql.NVarChar(200), value);
        break;
      case 'text':
        request.input(name, sql.NVarChar(sql.MAX), value);
        break;
      case 'int':
        request.input(name, sql.Int, value);
        break;
      case 'boolean':
        request.input(name, sql.Bit, value);
        break;
      case 'date':
        request.input(name, sql.Date, value);
        break;
      case 'datetime':
        request.input(name, sql.DateTime, value);
        break;
    }
  }

  async disconnect() {
    this.stopPolling();
    
    if (this.mssqlPool) {
      await this.mssqlPool.close();
    }
    
    await prisma.$disconnect();
  }

  async getStatus() {
    return {
      isRunning: this.isRunning,
      syncInProgress: this.syncInProgress,
      tablesMonitored: this.tableConfigs.length
    };
  }
}

export const syncService = new BiDirectionalSyncService();