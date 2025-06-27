/*
  Warnings:

  - You are about to drop the column `control` on the `wpos_wpdatatable_24` table. All the data in the column will be lost.
  - Added the required column `controlId` to the `wpos_wpdatatable_24` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `wpos_wpdatatable_24` DROP COLUMN `control`,
    ADD COLUMN `controlId` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_controlId_fkey` FOREIGN KEY (`controlId`) REFERENCES `wpos_wpdatatable_28`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
