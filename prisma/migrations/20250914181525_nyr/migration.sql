/*
  Warnings:

  - You are about to drop the column `baseDeductionAmount` on the `latenessdeductionconfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `absencerecord` ADD COLUMN `isWaived` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `waiverReason` TEXT NULL;

-- AlterTable
ALTER TABLE `latenessdeductionconfig` DROP COLUMN `baseDeductionAmount`;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_23` ADD COLUMN `youtubeSubject` VARCHAR(191) NULL;

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

    INDEX `idx_teacher_date`(`teacherId`, `deductionDate`),
    INDEX `idx_type_date`(`deductionType`, `deductionDate`),
    INDEX `idx_admin`(`adminId`),
    UNIQUE INDEX `deduction_waivers_teacherId_deductionType_deductionDate_key`(`teacherId`, `deductionType`, `deductionDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PackageHistory` (
    `A` VARCHAR(191) NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PackageHistory_AB_unique`(`A`, `B`),
    INDEX `_PackageHistory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_youtubeSubject_fkey` FOREIGN KEY (`youtubeSubject`) REFERENCES `coursePackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PackageHistory` ADD CONSTRAINT `_PackageHistory_A_fkey` FOREIGN KEY (`A`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PackageHistory` ADD CONSTRAINT `_PackageHistory_B_fkey` FOREIGN KEY (`B`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;
