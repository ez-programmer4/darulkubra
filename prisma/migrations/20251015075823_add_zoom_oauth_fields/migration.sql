-- AlterTable
ALTER TABLE `wpos_wpdatatable_24` ADD COLUMN `zoom_access_token` TEXT NULL,
    ADD COLUMN `zoom_connected_at` DATETIME(0) NULL,
    ADD COLUMN `zoom_refresh_token` TEXT NULL,
    ADD COLUMN `zoom_token_expires_at` DATETIME(0) NULL,
    ADD COLUMN `zoom_user_id` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `wpos_zoom_links` ADD COLUMN `created_via_api` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `zoom_actual_duration` INTEGER NULL,
    ADD COLUMN `zoom_meeting_id` VARCHAR(255) NULL,
    ADD COLUMN `zoom_start_time` DATETIME(0) NULL;

-- CreateIndex
CREATE INDEX `idx_zoom_user_id` ON `wpos_wpdatatable_24`(`zoom_user_id`);

-- CreateIndex
CREATE INDEX `idx_zoom_meeting_id` ON `wpos_zoom_links`(`zoom_meeting_id`);
