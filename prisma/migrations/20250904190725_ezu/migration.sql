/*
  Warnings:

  - You are about to drop the column `requestedDates` on the `permissionrequest` table. All the data in the column will be lost.
  - Added the required column `requestedDate` to the `PermissionRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timeSlots` to the `PermissionRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `permissionrequest` DROP COLUMN `requestedDates`,
    ADD COLUMN `requestedDate` VARCHAR(191) NOT NULL,
    ADD COLUMN `timeSlots` VARCHAR(191) NOT NULL;
