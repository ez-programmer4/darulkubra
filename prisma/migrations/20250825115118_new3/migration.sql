/*
  Warnings:

  - You are about to drop the `payment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `payment` DROP FOREIGN KEY `Payment_studentid_fkey`;

-- DropTable
DROP TABLE `payment`;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_29` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER NOT NULL,
    `studentname` VARCHAR(255) NOT NULL,
    `paymentdate` DATETIME(0) NOT NULL,
    `transactionid` VARCHAR(191) NOT NULL,
    `paidamount` DECIMAL(12, 2) NOT NULL,
    `reason` TEXT NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',

    UNIQUE INDEX `Payment_transactionid_key`(`transactionid`),
    INDEX `Payment_paymentdate_idx`(`paymentdate`),
    INDEX `Payment_studentid_idx`(`studentid`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_29` ADD CONSTRAINT `Payment_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;
