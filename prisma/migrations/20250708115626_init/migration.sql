-- CreateTable
CREATE TABLE `wpos_wpdatatable_24` (
    `ustazid` VARCHAR(255) NOT NULL,
    `ustazname` VARCHAR(120) NULL,
    `phone` VARCHAR(32) NULL,
    `schedule` TEXT NULL,
    `controlId` INTEGER NULL,
    `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ustazid`(`ustazid`),
    PRIMARY KEY (`ustazid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_23` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `phoneno` VARCHAR(32) NOT NULL,
    `classfee` FLOAT NULL,
    `startdate` DATETIME(0) NULL,
    `control` VARCHAR(255) NULL,
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
    `chatId` VARCHAR(64) NULL,
    `progress` VARCHAR(64) NULL,

    INDEX `idx_ustaz`(`ustaz`),
    INDEX `idx_controller`(`control`),
    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_28` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NULL,
    `username` VARCHAR(255) NULL,
    `password` VARCHAR(255) NOT NULL,
    `code` VARCHAR(32) NULL,

    UNIQUE INDEX `wpos_wpdatatable_28_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_28_username_key`(`username`),
    UNIQUE INDEX `wpos_wpdatatable_28_code_key`(`code`),
    PRIMARY KEY (`id`)
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
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `username` VARCHAR(120) NULL,
    `passcode` VARCHAR(120) NOT NULL,
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
CREATE TABLE `Setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
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
CREATE TABLE `testQuestion` (
    `id` VARCHAR(191) NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `odd` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testResult` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `result` INTEGER NOT NULL,

    INDEX `testResult_studentId_idx`(`studentId`),
    INDEX `testResult_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testAppointment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NULL,

    UNIQUE INDEX `testAppointment_studentId_testId_key`(`studentId`, `testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_controlId_fkey` FOREIGN KEY (`controlId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_control_fkey` FOREIGN KEY (`control`) REFERENCES `wpos_wpdatatable_28`(`username`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_ustaz_fkey` FOREIGN KEY (`ustaz`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_ustaz_id_fkey` FOREIGN KEY (`ustaz_id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `months_table` ADD CONSTRAINT `month_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_sendername_fkey` FOREIGN KEY (`sendername`) REFERENCES `wpos_wpdatatable_28`(`username`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance_progress` ADD CONSTRAINT `student_attendance_progress_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_ustazid_fkey` FOREIGN KEY (`ustazid`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testQuestion` ADD CONSTRAINT `testQuestion_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testResult` ADD CONSTRAINT `testResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testResult` ADD CONSTRAINT `testResult_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `testQuestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testAppointment` ADD CONSTRAINT `testAppointment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testAppointment` ADD CONSTRAINT `testAppointment_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
