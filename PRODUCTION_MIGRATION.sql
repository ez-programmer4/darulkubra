-- ============================================================================
-- PRODUCTION MIGRATION SQL
-- Add Zoom Integration Columns to Existing Database
-- ============================================================================

-- BACKUP FIRST! Run this command before migration:
-- mysqldump -u your_user -p your_database > backup_before_zoom_migration.sql

-- ============================================================================
-- PART 1: Add Zoom OAuth columns to Teacher table (wpos_wpdatatable_24)
-- ============================================================================

ALTER TABLE `wpos_wpdatatable_24`
ADD COLUMN `zoom_user_id` VARCHAR(255) NULL AFTER `created_at`,
ADD COLUMN `zoom_access_token` TEXT NULL AFTER `zoom_user_id`,
ADD COLUMN `zoom_refresh_token` TEXT NULL AFTER `zoom_access_token`,
ADD COLUMN `zoom_token_expires_at` DATETIME NULL AFTER `zoom_refresh_token`,
ADD COLUMN `zoom_connected_at` DATETIME NULL AFTER `zoom_token_expires_at`;

-- Add index for zoom_user_id
ALTER TABLE `wpos_wpdatatable_24`
ADD INDEX `idx_zoom_user_id` (`zoom_user_id`);

-- ============================================================================
-- PART 2: Add enhanced Zoom tracking columns to wpos_zoom_links table
-- ============================================================================

-- Add Zoom meeting metadata columns
ALTER TABLE `wpos_zoom_links`
ADD COLUMN `zoom_meeting_id` VARCHAR(255) NULL AFTER `last_activity_at`,
ADD COLUMN `zoom_start_time` DATETIME NULL AFTER `zoom_meeting_id`,
ADD COLUMN `zoom_actual_duration` INT NULL AFTER `zoom_start_time`,
ADD COLUMN `created_via_api` BOOLEAN DEFAULT FALSE AFTER `zoom_actual_duration`,
ADD COLUMN `start_url` VARCHAR(500) NULL AFTER `created_via_api`,
ADD COLUMN `scheduled_start_time` DATETIME NULL AFTER `start_url`,
ADD COLUMN `meeting_topic` VARCHAR(255) NULL AFTER `scheduled_start_time`;

-- Add participant tracking columns
ALTER TABLE `wpos_zoom_links`
ADD COLUMN `host_joined_at` DATETIME NULL AFTER `meeting_topic`,
ADD COLUMN `host_left_at` DATETIME NULL AFTER `host_joined_at`,
ADD COLUMN `student_joined_at` DATETIME NULL AFTER `host_left_at`,
ADD COLUMN `student_left_at` DATETIME NULL AFTER `student_joined_at`,
ADD COLUMN `teacher_duration_minutes` INT NULL AFTER `student_left_at`,
ADD COLUMN `student_duration_minutes` INT NULL AFTER `teacher_duration_minutes`;

-- Add meeting activity tracking columns
ALTER TABLE `wpos_zoom_links`
ADD COLUMN `participant_count` INT DEFAULT 0 AFTER `student_duration_minutes`,
ADD COLUMN `recording_started` BOOLEAN DEFAULT FALSE AFTER `participant_count`,
ADD COLUMN `screen_share_started` BOOLEAN DEFAULT FALSE AFTER `recording_started`;

-- Add index for zoom_meeting_id (for faster lookups)
ALTER TABLE `wpos_zoom_links`
ADD INDEX `idx_zoom_meeting_id` (`zoom_meeting_id`);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these to verify the migration was successful:

-- Check teacher table columns
DESCRIBE `wpos_wpdatatable_24`;

-- Check zoom_links table columns
DESCRIBE `wpos_zoom_links`;

-- Check indexes on teacher table
SHOW INDEX FROM `wpos_wpdatatable_24`;

-- Check indexes on zoom_links table
SHOW INDEX FROM `wpos_zoom_links`;

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

/*
-- ONLY USE IF MIGRATION FAILS AND YOU NEED TO ROLLBACK!

-- Rollback wpos_wpdatatable_24
ALTER TABLE `wpos_wpdatatable_24`
DROP COLUMN `zoom_user_id`,
DROP COLUMN `zoom_access_token`,
DROP COLUMN `zoom_refresh_token`,
DROP COLUMN `zoom_token_expires_at`,
DROP COLUMN `zoom_connected_at`,
DROP INDEX `idx_zoom_user_id`;

-- Rollback wpos_zoom_links
ALTER TABLE `wpos_zoom_links`
DROP COLUMN `zoom_meeting_id`,
DROP COLUMN `zoom_start_time`,
DROP COLUMN `zoom_actual_duration`,
DROP COLUMN `created_via_api`,
DROP COLUMN `start_url`,
DROP COLUMN `scheduled_start_time`,
DROP COLUMN `meeting_topic`,
DROP COLUMN `host_joined_at`,
DROP COLUMN `host_left_at`,
DROP COLUMN `student_joined_at`,
DROP COLUMN `student_left_at`,
DROP COLUMN `teacher_duration_minutes`,
DROP COLUMN `student_duration_minutes`,
DROP COLUMN `participant_count`,
DROP COLUMN `recording_started`,
DROP COLUMN `screen_share_started`,
DROP INDEX `idx_zoom_meeting_id`;
*/

-- ============================================================================
-- SUMMARY OF CHANGES
-- ============================================================================

/*
ADDED TO wpos_wpdatatable_24 (Teachers):
- zoom_user_id (VARCHAR 255) - Zoom user ID
- zoom_access_token (TEXT) - OAuth access token
- zoom_refresh_token (TEXT) - OAuth refresh token  
- zoom_token_expires_at (DATETIME) - Token expiration
- zoom_connected_at (DATETIME) - When teacher connected Zoom
- INDEX idx_zoom_user_id - For faster queries

ADDED TO wpos_zoom_links:
- zoom_meeting_id (VARCHAR 255) - Zoom meeting ID from API
- zoom_start_time (DATETIME) - When meeting started
- zoom_actual_duration (INT) - Actual meeting duration in minutes
- created_via_api (BOOLEAN) - Auto-created vs manual
- start_url (VARCHAR 500) - Teacher's start URL
- scheduled_start_time (DATETIME) - Scheduled start time
- meeting_topic (VARCHAR 255) - Meeting title
- host_joined_at (DATETIME) - When teacher joined
- host_left_at (DATETIME) - When teacher left
- student_joined_at (DATETIME) - When student joined
- student_left_at (DATETIME) - When student left
- teacher_duration_minutes (INT) - Teacher's time in meeting
- student_duration_minutes (INT) - Student's time in meeting
- participant_count (INT) - Number of participants
- recording_started (BOOLEAN) - Is recording
- screen_share_started (BOOLEAN) - Is screen sharing
- INDEX idx_zoom_meeting_id - For faster webhook lookups

TOTAL: 5 columns + 1 index on teachers table
TOTAL: 16 columns + 1 index on zoom_links table
*/

