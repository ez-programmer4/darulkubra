-- CreateTable
CREATE TABLE `wpos_wpdatatable_24` (
    `id` VARCHAR(191) NOT NULL,
    `ustazid` VARCHAR(255) NOT NULL,
    `name` VARCHAR(120) NULL,
    `phone` VARCHAR(32) NULL,
    `schedule` VARCHAR(255) NULL,
    `password` VARCHAR(255) NOT NULL,
    `controllerId` VARCHAR(255) NULL,
    `createdAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `wpos_wpdatatable_24_ustazid_key`(`ustazid`),
    INDEX `wpos_wpdatatable_24_ustazid_idx`(`ustazid`),
    INDEX `wpos_wpdatatable_24_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_23` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `phone` VARCHAR(32) NULL,
    `classFee` FLOAT NULL,
    `startDate` DATETIME(0) NULL,
    `status` VARCHAR(255) NULL,
    `teacherId` VARCHAR(255) NULL,
    `package` VARCHAR(255) NULL,
    `subject` VARCHAR(255) NULL,
    `country` VARCHAR(255) NULL,
    `registrationNumber` VARCHAR(255) NULL,
    `dayPackages` VARCHAR(255) NULL,
    `referrer` VARCHAR(255) NULL,
    `registrationDate` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `isTrained` BOOLEAN NULL DEFAULT false,
    `chat_id` VARCHAR(64) NULL,
    `progress` VARCHAR(64) NULL,
    `controllerId` VARCHAR(255) NULL,
    `exitDate` DATETIME(0) NULL,
    `isKid` BOOLEAN NULL DEFAULT false,
    `reason` VARCHAR(255) NULL,
    `userId` VARCHAR(191) NULL,
    `youtubeSubject` VARCHAR(191) NULL,

    UNIQUE INDEX `wpos_wpdatatable_23_userId_key`(`userId`),
    INDEX `wpos_wpdatatable_23_teacherId_idx`(`teacherId`),
    INDEX `wpos_wpdatatable_23_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_28` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `password` VARCHAR(255) NOT NULL,
    `code` VARCHAR(255) NULL,

    UNIQUE INDEX `wpos_wpdatatable_28_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_28_username_key`(`username`),
    UNIQUE INDEX `wpos_wpdatatable_28_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `username` VARCHAR(120) NULL,
    `passcode` VARCHAR(120) NOT NULL,
    `phone` VARCHAR(32) NULL,
    `role` VARCHAR(20) NULL DEFAULT 'admin',
    `chatId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `admin_name_key`(`name`),
    UNIQUE INDEX `admin_username_key`(`username`),
    UNIQUE INDEX `admin_chatId_key`(`chatId`),
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

-- CreateTable
CREATE TABLE `course_packages` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `description` TEXT NULL,
    `examDurationMinutes` INTEGER NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `teacherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subject_packages` (
    `id` VARCHAR(191) NOT NULL,
    `kidPackage` BOOLEAN NULL DEFAULT false,
    `packageType` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `courses` (
    `id` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `imageUrl` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL,
    `timeLimit` INTEGER NULL,
    `timeUnit` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `courses_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapters` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `videoUrl` TEXT NULL,
    `position` INTEGER NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `courseId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chapters_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questions` (
    `id` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `chapterId` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `questions_chapterId_idx`(`chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_options` (
    `id` VARCHAR(191) NOT NULL,
    `option` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `question_options_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question_answers` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `answerId` VARCHAR(191) NOT NULL,

    INDEX `question_answers_questionId_idx`(`questionId`),
    INDEX `question_answers_answerId_idx`(`answerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_progress` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `isStarted` BOOLEAN NOT NULL DEFAULT true,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `student_progress_chapterId_idx`(`chapterId`),
    INDEX `student_progress_studentId_idx`(`studentId`),
    UNIQUE INDEX `student_progress_studentId_chapterId_key`(`studentId`, `chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_quizzes` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `isFinalExam` BOOLEAN NOT NULL DEFAULT false,
    `takenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `student_quizzes_questionId_idx`(`questionId`),
    INDEX `student_quizzes_studentId_idx`(`studentId`),
    UNIQUE INDEX `student_quizzes_studentId_questionId_key`(`studentId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_quiz_answers` (
    `id` VARCHAR(191) NOT NULL,
    `studentQuizId` VARCHAR(191) NOT NULL,
    `selectedOptionId` VARCHAR(191) NOT NULL,

    INDEX `student_quiz_answers_selectedOptionId_idx`(`selectedOptionId`),
    INDEX `student_quiz_answers_studentQuizId_idx`(`studentQuizId`),
    UNIQUE INDEX `student_quiz_answers_studentQuizId_selectedOptionId_key`(`studentQuizId`, `selectedOptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `final_exam_results` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `updationProhibited` BOOLEAN NOT NULL DEFAULT false,
    `startingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endingTime` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarbia_attendance` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_salary_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(255) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `totalSalary` DOUBLE NOT NULL,
    `latenessDeduction` DOUBLE NOT NULL,
    `absenceDeduction` DOUBLE NOT NULL,
    `bonuses` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `controllerId` INTEGER NULL,

    INDEX `teacher_salary_payments_teacherId_period_idx`(`teacherId`, `period`),
    INDEX `teacher_salary_payments_adminId_idx`(`adminId`),
    INDEX `teacher_salary_payments_controllerId_idx`(`controllerId`),
    UNIQUE INDEX `teacher_salary_payments_teacherId_period_key`(`teacherId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_salaries` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageName` VARCHAR(191) NOT NULL,
    `salaryPerStudent` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `package_salaries_packageName_key`(`packageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `package_deductions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageName` VARCHAR(191) NOT NULL,
    `latenessBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    `absenceBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `package_deductions_packageName_key`(`packageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deduction_waivers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(255) NOT NULL,
    `deductionType` VARCHAR(50) NOT NULL,
    `deductionDate` DATE NOT NULL,
    `originalAmount` DECIMAL(10, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `adminId` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `deduction_waivers_teacherId_deductionDate_idx`(`teacherId`, `deductionDate`),
    INDEX `deduction_waivers_deductionType_deductionDate_idx`(`deductionType`, `deductionDate`),
    INDEX `deduction_waivers_adminId_idx`(`adminId`),
    UNIQUE INDEX `deduction_waivers_teacherId_deductionType_deductionDate_key`(`teacherId`, `deductionType`, `deductionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `absence_records` (
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
    `controllerId` INTEGER NULL,

    INDEX `absence_records_teacherId_idx`(`teacherId`),
    INDEX `absence_records_adminId_idx`(`adminId`),
    INDEX `absence_records_controllerId_idx`(`controllerId`),
    INDEX `absence_records_permissionRequestId_idx`(`permissionRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lateness_records` (
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
    `controllerId` INTEGER NULL,

    INDEX `lateness_records_teacherId_idx`(`teacherId`),
    INDEX `lateness_records_adminId_idx`(`adminId`),
    INDEX `lateness_records_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `attendance_submission_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL,
    `isLate` BOOLEAN NOT NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `controllerId` INTEGER NULL,

    INDEX `attendance_submission_logs_teacherId_idx`(`teacherId`),
    INDEX `attendance_submission_logs_adminId_idx`(`adminId`),
    INDEX `attendance_submission_logs_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `lateness_deduction_configs` (
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
    `controllerId` INTEGER NULL,

    INDEX `lateness_deduction_configs_teacherId_idx`(`teacherId`),
    INDEX `lateness_deduction_configs_adminId_idx`(`adminId`),
    INDEX `lateness_deduction_configs_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `controller_earnings_configs` (
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
    `controllerId` INTEGER NULL,

    INDEX `controller_earnings_configs_adminId_idx`(`adminId`),
    INDEX `controller_earnings_configs_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deduction_bonus_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configType` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `effectiveMonths` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `controllerId` INTEGER NULL,

    INDEX `deduction_bonus_configs_adminId_idx`(`adminId`),
    INDEX `deduction_bonus_configs_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_assessments` (
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
    `controllerId` INTEGER NULL,

    INDEX `quality_assessments_teacherId_idx`(`teacherId`),
    INDEX `quality_assessments_adminId_idx`(`adminId`),
    INDEX `quality_assessments_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `quality_descriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `controllerId` INTEGER NULL,

    INDEX `quality_descriptions_adminId_idx`(`adminId`),
    INDEX `quality_descriptions_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_requests` (
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
    `controllerId` INTEGER NULL,

    INDEX `permission_requests_teacherId_idx`(`teacherId`),
    INDEX `permission_requests_adminId_idx`(`adminId`),
    INDEX `permission_requests_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permission_reasons` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bonus_records` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `controllerId` INTEGER NULL,

    INDEX `bonus_records_teacherId_idx`(`teacherId`),
    INDEX `bonus_records_adminId_idx`(`adminId`),
    INDEX `bonus_records_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `controller_earnings` (
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
CREATE TABLE `zoom_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `teacherId` VARCHAR(255) NULL,
    `link` VARCHAR(255) NOT NULL,
    `trackingToken` VARCHAR(32) NOT NULL,
    `clickedAt` DATETIME(0) NULL,
    `sentTime` DATETIME(0) NULL,
    `report` INTEGER NULL DEFAULT 0,
    `expirationDate` DATETIME(0) NULL,
    `packageId` VARCHAR(191) NULL,
    `packageRate` DECIMAL(10, 2) NULL,

    INDEX `zoom_links_studentId_idx`(`studentId`),
    INDEX `zoom_links_teacherId_idx`(`teacherId`),
    INDEX `zoom_links_sentTime_idx`(`sentTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_occupied_times` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(255) NOT NULL,
    `timeSlot` VARCHAR(255) NOT NULL,
    `dayPackage` VARCHAR(255) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `occupiedAt` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `endAt` TIMESTAMP(0) NULL,

    INDEX `teacher_occupied_times_studentId_idx`(`studentId`),
    INDEX `teacher_occupied_times_occupiedAt_idx`(`occupiedAt`),
    UNIQUE INDEX `teacher_occupied_times_teacherId_timeSlot_dayPackage_key`(`teacherId`, `timeSlot`, `dayPackage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `studentName` VARCHAR(255) NOT NULL,
    `paymentDate` DATETIME(0) NOT NULL,
    `transactionId` VARCHAR(255) NOT NULL,
    `paidAmount` DECIMAL(10, 0) NOT NULL,
    `reason` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `months_table` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `month` CHAR(7) NULL,
    `paidAmount` INTEGER NOT NULL,
    `paymentStatus` VARCHAR(50) NOT NULL,
    `endDate` DATETIME(0) NULL,
    `paymentType` VARCHAR(20) NULL DEFAULT 'full',
    `startDate` DATETIME(0) NULL,
    `freeMonthReason` VARCHAR(100) NULL,
    `isFreeMonth` BOOLEAN NULL DEFAULT false,

    INDEX `months_table_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_attendance_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `attendanceStatus` VARCHAR(255) NOT NULL,
    `surah` VARCHAR(255) NULL,
    `pagesRead` INTEGER NULL,
    `level` VARCHAR(255) NULL,
    `lesson` VARCHAR(255) NULL,
    `notes` TEXT NULL,

    INDEX `student_attendance_progress_studentId_idx`(`studentId`),
    INDEX `student_attendance_progress_date_idx`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tests` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passingResult` INTEGER NOT NULL,
    `lastSubject` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `tests_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_appointments` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NULL,

    INDEX `test_appointments_testId_idx`(`testId`),
    UNIQUE INDEX `test_appointments_studentId_testId_key`(`studentId`, `testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_questions` (
    `id` VARCHAR(191) NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `odd` INTEGER NOT NULL,

    INDEX `test_questions_testId_idx`(`testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test_results` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `result` INTEGER NOT NULL,

    INDEX `test_results_questionId_idx`(`questionId`),
    INDEX `test_results_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_ratings` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actionType` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `targetId` INTEGER NULL,
    `details` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `controllerId` INTEGER NULL,

    INDEX `audit_logs_adminId_idx`(`adminId`),
    INDEX `audit_logs_controllerId_idx`(`controllerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
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
CREATE TABLE `settings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registral_earnings_configs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `registral_earnings_configs_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_day_packages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `student_day_packages_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_calculation_cache` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(255) NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `calculationData` JSON NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `salary_calculation_cache_teacherId_idx`(`teacherId`),
    INDEX `salary_calculation_cache_period_idx`(`period`),
    INDEX `salary_calculation_cache_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `salary_calculation_cache_teacherId_period_key`(`teacherId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_transactions` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(255) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `transactionId` VARCHAR(255) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `processedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payment_transactions_transactionId_key`(`transactionId`),
    INDEX `payment_transactions_teacherId_idx`(`teacherId`),
    INDEX `payment_transactions_period_idx`(`period`),
    INDEX `payment_transactions_status_idx`(`status`),
    INDEX `payment_transactions_processedAt_idx`(`processedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_adjustments` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(255) NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `adjustmentType` VARCHAR(20) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `adminId` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `salary_adjustments_teacherId_idx`(`teacherId`),
    INDEX `salary_adjustments_period_idx`(`period`),
    INDEX `salary_adjustments_adjustmentType_idx`(`adjustmentType`),
    INDEX `salary_adjustments_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `salary_reports` (
    `id` VARCHAR(191) NOT NULL,
    `reportType` VARCHAR(20) NOT NULL,
    `period` VARCHAR(7) NOT NULL,
    `format` VARCHAR(10) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `filePath` VARCHAR(500) NULL,
    `generatedAt` DATETIME(3) NULL,
    `adminId` VARCHAR(255) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `salary_reports_reportType_idx`(`reportType`),
    INDEX `salary_reports_period_idx`(`period`),
    INDEX `salary_reports_status_idx`(`status`),
    INDEX `salary_reports_adminId_idx`(`adminId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_StudentPackageHistory` (
    `A` VARCHAR(191) NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_StudentPackageHistory_AB_unique`(`A`, `B`),
    INDEX `_StudentPackageHistory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_youtubeSubject_fkey` FOREIGN KEY (`youtubeSubject`) REFERENCES `course_packages`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_packages` ADD CONSTRAINT `course_packages_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subject_packages` ADD CONSTRAINT `subject_packages_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `course_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `courses` ADD CONSTRAINT `courses_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `course_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapters` ADD CONSTRAINT `chapters_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questions` ADD CONSTRAINT `questions_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `course_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_options` ADD CONSTRAINT `question_options_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_answers` ADD CONSTRAINT `question_answers_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question_answers` ADD CONSTRAINT `question_answers_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `question_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_progress` ADD CONSTRAINT `student_progress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_progress` ADD CONSTRAINT `student_progress_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `chapters`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_quizzes` ADD CONSTRAINT `student_quizzes_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_quizzes` ADD CONSTRAINT `student_quizzes_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `questions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_quiz_answers` ADD CONSTRAINT `student_quiz_answers_studentQuizId_fkey` FOREIGN KEY (`studentQuizId`) REFERENCES `student_quizzes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_quiz_answers` ADD CONSTRAINT `student_quiz_answers_selectedOptionId_fkey` FOREIGN KEY (`selectedOptionId`) REFERENCES `question_options`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `final_exam_results` ADD CONSTRAINT `final_exam_results_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `final_exam_results` ADD CONSTRAINT `final_exam_results_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `course_packages`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarbia_attendance` ADD CONSTRAINT `tarbia_attendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarbia_attendance` ADD CONSTRAINT `tarbia_attendance_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `course_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_salary_payments` ADD CONSTRAINT `teacher_salary_payments_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_salary_payments` ADD CONSTRAINT `teacher_salary_payments_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_salary_payments` ADD CONSTRAINT `teacher_salary_payments_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absence_records` ADD CONSTRAINT `absence_records_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absence_records` ADD CONSTRAINT `absence_records_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absence_records` ADD CONSTRAINT `absence_records_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `absence_records` ADD CONSTRAINT `absence_records_permissionRequestId_fkey` FOREIGN KEY (`permissionRequestId`) REFERENCES `permission_requests`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lateness_records` ADD CONSTRAINT `lateness_records_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lateness_records` ADD CONSTRAINT `lateness_records_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lateness_records` ADD CONSTRAINT `lateness_records_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_submission_logs` ADD CONSTRAINT `attendance_submission_logs_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_submission_logs` ADD CONSTRAINT `attendance_submission_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance_submission_logs` ADD CONSTRAINT `attendance_submission_logs_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lateness_deduction_configs` ADD CONSTRAINT `lateness_deduction_configs_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lateness_deduction_configs` ADD CONSTRAINT `lateness_deduction_configs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `lateness_deduction_configs` ADD CONSTRAINT `lateness_deduction_configs_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `controller_earnings_configs` ADD CONSTRAINT `controller_earnings_configs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `controller_earnings_configs` ADD CONSTRAINT `controller_earnings_configs_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deduction_bonus_configs` ADD CONSTRAINT `deduction_bonus_configs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deduction_bonus_configs` ADD CONSTRAINT `deduction_bonus_configs_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_assessments` ADD CONSTRAINT `quality_assessments_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_assessments` ADD CONSTRAINT `quality_assessments_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_assessments` ADD CONSTRAINT `quality_assessments_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_descriptions` ADD CONSTRAINT `quality_descriptions_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `quality_descriptions` ADD CONSTRAINT `quality_descriptions_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `permission_requests` ADD CONSTRAINT `permission_requests_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonus_records` ADD CONSTRAINT `bonus_records_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonus_records` ADD CONSTRAINT `bonus_records_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bonus_records` ADD CONSTRAINT `bonus_records_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zoom_links` ADD CONSTRAINT `zoom_links_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `zoom_links` ADD CONSTRAINT `zoom_links_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_occupied_times` ADD CONSTRAINT `teacher_occupied_times_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_occupied_times` ADD CONSTRAINT `teacher_occupied_times_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `months_table` ADD CONSTRAINT `months_table_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance_progress` ADD CONSTRAINT `student_attendance_progress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_appointments` ADD CONSTRAINT `test_appointments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_appointments` ADD CONSTRAINT `test_appointments_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_questions` ADD CONSTRAINT `test_questions_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `tests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `test_results` ADD CONSTRAINT `test_results_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `test_questions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_ratings` ADD CONSTRAINT `teacher_ratings_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_controllerId_fkey` FOREIGN KEY (`controllerId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StudentPackageHistory` ADD CONSTRAINT `_StudentPackageHistory_A_fkey` FOREIGN KEY (`A`) REFERENCES `course_packages`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StudentPackageHistory` ADD CONSTRAINT `_StudentPackageHistory_B_fkey` FOREIGN KEY (`B`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
