/*
  Warnings:

  - A unique constraint covering the columns `[wpos_wpdatatable_23Wdt_ID]` on the table `user` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `user_wpos_wpdatatable_23Wdt_ID_key` ON `user`(`wpos_wpdatatable_23Wdt_ID`);
