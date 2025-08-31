/*
  Warnings:

  - You are about to drop the column `coursePackageId` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `youtubeSubject` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_23` DROP FOREIGN KEY `wpos_wpdatatable_23_coursePackageId_fkey`;

-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_23` DROP FOREIGN KEY `wpos_wpdatatable_23_youtubeSubject_fkey`;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_23` DROP COLUMN `coursePackageId`,
    DROP COLUMN `youtubeSubject`;

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
