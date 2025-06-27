-- CreateTable
CREATE TABLE `wpos_wpdatatable_24` (
    `ustazid` VARCHAR(32) NOT NULL,
    `ustazname` VARCHAR(120) NOT NULL,
    `schedule` TEXT NOT NULL,
    `control` VARCHAR(64) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_ustazid`(`ustazid`),
    PRIMARY KEY (`ustazid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_23` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `phoneno` VARCHAR(32) NOT NULL,
    `classfee` FLOAT NULL,
    `startdate` DATETIME NULL,
    `control` VARCHAR(32) NULL,
    `status` VARCHAR(32) NOT NULL,
    `ustaz` VARCHAR(32) NOT NULL,
    `package` VARCHAR(32) NOT NULL,
    `subject` VARCHAR(32) NOT NULL,
    `country` VARCHAR(64) NULL,
    `rigistral` VARCHAR(64) NULL,
    `daypackages` VARCHAR(120) NULL,
    `refer` VARCHAR(120) NULL,
    `registrationdate` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `selectedTime` VARCHAR(16) NULL,
    `isTrained` BOOLEAN NOT NULL DEFAULT false,

    INDEX `idx_ustaz`(`ustaz`),
    INDEX `idx_controller`(`control`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_ustaz_occupied_times` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ustaz_id` VARCHAR(32) NOT NULL,
    `time_slot` VARCHAR(16) NOT NULL,
    `daypackage` VARCHAR(32) NOT NULL,
    `student_id` INTEGER UNSIGNED NOT NULL,
    `occupied_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_student`(`student_id`),
    UNIQUE INDEX `wpos_ustaz_occupied_times_ustaz_id_time_slot_daypackage_key`(`ustaz_id`, `time_slot`, `daypackage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_33` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `username` VARCHAR(120) NOT NULL,
    `password` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `wpos_wpdatatable_33_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_33_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_28` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `username` VARCHAR(120) NOT NULL,
    `password` VARCHAR(120) NOT NULL,
    `code` VARCHAR(32) NOT NULL,

    UNIQUE INDEX `wpos_wpdatatable_28_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_28_username_key`(`username`),
    UNIQUE INDEX `wpos_wpdatatable_28_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_30` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `control` VARCHAR(120) NULL,

    UNIQUE INDEX `control`(`control`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` INTEGER NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `note` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Attendance_studentId_idx`(`studentId`),
    INDEX `Attendance_date_idx`(`date`),
    UNIQUE INDEX `Attendance_studentId_date_key`(`studentId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_ustaz_fkey` FOREIGN KEY (`ustaz`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_control_fkey` FOREIGN KEY (`control`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_ustaz_id_fkey` FOREIGN KEY (`ustaz_id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE CASCADE ON UPDATE CASCADE;
