# Migration Notes - Using Existing tblUser

## Key Changes Made to Work with Your Existing Database

### 1. **UserID Type: INT (not NVARCHAR)**
   - Your existing `tblUser.UserID` is `INT`
   - Updated all foreign keys and queries to use `INT`
   - Updated all `sql.NVarChar` to `sql.Int` for UserID parameters

### 2. **Username = Email**
   - Your `tblUser.Username` column stores email addresses
   - Authentication validates against `Username` field
   - All queries use `Username` for email lookup

### 3. **Database Schema Updates**

**Updated Files:**
- `/lib/auth.ts` - Changed UserID to INT, validates against Username
- `/app/api/rater/assignments/route.ts` - INT UserID parameters
- `/app/api/rater/rating/route.ts` - INT UserID parameters
- `/app/api/rater/submit-all/route.ts` - INT UserID parameters
- `/app/api/admin/assignments/route.ts` - INT UserID parameters
- `/database/01-init-schema.sql` - Foreign keys to tblUser.UserID (INT)
- `/database/03-import-assignments.sql` - Uses existing tblUser

### 4. **Foreign Key Relationships**

```sql
-- tblRatingAssignment now has proper FKs
FOREIGN KEY (RaterUserID) REFERENCES tblUser(UserID)
FOREIGN KEY (RateeUserID) REFERENCES tblUser(UserID)
```

### 5. **Setup Steps**

**Step 1: Run Schema Creation**
```bash
sqlcmd -S server -d database -U user -P pass -i database/01-init-schema.sql
```

**Step 2: Verify Your Users**
```bash
sqlcmd -S server -d database -U user -P pass -i database/02-verify-users.sql
```

**Step 3: Import Assignments**
```bash
sqlcmd -S server -d database -U user -P pass -i database/03-import-assignments.sql
```

### 6. **Access URLs**

**For Any Employee:**
```
http://localhost:3000?uid=123&email=employee@alliance.co.ls
```
- `uid` = Actual UserID from tblUser (INT)
- `email` = Actual Username from tblUser

**For Admin:**
```
http://localhost:3000?uid=456&email=tmotloung@alliance.co.ls
```

### 7. **Testing**

Query your database to get test credentials:
```sql
-- Get some sample users
SELECT TOP 5 UserID, Username 
FROM tblUser 
WHERE Username LIKE '%@alliance.co.ls%'
ORDER BY UserID;

-- Example result:
-- UserID | Username
-- 123    | mokoaram@alliance.co.ls
-- 124    | pmalehi@alliance.co.ls
-- etc.
```

Then test with:
```
http://localhost:3000?uid=123&email=mokoaram@alliance.co.ls
```

### 8. **No User Creation Needed**

- ❌ **Removed:** `02-populate-users.sql` (not needed)
- ✅ **Uses:** Your existing tblUser table
- ✅ **Added:** `02-verify-users.sql` to check if users exist

### 9. **What Was NOT Changed**

These remain the same:
- UI components (React/Next.js)
- Rating logic (1-5 scale)
- Admin dashboard
- All other database tables
- Security/authentication flow

### 10. **Compatibility Check**

Run this query to verify compatibility:
```sql
-- Check tblUser structure
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    CHARACTER_MAXIMUM_LENGTH,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblUser'
ORDER BY ORDINAL_POSITION;
```

Expected key columns:
- `UserID` - int, NOT NULL (Primary Key)
- `Username` - nvarchar, stores email addresses

### 11. **Common Issues**

**Issue:** "User not found"
**Solution:** Verify email exists in tblUser.Username:
```sql
SELECT UserID, Username FROM tblUser WHERE Username = 'email@alliance.co.ls'
```

**Issue:** "Foreign key constraint violation"
**Solution:** Make sure the email exists in tblUser before creating assignment

**Issue:** "Invalid uid parameter"
**Solution:** uid must be a valid integer matching tblUser.UserID

---

## Summary

✅ All code updated to work with existing tblUser
✅ UserID type changed from NVARCHAR to INT throughout
✅ Username field used for email storage
✅ Foreign keys properly established
✅ No user creation needed - uses existing data
✅ Verification script added to check compatibility
