-- AlterTable
ALTER TABLE `user` ADD COLUMN `wpos_wpdatatable_23Wdt_ID` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `user` ADD CONSTRAINT `user_wpos_wpdatatable_23Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_23Wdt_ID`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;
