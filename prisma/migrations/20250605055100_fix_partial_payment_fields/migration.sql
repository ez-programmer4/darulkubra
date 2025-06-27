/*
  Warnings:

  - You are about to alter the column `partial_start_date` on the `months_table` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime`.
  - You are about to alter the column `partial_end_date` on the `months_table` table. The data in that column could be lost. The data in that column will be cast from `DateTime(3)` to `DateTime`.

*/
-- AlterTable
ALTER TABLE `months_table` MODIFY `partial_start_date` DATETIME NULL,
    MODIFY `partial_end_date` DATETIME NULL;
