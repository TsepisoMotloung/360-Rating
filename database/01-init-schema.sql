-- ================================================================
-- 360° Rating System Database Initialization
-- Compatible with existing Alliance Insurance database schema
-- ================================================================

PRINT '========================================';
PRINT 'Starting 360° Rating System Setup';
PRINT '========================================';
PRINT '';

-- 1. Create tblRatingPeriod
PRINT 'Creating tblRatingPeriod...';
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingPeriod')
BEGIN
    CREATE TABLE tblRatingPeriod (
        RatingPeriodID INT IDENTITY(1,1) PRIMARY KEY,
        PeriodName NVARCHAR(200) NOT NULL,
        StartDate DATE NOT NULL,
        EndDate DATE NOT NULL,
        IsActive BIT DEFAULT 1,
        CreatedBy NVARCHAR(100),
        DateCreated DATETIME DEFAULT GETDATE()
    );
    PRINT '✓ tblRatingPeriod created successfully';
END
ELSE
BEGIN
    PRINT '○ tblRatingPeriod already exists';
END
GO

-- 2. Create tblRatingCategory
PRINT 'Creating tblRatingCategory...';
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingCategory')
BEGIN
    CREATE TABLE tblRatingCategory (
        CategoryID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL,
        SortOrder INT NOT NULL
    );
    
    -- Insert default categories
    INSERT INTO tblRatingCategory (CategoryName, SortOrder) VALUES
    ('Customer', 1),
    ('Accountability', 2),
    ('Trust', 3),
    ('Care', 4),
    ('Innovation', 5);
    
    PRINT '✓ tblRatingCategory created and populated with 5 categories';
END
ELSE
BEGIN
    PRINT '○ tblRatingCategory already exists';
END
GO

-- 3. Create tblRatingAssignment
PRINT 'Creating tblRatingAssignment...';
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingAssignment')
BEGIN
    CREATE TABLE tblRatingAssignment (
        AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
        RatingPeriodID INT NOT NULL,
        RaterUserID INT NOT NULL,
        RaterEmail NVARCHAR(100) NOT NULL,
        RateeUserID INT NOT NULL,
        RateeEmail NVARCHAR(100) NOT NULL,
        IsCompleted BIT DEFAULT 0,
        DateCompleted DATETIME NULL,
        FOREIGN KEY (RatingPeriodID) REFERENCES tblRatingPeriod(RatingPeriodID),
        FOREIGN KEY (RaterUserID) REFERENCES tblUser(UserID),
        FOREIGN KEY (RateeUserID) REFERENCES tblUser(UserID)
    );
    
    -- Create indexes for performance
    CREATE INDEX IX_RatingAssignment_Rater ON tblRatingAssignment(RaterUserID, RatingPeriodID);
    CREATE INDEX IX_RatingAssignment_Ratee ON tblRatingAssignment(RateeUserID, RatingPeriodID);
    CREATE INDEX IX_RatingAssignment_Period ON tblRatingAssignment(RatingPeriodID);
    
    PRINT '✓ tblRatingAssignment created with indexes and foreign keys';
END
ELSE
BEGIN
    PRINT '○ tblRatingAssignment already exists';
END
GO

-- 4. Create tblRatingResponse
PRINT 'Creating tblRatingResponse...';
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingResponse')
BEGIN
    CREATE TABLE tblRatingResponse (
        ResponseID INT IDENTITY(1,1) PRIMARY KEY,
        AssignmentID INT NOT NULL,
        CategoryID INT NOT NULL,
        RatingValue INT NOT NULL CHECK (RatingValue BETWEEN 1 AND 5),
        Comment NVARCHAR(MAX),
        UpdatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (AssignmentID) REFERENCES tblRatingAssignment(AssignmentID),
        FOREIGN KEY (CategoryID) REFERENCES tblRatingCategory(CategoryID)
    );
    
    -- Create indexes for performance
    CREATE INDEX IX_RatingResponse_Assignment ON tblRatingResponse(AssignmentID);
    CREATE INDEX IX_RatingResponse_Category ON tblRatingResponse(CategoryID);
    
    PRINT '✓ tblRatingResponse created with indexes';
END
ELSE
BEGIN
    PRINT '○ tblRatingResponse already exists';
END
GO

-- 5. Create tblAdminReportsLog
PRINT 'Creating tblAdminReportsLog...';
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblAdminReportsLog')
BEGIN
    CREATE TABLE tblAdminReportsLog (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        AdminEmail NVARCHAR(100) NOT NULL,
        ReportType NVARCHAR(200),
        ExportDate DATETIME DEFAULT GETDATE()
    );
    
    PRINT '✓ tblAdminReportsLog created successfully';
END
ELSE
BEGIN
    PRINT '○ tblAdminReportsLog already exists';
END
GO

PRINT '';
PRINT '========================================';
PRINT 'Database Setup Complete!';
PRINT '========================================';
PRINT '';
PRINT 'Tables created:';
PRINT '  1. tblRatingPeriod';
PRINT '  2. tblRatingCategory (with 5 default categories)';
PRINT '  3. tblRatingAssignment (with FK to existing tblUser)';
PRINT '  4. tblRatingResponse';
PRINT '  5. tblAdminReportsLog';
PRINT '';
PRINT 'Foreign Keys established:';
PRINT '  - tblRatingAssignment.RaterUserID -> tblUser.UserID';
PRINT '  - tblRatingAssignment.RateeUserID -> tblUser.UserID';
PRINT '';
PRINT 'Next steps:';
PRINT '  1. Create a rating period (see admin dashboard or SQL)';
PRINT '  2. Import rating assignments';
PRINT '  3. Users can begin rating';
PRINT '';
