/*
  Warnings:

  - You are about to drop the column `is_partial` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `partial_end_date` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `partial_start_date` on the `months_table` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `months_table` DROP COLUMN `is_partial`,
    DROP COLUMN `partial_end_date`,
    DROP COLUMN `partial_start_date`,
    ADD COLUMN `end_date` DATETIME NULL,
    ADD COLUMN `payment_type` VARCHAR(20) NOT NULL DEFAULT 'full',
    ADD COLUMN `start_date` DATETIME NULL;
