/*
  Warnings:

  - You are about to drop the column `createdAt` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `attendance` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `attendance` table. All the data in the column will be lost.
  - You are about to alter the column `studentId` on the `attendance` table. The data in that column could be lost. The data in that column will be cast from `Int` to `UnsignedInt`.
  - A unique constraint covering the columns `[studentId,date,timeSlot]` on the table `attendance` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `markedBy` to the `attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeSlot` to the `attendance` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_23` DROP FOREIGN KEY `wpos_wpdatatable_23_control_fkey`;

-- DropIndex
DROP INDEX `Attendance_studentId_date_key` ON `attendance`;

-- AlterTable
ALTER TABLE `attendance` DROP COLUMN `createdAt`,
    DROP COLUMN `note`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `markedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `markedBy` VARCHAR(120) NOT NULL,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    ADD COLUMN `timeSlot` VARCHAR(191) NOT NULL,
    MODIFY `studentId` INTEGER UNSIGNED NOT NULL;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_23` ADD COLUMN `chatId` VARCHAR(64) NULL,
    ADD COLUMN `progress` VARCHAR(64) NULL;

-- CreateTable
CREATE TABLE `months_table` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER UNSIGNED NOT NULL,
    `month` CHAR(7) NOT NULL,
    `paid_amount` DECIMAL(12, 2) NOT NULL,
    `payment_status` VARCHAR(50) NOT NULL,
    `is_partial` BOOLEAN NOT NULL DEFAULT false,
    `partial_start_date` DATETIME(3) NULL,
    `partial_end_date` DATETIME(3) NULL,

    INDEX `months_table_studentid_idx`(`studentid`),
    UNIQUE INDEX `months_table_studentid_month_key`(`studentid`, `month`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `sendername` VARCHAR(120) NOT NULL,
    `studentid` INTEGER UNSIGNED NOT NULL,
    `studentname` VARCHAR(255) NOT NULL,
    `paymentdate` DATETIME(0) NOT NULL,
    `transactionid` VARCHAR(191) NOT NULL,
    `paidamount` DECIMAL(12, 2) NOT NULL,
    `reason` TEXT NOT NULL,

    UNIQUE INDEX `Payment_transactionid_key`(`transactionid`),
    INDEX `Payment_paymentdate_idx`(`paymentdate`),
    INDEX `Payment_sendername_idx`(`sendername`),
    INDEX `Payment_studentid_idx`(`studentid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Attendance_markedBy_idx` ON `attendance`(`markedBy`);

-- CreateIndex
CREATE UNIQUE INDEX `Attendance_studentId_date_timeSlot_key` ON `attendance`(`studentId`, `date`, `timeSlot`);

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_control_fkey` FOREIGN KEY (`control`) REFERENCES `wpos_wpdatatable_28`(`username`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `Attendance_markedBy_fkey` FOREIGN KEY (`markedBy`) REFERENCES `wpos_wpdatatable_28`(`username`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `attendance` ADD CONSTRAINT `Attendance_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `months_table` ADD CONSTRAINT `months_table_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `Payment_sendername_fkey` FOREIGN KEY (`sendername`) REFERENCES `wpos_wpdatatable_28`(`username`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payment` ADD CONSTRAINT `Payment_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
