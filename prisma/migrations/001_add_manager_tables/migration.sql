-- CreateTable tblManager
CREATE TABLE `tblManager` (
    `ManagerID` INTEGER NOT NULL AUTO_INCREMENT,
    `Email` VARCHAR(100) NOT NULL,
    `FirstName` VARCHAR(100) NULL,
    `LastName` VARCHAR(100) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedBy` VARCHAR(100) NULL,
    `DateCreated` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `tblManager_Email_key`(`Email`),
    INDEX `idx_manager_email`(`Email`),
    INDEX `idx_manager_active`(`IsActive`),
    PRIMARY KEY (`ManagerID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable tblManagerAssignment
CREATE TABLE `tblManagerAssignment` (
    `ManagerAssignmentID` INTEGER NOT NULL AUTO_INCREMENT,
    `ManagerID` INTEGER NOT NULL,
    `RatingPeriodID` INTEGER NOT NULL,
    `RaterUserID` INTEGER NOT NULL,
    `RaterEmail` VARCHAR(100) NOT NULL,
    `RateeUserID` INTEGER NOT NULL,
    `RateeEmail` VARCHAR(100) NOT NULL,
    `RateePosition` VARCHAR(100) NULL,
    `RaterPosition` VARCHAR(100) NULL,
    `IsCompleted` BOOLEAN NOT NULL DEFAULT false,
    `DateCompleted` DATETIME(0) NULL,
    `CreatedDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `RelationshipType` INTEGER NULL,

    UNIQUE INDEX `unique_manager_assignment`(`ManagerID`, `RatingPeriodID`, `RaterUserID`, `RateeUserID`),
    INDEX `idx_manager_id`(`ManagerID`),
    INDEX `idx_manager_rater_period`(`RaterUserID`, `RatingPeriodID`),
    INDEX `idx_manager_ratee_period`(`RateeUserID`, `RatingPeriodID`),
    INDEX `idx_manager_period`(`RatingPeriodID`),
    PRIMARY KEY (`ManagerAssignmentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable tblManagerResponse
CREATE TABLE `tblManagerResponse` (
    `ManagerResponseID` INTEGER NOT NULL AUTO_INCREMENT,
    `ManagerAssignmentID` INTEGER NOT NULL,
    `CategoryID` INTEGER NOT NULL,
    `RatingValue` INTEGER NOT NULL,
    `Comment` TEXT NULL,
    `UpdatedDate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_manager_assignment`(`ManagerAssignmentID`),
    INDEX `idx_manager_category`(`CategoryID`),
    PRIMARY KEY (`ManagerResponseID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `tblManagerAssignment` ADD CONSTRAINT `tblManagerAssignment_ManagerID_fkey` FOREIGN KEY (`ManagerID`) REFERENCES `tblManager`(`ManagerID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tblManagerAssignment` ADD CONSTRAINT `tblManagerAssignment_RatingPeriodID_fkey` FOREIGN KEY (`RatingPeriodID`) REFERENCES `tblRatingPeriod`(`RatingPeriodID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tblManagerAssignment` ADD CONSTRAINT `tblManagerAssignment_RaterUserID_fkey` FOREIGN KEY (`RaterUserID`) REFERENCES `tblUser`(`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tblManagerAssignment` ADD CONSTRAINT `tblManagerAssignment_RateeUserID_fkey` FOREIGN KEY (`RateeUserID`) REFERENCES `tblUser`(`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tblManagerResponse` ADD CONSTRAINT `tblManagerResponse_ManagerAssignmentID_fkey` FOREIGN KEY (`ManagerAssignmentID`) REFERENCES `tblManagerAssignment`(`ManagerAssignmentID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tblManagerResponse` ADD CONSTRAINT `tblManagerResponse_CategoryID_fkey` FOREIGN KEY (`CategoryID`) REFERENCES `tblRatingCategory`(`CategoryID`) ON DELETE CASCADE ON UPDATE CASCADE;
