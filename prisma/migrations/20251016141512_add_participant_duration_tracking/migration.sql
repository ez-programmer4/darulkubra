-- AlterTable
ALTER TABLE `wpos_zoom_links` ADD COLUMN `host_left_at` DATETIME(0) NULL,
    ADD COLUMN `student_duration_minutes` INTEGER NULL,
    ADD COLUMN `student_joined_at` DATETIME(0) NULL,
    ADD COLUMN `student_left_at` DATETIME(0) NULL,
    ADD COLUMN `teacher_duration_minutes` INTEGER NULL;
