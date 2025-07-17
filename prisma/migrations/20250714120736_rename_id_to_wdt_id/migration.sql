/*
  Warnings:

  - The primary key for the `wpos_wpdatatable_28` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `wpos_wpdatatable_28` table. All the data in the column will be lost.
  - Added the required column `wdt_ID` to the `wpos_wpdatatable_28` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_24` DROP FOREIGN KEY `wpos_wpdatatable_24_controlId_fkey`;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_28` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`wdt_ID`);

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_controlId_fkey` FOREIGN KEY (`controlId`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;
