# 360° Rating System - Complete Implementation

A professional Next.js application for internal 360-degree employee feedback and performance ratings.

## 🌟 Features

### Rater Portal
- ✅ View assigned colleagues to rate
- ✅ Rate on 5 dimensions (Customer, Accountability, Trust, Care, Innovation)
- ✅ Beautiful accordion UI with completion tracking
- ✅ Submit ratings individually or in bulk
- ✅ Edit previous submissions
- ✅ Progress tracking

### Admin Dashboard
- ✅ Real-time analytics and statistics
- ✅ Interactive charts (Recharts)
- ✅ Top/bottom performer rankings
- ✅ Manage rating periods
- ✅ Full assignment management (CRUD)

### Security
- ✅ URL-based authentication (uid + email)
- ✅ SQL injection protection
- ✅ Admin access control (tmotloung@alliance.co.ls)
- ✅ Role-based authorization

## 🛠 Tech Stack

- **Framework:** Next.js 14+ (App Router)
- **UI:** Tailwind CSS, Lucide React
- **Database:** SQL Server (mssql)
- **Charts:** Recharts
- **Language:** TypeScript

## 📋 Prerequisites

- Node.js 18+
- SQL Server database
- **Existing tblUser table with:**
  - `UserID` column (INT, Primary Key)
  - `Username` column (NVARCHAR, stores email addresses)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd 360-rating-app
npm install
```

### 2. Configure Database

Edit `.env.local`:

```env
DB_SERVER=your-server.database.windows.net
DB_DATABASE=YourDatabase
DB_USER=your-username
DB_PASSWORD=your-password
DB_PORT=1433
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=true
```

### 3. Initialize Database

Run SQL scripts in order:

```bash
# 1. Create rating tables and schema
sqlcmd -S your-server -d your-db -U user -P pass -i database/01-init-schema.sql

# 2. Verify your existing users (IMPORTANT!)
sqlcmd -S your-server -d your-db -U user -P pass -i database/02-verify-users.sql

# 3. Import rating assignments
sqlcmd -S your-server -d your-db -U user -P pass -i database/03-import-assignments.sql
```

### 4. Get Test Credentials

Query your database to get UserIDs:

```sql
SELECT TOP 5 UserID, Username 
FROM tblUser 
WHERE Username LIKE '%@alliance.co.ls%'
ORDER BY UserID;
```

### 5. Run Development Server

```bash
npm run dev
```

Visit with actual UserID from your tblUser:
```
http://localhost:3000?uid=123&email=mokoaram@alliance.co.ls
```

### 6. Build for Production

```bash
npm run build
npm start
```

## 📊 Database Schema

### Existing Table (Required)
- **tblUser** - Your existing user table
  - UserID (INT) - Primary Key
  - Username (NVARCHAR) - Stores email addresses

### New Tables Created

1. **tblRatingPeriod** - Rating cycles
2. **tblRatingCategory** - 5 rating dimensions
3. **tblRatingAssignment** - Who rates whom (with FK to tblUser)
4. **tblRatingResponse** - Individual ratings
5. **tblAdminReportsLog** - Admin activity

## 👥 User Access

### Rater (Any Employee)
```
http://localhost:3000?uid={UserID}&email={Username}
```
Example:
```
http://localhost:3000?uid=123&email=mokoaram@alliance.co.ls
```

### Admin (tmotloung@alliance.co.ls only)
```
http://localhost:3000?uid={AdminUserID}&email=tmotloung@alliance.co.ls
```

**Note:** `uid` must be the actual UserID (INT) from your tblUser table.

## 🔧 Admin Tasks

### Create Rating Period

```sql
INSERT INTO tblRatingPeriod (PeriodName, StartDate, EndDate, IsActive, CreatedBy)
VALUES ('Q1 2025 Review', '2025-01-01', '2025-03-31', 1, 'tmotloung@alliance.co.ls');
```

### Manage Assignments

- Via Admin UI: `/admin/assignments`
- Or via API endpoints (see below)

## 📁 Project Structure

```
360-rating-app/
├── app/
│   ├── api/
│   │   ├── admin/              # Admin APIs
│   │   └── rater/              # Rater APIs
│   ├── admin/
│   │   ├── assignments/        # Assignment management
│   │   └── page.tsx           # Dashboard
│   ├── rater/                  # Rater portal
│   └── unauthorized/           # Error page
├── components/                 # UI components
├── lib/                        # Utilities
├── database/                   # SQL scripts
│   ├── 01-init-schema.sql     # Create tables
│   ├── 02-verify-users.sql    # Check existing users
│   └── 03-import-assignments.sql
└── MIGRATION_NOTES.md         # Integration details
```

## 🔒 Security Features

1. **Authentication Flow:**
   - Parent system passes uid (INT) + email via URL
   - Validates against: `SELECT * FROM tblUser WHERE UserID = @uid AND Username = @email`
   - Redirects to /unauthorized on failure

2. **SQL Injection Protection:**
   - All queries use parameterized inputs
   - UserID as `sql.Int`
   - Email as `sql.NVarChar`

3. **Authorization:**
   - Raters access only their assignments
   - Admin endpoints verify email = tmotloung@alliance.co.ls
   - Assignment ownership checked on submission

## 🐛 Troubleshooting

### "Unauthorized Access"
```sql
-- Verify user exists
SELECT UserID, Username FROM tblUser WHERE Username = 'user@alliance.co.ls';

-- Verify UserID matches
SELECT * FROM tblUser WHERE UserID = 123 AND Username = 'user@alliance.co.ls';
```

### "No assignments found"
```sql
-- Check active period
SELECT * FROM tblRatingPeriod WHERE IsActive = 1;

-- Check user's assignments
SELECT * FROM tblRatingAssignment 
WHERE RaterUserID = 123
  AND RatingPeriodID = (SELECT TOP 1 RatingPeriodID FROM tblRatingPeriod WHERE IsActive = 1);
```

### Foreign Key Errors
Make sure the user exists in tblUser before creating assignments.

## 📦 Production Deployment

1. Set environment variables securely
2. Enable HTTPS
3. Configure SQL Server for production
4. Set up connection pooling limits
5. Enable logging and monitoring
6. Regular database backups

## 📧 Support

**Admin Contact:** tmotloung@alliance.co.ls

## 📝 Important Notes

- ✅ Works with your existing tblUser table
- ✅ No user creation needed
- ✅ UserID is INT (not string)
- ✅ Username stores email addresses
- ✅ Verify users exist before importing assignments

See `MIGRATION_NOTES.md` for detailed integration information.

---

**Built with ❤️ for Alliance Insurance Company**
