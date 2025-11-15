-- ========================================
-- 360° Rating System Database Schema
-- ========================================

-- 1. Create tblRatingPeriod
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
    PRINT 'tblRatingPeriod created successfully';
END
GO

-- 2. Create tblRatingCategory
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingCategory')
BEGIN
    CREATE TABLE tblRatingCategory (
        CategoryID INT IDENTITY(1,1) PRIMARY KEY,
        CategoryName NVARCHAR(100) NOT NULL,
        SortOrder INT NOT NULL
    );
    
    -- Insert default categories (from CSV: Accountability, Trust, Care, Innovation)
    INSERT INTO tblRatingCategory (CategoryName, SortOrder) VALUES
    ('Accountability', 1),
    ('Trust', 2),
    ('Care', 3),
    ('Innovation', 4);
    
    PRINT 'tblRatingCategory created and populated';
END
GO

-- 3. Create tblRatingAssignment (enhanced with position fields)
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingAssignment')
BEGIN
    CREATE TABLE tblRatingAssignment (
        AssignmentID INT IDENTITY(1,1) PRIMARY KEY,
        RatingPeriodID INT NOT NULL,
        RaterUserID NVARCHAR(100) NOT NULL,
        RaterEmail NVARCHAR(100) NOT NULL,
        RaterPosition NVARCHAR(200),
        RateeUserID NVARCHAR(100) NOT NULL,
        RateeEmail NVARCHAR(100) NOT NULL,
        RateeName NVARCHAR(200),
        RateePosition NVARCHAR(200),
        IsCompleted BIT DEFAULT 0,
        DateCompleted DATETIME NULL,
        CreatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (RatingPeriodID) REFERENCES tblRatingPeriod(RatingPeriodID)
    );
    
    CREATE INDEX IX_RatingAssignment_Rater ON tblRatingAssignment(RaterUserID, RatingPeriodID);
    CREATE INDEX IX_RatingAssignment_Ratee ON tblRatingAssignment(RateeUserID, RatingPeriodID);
    CREATE INDEX IX_RatingAssignment_Period ON tblRatingAssignment(RatingPeriodID);
    
    PRINT 'tblRatingAssignment created';
END
GO

-- 4. Create tblRatingResponse
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblRatingResponse')
BEGIN
    CREATE TABLE tblRatingResponse (
        ResponseID INT IDENTITY(1,1) PRIMARY KEY,
        AssignmentID INT NOT NULL,
        CategoryID INT NOT NULL,
        RatingValue INT NOT NULL CHECK (RatingValue BETWEEN 1 AND 5),
        Comment NVARCHAR(MAX),
        UpdatedDate DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (AssignmentID) REFERENCES tblRatingAssignment(AssignmentID) ON DELETE CASCADE,
        FOREIGN KEY (CategoryID) REFERENCES tblRatingCategory(CategoryID)
    );
    
    CREATE INDEX IX_RatingResponse_Assignment ON tblRatingResponse(AssignmentID);
    CREATE INDEX IX_RatingResponse_Category ON tblRatingResponse(CategoryID);
    
    PRINT 'tblRatingResponse created';
END
GO

-- 5. Create tblAdminReportsLog
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'tblAdminReportsLog')
BEGIN
    CREATE TABLE tblAdminReportsLog (
        LogID INT IDENTITY(1,1) PRIMARY KEY,
        AdminEmail NVARCHAR(100) NOT NULL,
        ReportType NVARCHAR(200),
        ExportDate DATETIME DEFAULT GETDATE()
    );
    
    PRINT 'tblAdminReportsLog created';
END
GO

PRINT '';
PRINT '========================================';
PRINT 'Database Setup Complete!';
PRINT '========================================';
