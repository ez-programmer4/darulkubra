/*
  Warnings:

  - You are about to drop the `attendance` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `Attendance_markedBy_fkey`;

-- DropForeignKey
ALTER TABLE `attendance` DROP FOREIGN KEY `Attendance_studentId_fkey`;

-- DropTable
DROP TABLE `attendance`;

-- CreateTable
CREATE TABLE `student_attendance_progress` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER UNSIGNED NOT NULL,
    `date` DATETIME(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `attendance_status` VARCHAR(20) NOT NULL,
    `surah` VARCHAR(50) NULL,
    `pages_read` INTEGER NULL,
    `level` VARCHAR(50) NULL,
    `lesson` VARCHAR(50) NULL,
    `notes` TEXT NULL,

    INDEX `idx_student_attendance_progress`(`student_id`),
    INDEX `idx_date`(`date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_zoom_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER UNSIGNED NOT NULL,
    `ustazid` VARCHAR(32) NOT NULL,
    `link` TEXT NOT NULL,
    `tracking_token` VARCHAR(64) NOT NULL,
    `clicked_at` DATETIME(0) NULL,
    `sent_time` DATETIME(0) NULL,
    `report` TEXT NULL,
    `expiration_date` DATETIME(0) NULL,

    INDEX `idx_studentid`(`studentid`),
    INDEX `idx_ustazid`(`ustazid`),
    INDEX `idx_sent_time`(`sent_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_attendance_progress` ADD CONSTRAINT `student_attendance_progress_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_ustazid_fkey` FOREIGN KEY (`ustazid`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE CASCADE ON UPDATE CASCADE;
