// app/api/health/route.ts
import { NextResponse } from 'next/server';
import { syncService } from '@/lib/db-sync/sync-service';

export async function GET() {
  try {
    const status = await syncService.getStatus();
    
    const isHealthy = status.isRunning && !status.error;
    
    return NextResponse.json({
      healthy: isHealthy,
      service: 'database-sync',
      ...status,
      timestamp: new Date().toISOString()
    }, { 
      status: isHealthy ? 200 : 503 
    });
  } catch (error: any) {
    return NextResponse.json({
      healthy: false,
      service: 'database-sync',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { 
      status: 503 
    });
  }
}