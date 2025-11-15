-- ================================================================
-- Verify Existing Users Script
-- Run this BEFORE importing assignments to check if users exist
-- ================================================================

PRINT '========================================';
PRINT 'Verifying Users in tblUser';
PRINT '========================================';
PRINT '';

-- Check if tblUser exists
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblUser')
BEGIN
    PRINT 'ERROR: tblUser does not exist!';
    PRINT 'Please ensure your existing database has tblUser table.';
    RETURN;
END

-- Check structure of tblUser
PRINT 'tblUser structure:';
SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'tblUser'
ORDER BY ORDINAL_POSITION;

PRINT '';
PRINT 'Sample users in tblUser:';
SELECT TOP 10 UserID, Username
FROM tblUser
WHERE Username LIKE '%@alliance.co.ls%'
ORDER BY UserID;

PRINT '';
PRINT 'Total users in tblUser: ' + CAST((SELECT COUNT(*) FROM tblUser) AS VARCHAR);

PRINT '';
PRINT 'Checking for users from CSV file...';
PRINT '';

-- Check if key users from the CSV exist
DECLARE @MissingUsers TABLE (Email NVARCHAR(100));

-- List of key emails from the CSV
DECLARE @KeyEmails TABLE (Email NVARCHAR(100));
INSERT INTO @KeyEmails VALUES
('mokoaram@alliance.co.ls'),
('pmalehi@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls'),
('lsetsabi@alliance.co.ls'),
('ltsephe@alliance.co.ls'),
('tlitaba@alliance.co.ls'),
('tmotloung@alliance.co.ls'),
('mmolai@alliance.co.ls'),
('rseshemane@alliance.co.ls'),
('rmofammere@alliance.co.ls');

-- Find missing users
INSERT INTO @MissingUsers
SELECT k.Email
FROM @KeyEmails k
LEFT JOIN tblUser u ON u.Username = k.Email
WHERE u.UserID IS NULL;

IF EXISTS (SELECT 1 FROM @MissingUsers)
BEGIN
    PRINT 'WARNING: The following key users are NOT in tblUser:';
    SELECT Email FROM @MissingUsers;
    PRINT '';
    PRINT 'You need to add these users to tblUser before importing assignments.';
END
ELSE
BEGIN
    PRINT '✓ All key users found in tblUser!';
    PRINT 'You can proceed with importing assignments.';
END

PRINT '';
PRINT '========================================';
PRINT 'Verification Complete';
PRINT '========================================';
