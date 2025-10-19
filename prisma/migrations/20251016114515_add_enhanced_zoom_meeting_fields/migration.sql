-- AlterTable
ALTER TABLE `wpos_zoom_links` ADD COLUMN `host_joined_at` DATETIME(0) NULL,
    ADD COLUMN `meeting_topic` VARCHAR(255) NULL,
    ADD COLUMN `participant_count` INTEGER NULL DEFAULT 0,
    ADD COLUMN `recording_started` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `scheduled_start_time` DATETIME(0) NULL,
    ADD COLUMN `screen_share_started` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `start_url` VARCHAR(500) NULL;

-- CreateIndex
CREATE INDEX `idx_scheduled_start_time` ON `wpos_zoom_links`(`scheduled_start_time`);
