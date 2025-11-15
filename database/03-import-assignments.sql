-- ================================================================
-- Rating Assignments Import Script
-- Based on Employee_Rating_Guide_Managers.csv
-- Works with existing tblUser table (UserID is INT, Username is email)
-- ================================================================

PRINT '========================================';
PRINT 'Importing Rating Assignments';
PRINT '========================================';
PRINT '';

-- Check prerequisites
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingAssignment')
BEGIN
    PRINT 'ERROR: tblRatingAssignment does not exist. Run 01-init-schema.sql first.';
    RETURN;
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingPeriod')
BEGIN
    PRINT 'ERROR: tblRatingPeriod does not exist. Run 01-init-schema.sql first.';
    RETURN;
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblUser')
BEGIN
    PRINT 'ERROR: tblUser does not exist. This script requires existing tblUser table.';
    RETURN;
END

-- Check if there's an active period, if not create one
DECLARE @PeriodID INT;

SELECT @PeriodID = RatingPeriodID 
FROM tblRatingPeriod 
WHERE IsActive = 1;

IF @PeriodID IS NULL
BEGIN
    PRINT 'No active rating period found. Creating one...';
    
    INSERT INTO tblRatingPeriod (PeriodName, StartDate, EndDate, IsActive, CreatedBy)
    VALUES ('Q4 2024 - 360 Review', '2024-11-01', '2024-12-31', 1, 'system');
    
    SET @PeriodID = SCOPE_IDENTITY();
    PRINT 'Created rating period: Q4 2024 - 360 Review (ID: ' + CAST(@PeriodID AS VARCHAR) + ')';
END
ELSE
BEGIN
    PRINT 'Using existing active period (ID: ' + CAST(@PeriodID AS VARCHAR) + ')';
END

PRINT '';
PRINT 'Importing assignments from existing tblUser...';
PRINT '';

-- Temporary table to hold all assignments from CSV
CREATE TABLE #TempAssignments (
    RateeEmail NVARCHAR(100),
    RaterEmail NVARCHAR(100)
);

-- Insert all rater-ratee pairs from the CSV
-- NOTE: These emails must exist in your tblUser.Username column
INSERT INTO #TempAssignments (RateeEmail, RaterEmail) VALUES
-- Mochalo Mokoara ratings
('mokoaram@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'lsetsabi@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'npholo@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'mfoko@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'kpotiane@alliance.co.ls'),
('mokoaram@alliance.co.ls', 'tmotloung@alliance.co.ls'),

-- Kekeletso Moshoeshoe ratings
('kmoshoeshoe@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'tsempe@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'npholo@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'pmphuthing@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'mfoko@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'mmabaleha@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'mlioja@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'mthokoana@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'seselim@alliance.co.ls'),
('kmoshoeshoe@alliance.co.ls', 'lmokobocho@alliance.co.ls'),

-- Paballo Malehi ratings
('pmalehi@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'ryawe@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'rseshemane@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'mlelimo@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'rmojakisane@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'tmokati@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'pmphuthing@alliance.co.ls'),
('pmalehi@alliance.co.ls', 'rmofammere@alliance.co.ls'),

-- Likopo Tshepe ratings
('ltsephe@alliance.co.ls', 'pmphuthing@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'nmorie@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'tmakhabane@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'mnthache@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'rantekoan@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'mtaole@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'tliphafa@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'mmacheli@alliance.co.ls'),
('ltsephe@alliance.co.ls', 'pmohale@alliance.co.ls'),

-- Teboho Litaba ratings
('tlitaba@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'tsempe@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'nmorie@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'pmohale@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'mmosheshe@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'mribisone@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'lsetsabi@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'tmofolo@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'rseshemane@alliance.co.ls'),
('tlitaba@alliance.co.ls', 'mramokhele@alliance.co.ls'),

-- Matlali Molai ratings
('mmolai@alliance.co.ls', 'rmofammere@alliance.co.ls'),
('mmolai@alliance.co.ls', 'mlelimo@alliance.co.ls'),
('mmolai@alliance.co.ls', 'mribisone@alliance.co.ls'),
('mmolai@alliance.co.ls', 'tsempe@alliance.co.ls'),
('mmolai@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('mmolai@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('mmolai@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('mmolai@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('mmolai@alliance.co.ls', 'kmatsoso@alliance.co.ls'),

-- Relebohile Seshemane ratings
('rseshemane@alliance.co.ls', 'rpalime@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'mnthache@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'kmosae@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'mmabaleha@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'kphakisi@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'lsetsabi@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('rseshemane@alliance.co.ls', 'pmalehi@alliance.co.ls'),

-- Lehana Setsabi ratings
('lsetsabi@alliance.co.ls', 'mmolai@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'rseshemane@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'kmarakabei@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'rmofammere@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'mlelimo@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'rpalime@alliance.co.ls'),
('lsetsabi@alliance.co.ls', 'ltsephe@alliance.co.ls'),

-- Reitumetse Mofammere ratings
('rmofammere@alliance.co.ls', 'lsemanama@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'tsempe@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'mribisone@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'mmatela@alliance.co.ls'),
('rmofammere@alliance.co.ls', 'rmojakisane@alliance.co.ls'),

-- Palesa Mapuru ratings
('pmapuru@alliance.co.ls', 'smabote@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'lramose@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'smasupha@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'mribisone@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'tsempe@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'rmojakisane@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'kmakepe@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'kpotiane@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'rmofammere@alliance.co.ls'),
('pmapuru@alliance.co.ls', 'pmohale@alliance.co.ls'),

-- Palesa Mohale ratings
('pmohale@alliance.co.ls', 'pmohale@alliance.co.ls'),
('pmohale@alliance.co.ls', 'nmorie@alliance.co.ls'),
('pmohale@alliance.co.ls', 'mmafatle@alliance.co.ls'),
('pmohale@alliance.co.ls', 'tliphafa@alliance.co.ls'),
('pmohale@alliance.co.ls', 'mmacheli@alliance.co.ls'),
('pmohale@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('pmohale@alliance.co.ls', 'lmasithela@alliance.co.ls'),
('pmohale@alliance.co.ls', 'smabote@alliance.co.ls'),
('pmohale@alliance.co.ls', 'tmakhabane@alliance.co.ls'),
('pmohale@alliance.co.ls', 'tlitaba@alliance.co.ls'),

-- Rethabile Palime ratings
('rpalime@alliance.co.ls', 'rseshemane@alliance.co.ls'),
('rpalime@alliance.co.ls', 'rmolise@alliance.co.ls'),
('rpalime@alliance.co.ls', 'mramokhele@alliance.co.ls'),
('rpalime@alliance.co.ls', 'mnthache@alliance.co.ls'),
('rpalime@alliance.co.ls', 'kmosae@alliance.co.ls'),
('rpalime@alliance.co.ls', 'tmakhosane@alliance.co.ls'),
('rpalime@alliance.co.ls', 'kmarakabei@alliance.co.ls'),
('rpalime@alliance.co.ls', 'stseuoa@alliance.co.ls'),
('rpalime@alliance.co.ls', 'lmokobocho@alliance.co.ls'),

-- Theko Sempe ratings
('tsempe@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('tsempe@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('tsempe@alliance.co.ls', 'mribisone@alliance.co.ls'),
('tsempe@alliance.co.ls', 'mlioja@alliance.co.ls'),
('tsempe@alliance.co.ls', 'pmphuthing@alliance.co.ls'),
('tsempe@alliance.co.ls', 'rmofammere@alliance.co.ls'),
('tsempe@alliance.co.ls', 'rmojakisane@alliance.co.ls'),

-- Ketsia Marakabei ratings
('kmarakabei@alliance.co.ls', 'lpule@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'tmotabola@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'stseuoa@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'rchocholo@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'rantekoan@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'mnthache@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'rpalime@alliance.co.ls'),
('kmarakabei@alliance.co.ls', 'mtaole@alliance.co.ls'),

-- Katleho Mosae ratings
('kmosae@alliance.co.ls', 'rseshemane@alliance.co.ls'),
('kmosae@alliance.co.ls', 'mnthache@alliance.co.ls'),
('kmosae@alliance.co.ls', 'rpalime@alliance.co.ls'),
('kmosae@alliance.co.ls', 'msekhosana@alliance.co.ls'),

-- Makhozi Foko ratings
('mfoko@alliance.co.ls', 'mmabaleha@alliance.co.ls'),
('mfoko@alliance.co.ls', 'mokoaram@alliance.co.ls'),
('mfoko@alliance.co.ls', 'kphakisi@alliance.co.ls'),
('mfoko@alliance.co.ls', 'lmokobocho@alliance.co.ls'),
('mfoko@alliance.co.ls', 'mlioja@alliance.co.ls'),
('mfoko@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('mfoko@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('mfoko@alliance.co.ls', 'pmalehi@alliance.co.ls'),

-- Mamolupe Ribisone ratings
('mribisone@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('mribisone@alliance.co.ls', 'tsempe@alliance.co.ls'),
('mribisone@alliance.co.ls', 'prantjana@alliance.co.ls'),
('mribisone@alliance.co.ls', 'pmapuru@alliance.co.ls'),
('mribisone@alliance.co.ls', 'mlelimo@alliance.co.ls'),
('mribisone@alliance.co.ls', 'kmatsoso@alliance.co.ls'),
('mribisone@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('mribisone@alliance.co.ls', 'rmofammere@alliance.co.ls'),
('mribisone@alliance.co.ls', 'mmolai@alliance.co.ls'),
('mribisone@alliance.co.ls', 'mlioja@alliance.co.ls'),
('mribisone@alliance.co.ls', 'smabote@alliance.co.ls'),

-- Mita Ntache ratings
('mnthache@alliance.co.ls', 'rseshemane@alliance.co.ls'),
('mnthache@alliance.co.ls', 'mmokitimi@alliance.co.ls'),
('mnthache@alliance.co.ls', 'pmahamo@alliance.co.ls'),
('mnthache@alliance.co.ls', 'tmakhosane@alliance.co.ls'),
('mnthache@alliance.co.ls', 'rantekoan@alliance.co.ls'),
('mnthache@alliance.co.ls', 'ksehlabaka@alliance.co.ls'),
('mnthache@alliance.co.ls', 'tmakhabane@alliance.co.ls'),
('mnthache@alliance.co.ls', 'pmohale@alliance.co.ls'),
('mnthache@alliance.co.ls', 'nmorie@alliance.co.ls'),
('mnthache@alliance.co.ls', 'mtaole@alliance.co.ls'),

-- Pulane Mphuthing ratings
('pmphuthing@alliance.co.ls', 'pmohale@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'lmokobocho@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'mlioja@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'mlelimo@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'kmoshoeshoe@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'mfoko@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'rantekoan@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'nmorie@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'kphakisi@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'tmakhabane@alliance.co.ls'),
('pmphuthing@alliance.co.ls', 'tsempe@alliance.co.ls'),

-- Thato Makhabane ratings
('tmakhabane@alliance.co.ls', 'ltsephe@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'tliphafa@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'mmacheli@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'nmorie@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'lmasithela@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'pmohale@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'mmokitimi@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'mnthache@alliance.co.ls'),
('tmakhabane@alliance.co.ls', 'tmakhosane@alliance.co.ls'),

-- Maneo Lelimo ratings
('mlelimo@alliance.co.ls', 'mmolai@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'kmatsoso@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'rmokhatholane@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'mmaebo@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'pmalehi@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'mribisone@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'tlitaba@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'rmofammere@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'tsempe@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'rmojakisane@alliance.co.ls'),
('mlelimo@alliance.co.ls', 'tmotloung@alliance.co.ls');

-- Now insert into actual table with UserID lookup from existing tblUser
DECLARE @InsertCount INT = 0;
DECLARE @SkipCount INT = 0;
DECLARE @RateeEmail NVARCHAR(100);
DECLARE @RaterEmail NVARCHAR(100);
DECLARE @RateeUserID INT;  -- Changed to INT to match tblUser.UserID
DECLARE @RaterUserID INT;  -- Changed to INT to match tblUser.UserID

DECLARE assignment_cursor CURSOR FOR 
SELECT DISTINCT RateeEmail, RaterEmail FROM #TempAssignments;

OPEN assignment_cursor;
FETCH NEXT FROM assignment_cursor INTO @RateeEmail, @RaterEmail;

WHILE @@FETCH_STATUS = 0
BEGIN
    -- Get UserIDs from existing tblUser (UserID is INT, Username is email)
    SELECT @RateeUserID = UserID FROM tblUser WHERE Username = @RateeEmail;
    SELECT @RaterUserID = UserID FROM tblUser WHERE Username = @RaterEmail;
    
    IF @RateeUserID IS NOT NULL AND @RaterUserID IS NOT NULL
    BEGIN
        -- Check if assignment already exists
        IF NOT EXISTS (
            SELECT 1 FROM tblRatingAssignment 
            WHERE RatingPeriodID = @PeriodID 
              AND RaterUserID = @RaterUserID 
              AND RateeUserID = @RateeUserID
        )
        BEGIN
            INSERT INTO tblRatingAssignment 
            (RatingPeriodID, RaterUserID, RaterEmail, RateeUserID, RateeEmail, IsCompleted, DateCompleted)
            VALUES 
            (@PeriodID, @RaterUserID, @RaterEmail, @RateeUserID, @RateeEmail, 0, NULL);
            
            SET @InsertCount = @InsertCount + 1;
        END
        ELSE
        BEGIN
            SET @SkipCount = @SkipCount + 1;
        END
    END
    ELSE
    BEGIN
        PRINT 'Warning: Could not find user for ' + @RaterEmail + ' -> ' + @RateeEmail;
    END
    
    FETCH NEXT FROM assignment_cursor INTO @RateeEmail, @RaterEmail;
END

CLOSE assignment_cursor;
DEALLOCATE assignment_cursor;

DROP TABLE #TempAssignments;

PRINT '';
PRINT '========================================';
PRINT 'Assignment Import Complete!';
PRINT '========================================';
PRINT '';
PRINT 'Assignments inserted: ' + CAST(@InsertCount AS VARCHAR);
PRINT 'Assignments skipped (duplicates): ' + CAST(@SkipCount AS VARCHAR);
PRINT '';
