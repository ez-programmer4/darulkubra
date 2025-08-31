/*
  Warnings:

  - You are about to drop the column `wpos_wpdatatable_23Wdt_ID` on the `user` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `wpos_wpdatatable_23` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `user` DROP FOREIGN KEY `user_wpos_wpdatatable_23Wdt_ID_fkey`;

-- DropIndex
DROP INDEX `user_wpos_wpdatatable_23Wdt_ID_key` ON `user`;

-- AlterTable
ALTER TABLE `user` DROP COLUMN `wpos_wpdatatable_23Wdt_ID`;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_23` ADD COLUMN `userId` VARCHAR(191) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `wpos_wpdatatable_23_userId_key` ON `wpos_wpdatatable_23`(`userId`);

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
