/*
  Warnings:

  - You are about to drop the column `read` on the `notification` table. All the data in the column will be lost.
  - You are about to alter the column `type` on the `notification` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(50)`.
  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userRole` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `notification` DROP COLUMN `read`,
    ADD COLUMN `isRead` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `title` VARCHAR(255) NOT NULL,
    ADD COLUMN `userRole` VARCHAR(50) NOT NULL,
    MODIFY `userId` VARCHAR(255) NOT NULL,
    MODIFY `type` VARCHAR(50) NOT NULL,
    MODIFY `message` TEXT NOT NULL,
    MODIFY `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0);

-- CreateTable
CREATE TABLE `wpos_teams` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

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
    `adminId` INTEGER NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ControllerEarningsConfig` ADD CONSTRAINT `ControllerEarningsConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ControllerEarningsConfig` ADD CONSTRAINT `ControllerEarningsConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;
