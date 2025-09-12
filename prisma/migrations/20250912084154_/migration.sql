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
    `schedule` VARCHAR(255) NULL,
    `password` VARCHAR(255) NOT NULL,
    `control` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ustazid`(`ustazid`),
    INDEX `wpos_wpdatatable_24_control_fkey`(`control`),
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
    `isTrained` BOOLEAN NULL DEFAULT false,
    `chat_id` VARCHAR(64) NULL,
    `progress` VARCHAR(64) NULL,
    `u_control` VARCHAR(255) NULL,
    `exitdate` DATETIME(0) NULL,
    `isKid` BOOLEAN NULL DEFAULT false,
    `reason` VARCHAR(255) NULL,
    `userId` VARCHAR(191) NULL,

    UNIQUE INDEX `wpos_wpdatatable_23_userId_key`(`userId`),
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
    `code` VARCHAR(255) NULL,

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
    `chat_id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_name_key`(`name`),
    UNIQUE INDEX `admin_username_key`(`username`),
    UNIQUE INDEX `admin_chat_id_key`(`chat_id`),
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
CREATE TABLE `AbsenceRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `timeSlots` VARCHAR(191) NULL,
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
CREATE TABLE `AttendanceSubmissionLog` (
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
CREATE TABLE `AuditLog` (
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
CREATE TABLE `BonusRecord` (
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
CREATE TABLE `ControllerEarningsConfig` (
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
CREATE TABLE `DeductionBonusConfig` (
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
CREATE TABLE `LatenessDeductionConfig` (
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
    `baseDeductionAmount` DECIMAL(65, 30) NOT NULL DEFAULT 30.00,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `LatenessDeductionConfig_admin_fkey`(`adminId`),
    INDEX `LatenessDeductionConfig_teacherId_fkey`(`teacherId`),
    INDEX `LatenessDeductionConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LatenessRecord` (
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
CREATE TABLE `Notification` (
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
CREATE TABLE `wpos_wpdatatable_29` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER NOT NULL,
    `studentname` VARCHAR(255) NOT NULL,
    `paymentdate` DATETIME(0) NOT NULL,
    `transactionid` VARCHAR(255) NOT NULL,
    `paidamount` DECIMAL(10, 0) NOT NULL,
    `reason` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermissionReason` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermissionRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `requestedDate` VARCHAR(191) NOT NULL,
    `timeSlots` VARCHAR(191) NOT NULL,
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
CREATE TABLE `QualityDescription` (
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
CREATE TABLE `registralearningsconfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `registralearningsconfig_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeacherSalaryPayment` (
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
CREATE TABLE `testAppointment` (
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
CREATE TABLE `testResult` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `result` INTEGER NOT NULL,

    INDEX `testResult_questionId_idx`(`questionId`),
    INDEX `testResult_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coursePackage` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `description` TEXT NULL,
    `examDurationMinutes` INTEGER NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `ustazId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjectPackage` (
    `id` VARCHAR(191) NOT NULL,
    `kidpackage` BOOLEAN NULL DEFAULT false,
    `packageType` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course` (
    `id` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `imageUrl` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `timeLimit` INTEGER NULL,
    `timeUnit` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `course_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapter` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `videoUrl` TEXT NULL,
    `position` INTEGER NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `courseId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chapter_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NULL,
    `question` TEXT NOT NULL,

    INDEX `question_chapterId_idx`(`chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questionOption` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `option` VARCHAR(191) NOT NULL,

    INDEX `questionOption_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questionAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `answerId` VARCHAR(191) NOT NULL,

    INDEX `questionAnswer_answerId_idx`(`answerId`),
    INDEX `questionAnswer_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentQuiz` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `isFinalExam` BOOLEAN NOT NULL DEFAULT false,
    `takenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `studentQuiz_questionId_idx`(`questionId`),
    INDEX `studentQuiz_studentId_idx`(`studentId`),
    UNIQUE INDEX `studentQuiz_studentId_questionId_key`(`studentId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentQuizAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `studentQuizId` VARCHAR(191) NOT NULL,
    `selectedOptionId` VARCHAR(191) NOT NULL,

    INDEX `studentQuizAnswer_selectedOptionId_idx`(`selectedOptionId`),
    INDEX `studentQuizAnswer_studentQuizId_idx`(`studentQuizId`),
    UNIQUE INDEX `studentQuizAnswer_studentQuizId_selectedOptionId_key`(`studentQuizId`, `selectedOptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentProgress` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `isStarted` BOOLEAN NOT NULL DEFAULT true,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `studentProgress_chapterId_idx`(`chapterId`),
    INDEX `studentProgress_studentId_idx`(`studentId`),
    UNIQUE INDEX `studentProgress_studentId_chapterId_key`(`studentId`, `chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finalExamResult` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `updationProhibited` BOOLEAN NOT NULL DEFAULT false,
    `startingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endingTime` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarbiaAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `studId` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageSalary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageName` VARCHAR(191) NOT NULL,
    `salaryPerStudent` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PackageSalary_packageName_key`(`packageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentStatus_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentPackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentPackage_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentSubject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentSubject_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageDeduction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageName` VARCHAR(191) NOT NULL,
    `latenessBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    `absenceBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PackageDeduction_packageName_key`(`packageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user` (
    `id` VARCHAR(191) NOT NULL,
    `role` ENUM('manager', 'teacher', 'student') NOT NULL,
    `firstName` VARCHAR(191) NOT NULL DEFAULT '',
    `lastName` VARCHAR(191) NOT NULL DEFAULT '',
    `phoneNumber` VARCHAR(191) NOT NULL DEFAULT '',
    `username` VARCHAR(191) NOT NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `user_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_control_fkey` FOREIGN KEY (`control`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_u_control_fkey` FOREIGN KEY (`u_control`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_ustaz_fkey` FOREIGN KEY (`ustaz`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_permissionRequestId_fkey` FOREIGN KEY (`permissionRequestId`) REFERENCES `PermissionRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusRecord` ADD CONSTRAINT `BonusRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusRecord` ADD CONSTRAINT `BonusRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusRecord` ADD CONSTRAINT `BonusRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ControllerEarningsConfig` ADD CONSTRAINT `ControllerEarningsConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ControllerEarningsConfig` ADD CONSTRAINT `ControllerEarningsConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeductionBonusConfig` ADD CONSTRAINT `DeductionBonusConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeductionBonusConfig` ADD CONSTRAINT `DeductionBonusConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessRecord` ADD CONSTRAINT `LatenessRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessRecord` ADD CONSTRAINT `LatenessRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessRecord` ADD CONSTRAINT `LatenessRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_29` ADD CONSTRAINT `Payment_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE `QualityDescription` ADD CONSTRAINT `QualityDescription_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityDescription` ADD CONSTRAINT `QualityDescription_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testAppointment` ADD CONSTRAINT `testAppointment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testAppointment` ADD CONSTRAINT `testAppointment_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testquestion` ADD CONSTRAINT `testQuestion_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testResult` ADD CONSTRAINT `testResult_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `testquestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testResult` ADD CONSTRAINT `testResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coursePackage` ADD CONSTRAINT `coursePackage_id_fkey` FOREIGN KEY (`id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subjectPackage` ADD CONSTRAINT `subjectPackage_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course` ADD CONSTRAINT `course_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter` ADD CONSTRAINT `chapter_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question` ADD CONSTRAINT `question_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question` ADD CONSTRAINT `question_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questionOption` ADD CONSTRAINT `questionOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questionAnswer` ADD CONSTRAINT `questionAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questionAnswer` ADD CONSTRAINT `questionAnswer_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `questionOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuiz` ADD CONSTRAINT `studentQuiz_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuiz` ADD CONSTRAINT `studentQuiz_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuizAnswer` ADD CONSTRAINT `studentQuizAnswer_studentQuizId_fkey` FOREIGN KEY (`studentQuizId`) REFERENCES `studentQuiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuizAnswer` ADD CONSTRAINT `studentQuizAnswer_selectedOptionId_fkey` FOREIGN KEY (`selectedOptionId`) REFERENCES `questionOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentProgress` ADD CONSTRAINT `studentProgress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentProgress` ADD CONSTRAINT `studentProgress_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finalExamResult` ADD CONSTRAINT `finalExamResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finalExamResult` ADD CONSTRAINT `finalExamResult_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarbiaAttendance` ADD CONSTRAINT `tarbiaAttendance_studId_fkey` FOREIGN KEY (`studId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarbiaAttendance` ADD CONSTRAINT `tarbiaAttendance_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
