-- CreateTable
CREATE TABLE `wpos_teams` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_24` (
    `ustazid` VARCHAR(255) NOT NULL,
    `ustazname` VARCHAR(120) NULL,
    `phone` VARCHAR(32) NULL,
    `schedule` TEXT NULL,
    `password` VARCHAR(255) NOT NULL,
    `controlId` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ustazid`(`ustazid`),
    INDEX `wpos_wpdatatable_24_controlId_fkey`(`controlId`),
    PRIMARY KEY (`ustazid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_23` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `phoneno` VARCHAR(32) NULL,
    `classfee` FLOAT NULL,
    `startdate` DATETIME(0) NULL,
    `status` VARCHAR(255) NULL,
    `ustaz` VARCHAR(255) NULL,
    `package` VARCHAR(255) NULL,
    `subject` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `rigistral` VARCHAR(255) NULL,
    `daypackages` VARCHAR(255) NULL,
    `refer` VARCHAR(255) NULL,
    `registrationdate` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `selectedTime` VARCHAR(255) NULL,
    `isTrained` BOOLEAN NULL DEFAULT false,
    `chat_id` VARCHAR(64) NULL,
    `progress` VARCHAR(64) NULL,
    `u_control` VARCHAR(255) NULL,

    INDEX `idx_ustaz`(`ustaz`),
    INDEX `wpos_wpdatatable_23_u_control_fkey`(`u_control`),
    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_28` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `password` VARCHAR(255) NOT NULL,
    `code` VARCHAR(32) NULL,

    UNIQUE INDEX `wpos_wpdatatable_28_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_28_username_key`(`username`),
    UNIQUE INDEX `wpos_wpdatatable_28_code_key`(`code`),
    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_ustaz_occupied_times` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ustaz_id` VARCHAR(255) NOT NULL,
    `time_slot` VARCHAR(255) NOT NULL,
    `daypackage` VARCHAR(255) NOT NULL,
    `student_id` INTEGER NOT NULL,
    `occupied_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `wpos_ustaz_occupied_times_ustaz_id_time_slot_daypackage_key`(`ustaz_id`, `time_slot`, `daypackage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_33` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NULL,
    `username` VARCHAR(120) NULL,
    `password` VARCHAR(120) NULL,

    UNIQUE INDEX `wpos_wpdatatable_33_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_33_username_key`(`username`),
    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `username` VARCHAR(120) NULL,
    `passcode` VARCHAR(120) NOT NULL,
    `phoneno` VARCHAR(32) NULL,
    `role` VARCHAR(20) NULL DEFAULT 'admin',

    UNIQUE INDEX `admin_name_key`(`name`),
    UNIQUE INDEX `admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `months_table` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER NOT NULL,
    `month` CHAR(7) NULL,
    `paid_amount` INTEGER NOT NULL,
    `payment_status` VARCHAR(50) NOT NULL,
    `end_date` DATETIME(0) NULL,
    `payment_type` VARCHAR(20) NULL DEFAULT 'full',
    `start_date` DATETIME(0) NULL,
    `free_month_reason` VARCHAR(100) NULL,
    `is_free_month` BOOLEAN NULL DEFAULT false,

    INDEX `months_table_studentid_idx`(`studentid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_attendance_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `attendance_status` VARCHAR(255) NOT NULL,
    `surah` VARCHAR(255) NULL,
    `pages_read` INTEGER NULL,
    `level` VARCHAR(255) NULL,
    `lesson` VARCHAR(255) NULL,
    `notes` TEXT NULL,

    INDEX `idx_student_attendance_progress`(`student_id`),
    INDEX `idx_date`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_zoom_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER NOT NULL,
    `ustazid` VARCHAR(255) NULL,
    `link` VARCHAR(255) NOT NULL,
    `tracking_token` VARCHAR(32) NOT NULL,
    `clicked_at` DATETIME(0) NULL,
    `sent_time` DATETIME(0) NULL,
    `report` INTEGER NULL DEFAULT 0,
    `expiration_date` DATETIME(0) NULL,

    INDEX `idx_studentid`(`studentid`),
    INDEX `idx_ustazid`(`ustazid`),
    INDEX `idx_sent_time`(`sent_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passingResult` INTEGER NOT NULL,
    `lastSubject` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `test_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `absenceRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `permitted` BOOLEAN NOT NULL,
    `permissionRequestId` INTEGER NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `reviewedByManager` BOOLEAN NOT NULL,
    `reviewNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `AbsenceRecord_admin_fkey`(`adminId`),
    INDEX `AbsenceRecord_permissionRequestId_fkey`(`permissionRequestId`),
    INDEX `AbsenceRecord_teacherId_fkey`(`teacherId`),
    INDEX `AbsenceRecord_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendanceSubmissionLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL,
    `isLate` BOOLEAN NOT NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `AttendanceSubmissionLog_admin_fkey`(`adminId`),
    INDEX `AttendanceSubmissionLog_teacherId_fkey`(`teacherId`),
    INDEX `AttendanceSubmissionLog_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actionType` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `targetId` INTEGER NULL,
    `details` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `AuditLog_admin_fkey`(`adminId`),
    INDEX `AuditLog_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bonusRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `BonusRecord_admin_fkey`(`adminId`),
    INDEX `BonusRecord_teacherId_fkey`(`teacherId`),
    INDEX `BonusRecord_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `controllerEarning` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `controllerUsername` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `paymentId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidOut` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `controllerearningsconfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mainBaseRate` DOUBLE NOT NULL DEFAULT 40,
    `referralBaseRate` DOUBLE NOT NULL DEFAULT 40,
    `leavePenaltyMultiplier` DOUBLE NOT NULL DEFAULT 3,
    `leaveThreshold` INTEGER NOT NULL DEFAULT 5,
    `unpaidPenaltyMultiplier` DOUBLE NOT NULL DEFAULT 2,
    `referralBonusMultiplier` DOUBLE NOT NULL DEFAULT 4,
    `targetEarnings` DOUBLE NOT NULL DEFAULT 3000,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `ControllerEarningsConfig_admin_fkey`(`adminId`),
    INDEX `ControllerEarningsConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deductionBonusConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configType` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `effectiveMonths` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `DeductionBonusConfig_admin_fkey`(`adminId`),
    INDEX `DeductionBonusConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `latenessDeductionConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `excusedThreshold` INTEGER NOT NULL,
    `tier` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `deductionPercent` DOUBLE NOT NULL,
    `isGlobal` BOOLEAN NOT NULL DEFAULT true,
    `teacherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `LatenessDeductionConfig_admin_fkey`(`adminId`),
    INDEX `LatenessDeductionConfig_teacherId_fkey`(`teacherId`),
    INDEX `LatenessDeductionConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `latenessRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `scheduledTime` DATETIME(3) NOT NULL,
    `actualStartTime` DATETIME(3) NOT NULL,
    `latenessMinutes` INTEGER NOT NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `deductionTier` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `LatenessRecord_admin_fkey`(`adminId`),
    INDEX `LatenessRecord_teacherId_fkey`(`teacherId`),
    INDEX `LatenessRecord_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `userId` VARCHAR(255) NOT NULL,
    `userRole` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sendername` VARCHAR(120) NOT NULL,
    `studentid` INTEGER NOT NULL,
    `studentname` VARCHAR(255) NOT NULL,
    `paymentdate` DATETIME(0) NOT NULL,
    `transactionid` VARCHAR(191) NOT NULL,
    `paidamount` DECIMAL(12, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',

    UNIQUE INDEX `Payment_transactionid_key`(`transactionid`),
    INDEX `Payment_paymentdate_idx`(`paymentdate`),
    INDEX `Payment_sendername_idx`(`sendername`),
    INDEX `Payment_studentid_idx`(`studentid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissionReason` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermissionRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `requestedDates` VARCHAR(191) NOT NULL,
    `reasonCategory` VARCHAR(191) NOT NULL,
    `reasonDetails` VARCHAR(191) NOT NULL,
    `supportingDocs` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` VARCHAR(191) NULL,
    `lateReviewReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `PermissionRequest_admin_fkey`(`adminId`),
    INDEX `PermissionRequest_teacherId_fkey`(`teacherId`),
    INDEX `PermissionRequest_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityAssessment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `weekStart` DATETIME(3) NOT NULL,
    `supervisorFeedback` TEXT NOT NULL,
    `examinerRating` DOUBLE NULL,
    `studentPassRate` DOUBLE NULL,
    `overallQuality` VARCHAR(191) NOT NULL,
    `managerApproved` BOOLEAN NOT NULL,
    `managerOverride` BOOLEAN NOT NULL,
    `overrideNotes` VARCHAR(191) NULL,
    `bonusAwarded` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `QualityAssessment_admin_fkey`(`adminId`),
    INDEX `QualityAssessment_teacherId_fkey`(`teacherId`),
    INDEX `QualityAssessment_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `qualityDescription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `QualityDescription_admin_fkey`(`adminId`),
    INDEX `QualityDescription_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacherSalaryPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(255) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `adminId` VARCHAR(191) NULL,
    `totalSalary` DOUBLE NOT NULL,
    `latenessDeduction` DOUBLE NOT NULL,
    `absenceDeduction` DOUBLE NOT NULL,
    `bonuses` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `TeacherSalaryPayment_admin_fkey`(`adminId`),
    INDEX `TeacherSalaryPayment_teacherId_period_idx`(`teacherId`, `period`),
    INDEX `TeacherSalaryPayment_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    UNIQUE INDEX `TeacherSalaryPayment_teacherId_period_key`(`teacherId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testappointment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NULL,

    INDEX `testAppointment_testId_fkey`(`testId`),
    UNIQUE INDEX `testAppointment_studentId_testId_key`(`studentId`, `testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testquestion` (
    `id` VARCHAR(191) NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `odd` INTEGER NOT NULL,

    INDEX `testQuestion_testId_fkey`(`testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testresult` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `result` INTEGER NOT NULL,

    INDEX `testResult_questionId_idx`(`questionId`),
    INDEX `testResult_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_controlId_fkey` FOREIGN KEY (`controlId`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_u_control_fkey` FOREIGN KEY (`u_control`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_ustaz_fkey` FOREIGN KEY (`ustaz`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_ustaz_id_fkey` FOREIGN KEY (`ustaz_id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `months_table` ADD CONSTRAINT `month_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance_progress` ADD CONSTRAINT `student_attendance_progress_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_ustazid_fkey` FOREIGN KEY (`ustazid`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absenceRecord` ADD CONSTRAINT `AbsenceRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absenceRecord` ADD CONSTRAINT `AbsenceRecord_permissionRequestId_fkey` FOREIGN KEY (`permissionRequestId`) REFERENCES `PermissionRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absenceRecord` ADD CONSTRAINT `AbsenceRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absenceRecord` ADD CONSTRAINT `AbsenceRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditLog` ADD CONSTRAINT `AuditLog_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auditLog` ADD CONSTRAINT `AuditLog_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonusRecord` ADD CONSTRAINT `BonusRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonusRecord` ADD CONSTRAINT `BonusRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonusRecord` ADD CONSTRAINT `BonusRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `controllerearningsconfig` ADD CONSTRAINT `ControllerEarningsConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `controllerearningsconfig` ADD CONSTRAINT `ControllerEarningsConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deductionBonusConfig` ADD CONSTRAINT `DeductionBonusConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deductionBonusConfig` ADD CONSTRAINT `DeductionBonusConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `latenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `latenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `latenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `latenessRecord` ADD CONSTRAINT `LatenessRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `latenessRecord` ADD CONSTRAINT `LatenessRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `latenessRecord` ADD CONSTRAINT `LatenessRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_sendername_fkey` FOREIGN KEY (`sendername`) REFERENCES `wpos_wpdatatable_28`(`username`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionRequest` ADD CONSTRAINT `PermissionRequest_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionRequest` ADD CONSTRAINT `PermissionRequest_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionRequest` ADD CONSTRAINT `PermissionRequest_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityAssessment` ADD CONSTRAINT `QualityAssessment_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityAssessment` ADD CONSTRAINT `QualityAssessment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityAssessment` ADD CONSTRAINT `QualityAssessment_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualityDescription` ADD CONSTRAINT `QualityDescription_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `qualityDescription` ADD CONSTRAINT `QualityDescription_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testappointment` ADD CONSTRAINT `testAppointment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testappointment` ADD CONSTRAINT `testAppointment_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testquestion` ADD CONSTRAINT `testQuestion_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testresult` ADD CONSTRAINT `testResult_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `testquestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testresult` ADD CONSTRAINT `testResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;
