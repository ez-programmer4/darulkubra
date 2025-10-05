/*
  Warnings:

  - You are about to drop the column `chatId` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `admin` table. All the data in the column will be lost.
  - You are about to drop the column `endDate` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `freeMonthReason` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `isFreeMonth` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `paidAmount` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `paymentType` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `months_table` table. All the data in the column will be lost.
  - You are about to drop the column `attendanceStatus` on the `student_attendance_progress` table. All the data in the column will be lost.
  - You are about to drop the column `pagesRead` on the `student_attendance_progress` table. All the data in the column will be lost.
  - You are about to drop the column `studentId` on the `student_attendance_progress` table. All the data in the column will be lost.
  - The primary key for the `wpos_wpdatatable_23` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `classFee` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `controllerId` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `dayPackages` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `exitDate` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `referrer` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `registrationDate` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `registrationNumber` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `startDate` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - You are about to drop the column `teacherId` on the `wpos_wpdatatable_23` table. All the data in the column will be lost.
  - The primary key for the `wpos_wpdatatable_24` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `controllerId` on the `wpos_wpdatatable_24` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `wpos_wpdatatable_24` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `wpos_wpdatatable_24` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `wpos_wpdatatable_24` table. All the data in the column will be lost.
  - The primary key for the `wpos_wpdatatable_28` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `wpos_wpdatatable_28` table. All the data in the column will be lost.
  - You are about to drop the `_studentpackagehistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `absence_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `attendance_submission_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `audit_logs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `bonus_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `chapters` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `controller_earnings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `controller_earnings_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `course_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `courses` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `deduction_bonus_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `final_exam_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lateness_deduction_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lateness_records` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `package_deductions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `package_salaries` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission_reasons` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `permission_requests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quality_assessments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quality_descriptions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `question_options` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `registral_earnings_configs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `settings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_day_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_progress` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_quiz_answers` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `student_quizzes` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `subject_packages` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tarbia_attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_occupied_times` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_ratings` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teacher_salary_payments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `test_appointments` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `test_questions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `test_results` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tests` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `zoom_links` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[chat_id]` on the table `admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chat_id` to the `admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paid_amount` to the `months_table` table without a default value. This is not possible if the table is not empty.
  - Added the required column `payment_status` to the `months_table` table without a default value. This is not possible if the table is not empty.
  - Added the required column `studentid` to the `months_table` table without a default value. This is not possible if the table is not empty.
  - Added the required column `attendance_status` to the `student_attendance_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `student_id` to the `student_attendance_progress` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wdt_ID` to the `wpos_wpdatatable_23` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wdt_ID` to the `wpos_wpdatatable_28` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `_studentpackagehistory` DROP FOREIGN KEY `_StudentPackageHistory_A_fkey`;

-- DropForeignKey
ALTER TABLE `_studentpackagehistory` DROP FOREIGN KEY `_StudentPackageHistory_B_fkey`;

-- DropForeignKey
ALTER TABLE `absence_records` DROP FOREIGN KEY `absence_records_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `absence_records` DROP FOREIGN KEY `absence_records_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `absence_records` DROP FOREIGN KEY `absence_records_permissionRequestId_fkey`;

-- DropForeignKey
ALTER TABLE `absence_records` DROP FOREIGN KEY `absence_records_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_submission_logs` DROP FOREIGN KEY `attendance_submission_logs_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_submission_logs` DROP FOREIGN KEY `attendance_submission_logs_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `attendance_submission_logs` DROP FOREIGN KEY `attendance_submission_logs_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `audit_logs` DROP FOREIGN KEY `audit_logs_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `bonus_records` DROP FOREIGN KEY `bonus_records_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `bonus_records` DROP FOREIGN KEY `bonus_records_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `bonus_records` DROP FOREIGN KEY `bonus_records_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `chapters` DROP FOREIGN KEY `chapters_courseId_fkey`;

-- DropForeignKey
ALTER TABLE `controller_earnings_configs` DROP FOREIGN KEY `controller_earnings_configs_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `controller_earnings_configs` DROP FOREIGN KEY `controller_earnings_configs_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `course_packages` DROP FOREIGN KEY `course_packages_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `courses` DROP FOREIGN KEY `courses_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `deduction_bonus_configs` DROP FOREIGN KEY `deduction_bonus_configs_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `deduction_bonus_configs` DROP FOREIGN KEY `deduction_bonus_configs_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `final_exam_results` DROP FOREIGN KEY `final_exam_results_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `final_exam_results` DROP FOREIGN KEY `final_exam_results_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `lateness_deduction_configs` DROP FOREIGN KEY `lateness_deduction_configs_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `lateness_deduction_configs` DROP FOREIGN KEY `lateness_deduction_configs_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `lateness_deduction_configs` DROP FOREIGN KEY `lateness_deduction_configs_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `lateness_records` DROP FOREIGN KEY `lateness_records_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `lateness_records` DROP FOREIGN KEY `lateness_records_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `lateness_records` DROP FOREIGN KEY `lateness_records_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `months_table` DROP FOREIGN KEY `months_table_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `payments` DROP FOREIGN KEY `payments_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_requests` DROP FOREIGN KEY `permission_requests_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_requests` DROP FOREIGN KEY `permission_requests_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `permission_requests` DROP FOREIGN KEY `permission_requests_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `quality_assessments` DROP FOREIGN KEY `quality_assessments_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `quality_assessments` DROP FOREIGN KEY `quality_assessments_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `quality_assessments` DROP FOREIGN KEY `quality_assessments_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `quality_descriptions` DROP FOREIGN KEY `quality_descriptions_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `quality_descriptions` DROP FOREIGN KEY `quality_descriptions_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `question_answers` DROP FOREIGN KEY `question_answers_answerId_fkey`;

-- DropForeignKey
ALTER TABLE `question_answers` DROP FOREIGN KEY `question_answers_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `question_options` DROP FOREIGN KEY `question_options_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `questions` DROP FOREIGN KEY `questions_chapterId_fkey`;

-- DropForeignKey
ALTER TABLE `questions` DROP FOREIGN KEY `questions_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `student_attendance_progress` DROP FOREIGN KEY `student_attendance_progress_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `student_progress` DROP FOREIGN KEY `student_progress_chapterId_fkey`;

-- DropForeignKey
ALTER TABLE `student_progress` DROP FOREIGN KEY `student_progress_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `student_quiz_answers` DROP FOREIGN KEY `student_quiz_answers_selectedOptionId_fkey`;

-- DropForeignKey
ALTER TABLE `student_quiz_answers` DROP FOREIGN KEY `student_quiz_answers_studentQuizId_fkey`;

-- DropForeignKey
ALTER TABLE `student_quizzes` DROP FOREIGN KEY `student_quizzes_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `student_quizzes` DROP FOREIGN KEY `student_quizzes_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `subject_packages` DROP FOREIGN KEY `subject_packages_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `tarbia_attendance` DROP FOREIGN KEY `tarbia_attendance_packageId_fkey`;

-- DropForeignKey
ALTER TABLE `tarbia_attendance` DROP FOREIGN KEY `tarbia_attendance_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_occupied_times` DROP FOREIGN KEY `teacher_occupied_times_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_occupied_times` DROP FOREIGN KEY `teacher_occupied_times_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_ratings` DROP FOREIGN KEY `teacher_ratings_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_salary_payments` DROP FOREIGN KEY `teacher_salary_payments_adminId_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_salary_payments` DROP FOREIGN KEY `teacher_salary_payments_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `teacher_salary_payments` DROP FOREIGN KEY `teacher_salary_payments_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `test_appointments` DROP FOREIGN KEY `test_appointments_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `test_appointments` DROP FOREIGN KEY `test_appointments_testId_fkey`;

-- DropForeignKey
ALTER TABLE `test_questions` DROP FOREIGN KEY `test_questions_testId_fkey`;

-- DropForeignKey
ALTER TABLE `test_results` DROP FOREIGN KEY `test_results_questionId_fkey`;

-- DropForeignKey
ALTER TABLE `test_results` DROP FOREIGN KEY `test_results_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_23` DROP FOREIGN KEY `wpos_wpdatatable_23_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_23` DROP FOREIGN KEY `wpos_wpdatatable_23_teacherId_fkey`;

-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_23` DROP FOREIGN KEY `wpos_wpdatatable_23_youtubeSubject_fkey`;

-- DropForeignKey
ALTER TABLE `wpos_wpdatatable_24` DROP FOREIGN KEY `wpos_wpdatatable_24_controllerId_fkey`;

-- DropForeignKey
ALTER TABLE `zoom_links` DROP FOREIGN KEY `zoom_links_studentId_fkey`;

-- DropForeignKey
ALTER TABLE `zoom_links` DROP FOREIGN KEY `zoom_links_teacherId_fkey`;

-- DropIndex
DROP INDEX `admin_chatId_key` ON `admin`;

-- DropIndex
DROP INDEX `wpos_wpdatatable_24_ustazid_key` ON `wpos_wpdatatable_24`;

-- AlterTable
ALTER TABLE `admin` DROP COLUMN `chatId`,
    DROP COLUMN `phone`,
    ADD COLUMN `chat_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `phoneno` VARCHAR(32) NULL;

-- AlterTable
ALTER TABLE `months_table` DROP COLUMN `endDate`,
    DROP COLUMN `freeMonthReason`,
    DROP COLUMN `isFreeMonth`,
    DROP COLUMN `paidAmount`,
    DROP COLUMN `paymentStatus`,
    DROP COLUMN `paymentType`,
    DROP COLUMN `startDate`,
    DROP COLUMN `studentId`,
    ADD COLUMN `end_date` DATETIME(0) NULL,
    ADD COLUMN `free_month_reason` VARCHAR(100) NULL,
    ADD COLUMN `is_free_month` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `paid_amount` INTEGER NOT NULL,
    ADD COLUMN `payment_status` VARCHAR(50) NOT NULL,
    ADD COLUMN `payment_type` VARCHAR(20) NULL DEFAULT 'full',
    ADD COLUMN `start_date` DATETIME(0) NULL,
    ADD COLUMN `studentid` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `student_attendance_progress` DROP COLUMN `attendanceStatus`,
    DROP COLUMN `pagesRead`,
    DROP COLUMN `studentId`,
    ADD COLUMN `attendance_status` VARCHAR(255) NOT NULL,
    ADD COLUMN `pages_read` INTEGER NULL,
    ADD COLUMN `student_id` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_23` DROP PRIMARY KEY,
    DROP COLUMN `classFee`,
    DROP COLUMN `controllerId`,
    DROP COLUMN `dayPackages`,
    DROP COLUMN `exitDate`,
    DROP COLUMN `id`,
    DROP COLUMN `phone`,
    DROP COLUMN `referrer`,
    DROP COLUMN `registrationDate`,
    DROP COLUMN `registrationNumber`,
    DROP COLUMN `startDate`,
    DROP COLUMN `teacherId`,
    ADD COLUMN `classfee` FLOAT NULL,
    ADD COLUMN `daypackages` VARCHAR(255) NULL,
    ADD COLUMN `exitdate` DATETIME(0) NULL,
    ADD COLUMN `phoneno` VARCHAR(32) NULL,
    ADD COLUMN `refer` VARCHAR(255) NULL,
    ADD COLUMN `registrationdate` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `rigistral` VARCHAR(255) NULL,
    ADD COLUMN `startdate` DATETIME(0) NULL,
    ADD COLUMN `u_control` VARCHAR(255) NULL,
    ADD COLUMN `ustaz` VARCHAR(255) NULL,
    ADD COLUMN `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`wdt_ID`);

-- AlterTable
ALTER TABLE `wpos_wpdatatable_24` DROP PRIMARY KEY,
    DROP COLUMN `controllerId`,
    DROP COLUMN `createdAt`,
    DROP COLUMN `id`,
    DROP COLUMN `name`,
    ADD COLUMN `control` VARCHAR(255) NULL,
    ADD COLUMN `created_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    ADD COLUMN `ustazname` VARCHAR(120) NULL,
    ADD PRIMARY KEY (`ustazid`);

-- AlterTable
ALTER TABLE `wpos_wpdatatable_28` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    ADD PRIMARY KEY (`wdt_ID`);

-- DropTable
DROP TABLE `_studentpackagehistory`;

-- DropTable
DROP TABLE `absence_records`;

-- DropTable
DROP TABLE `attendance_submission_logs`;

-- DropTable
DROP TABLE `audit_logs`;

-- DropTable
DROP TABLE `bonus_records`;

-- DropTable
DROP TABLE `chapters`;

-- DropTable
DROP TABLE `controller_earnings`;

-- DropTable
DROP TABLE `controller_earnings_configs`;

-- DropTable
DROP TABLE `course_packages`;

-- DropTable
DROP TABLE `courses`;

-- DropTable
DROP TABLE `deduction_bonus_configs`;

-- DropTable
DROP TABLE `final_exam_results`;

-- DropTable
DROP TABLE `lateness_deduction_configs`;

-- DropTable
DROP TABLE `lateness_records`;

-- DropTable
DROP TABLE `notifications`;

-- DropTable
DROP TABLE `package_deductions`;

-- DropTable
DROP TABLE `package_salaries`;

-- DropTable
DROP TABLE `payments`;

-- DropTable
DROP TABLE `permission_reasons`;

-- DropTable
DROP TABLE `permission_requests`;

-- DropTable
DROP TABLE `quality_assessments`;

-- DropTable
DROP TABLE `quality_descriptions`;

-- DropTable
DROP TABLE `question_answers`;

-- DropTable
DROP TABLE `question_options`;

-- DropTable
DROP TABLE `questions`;

-- DropTable
DROP TABLE `registral_earnings_configs`;

-- DropTable
DROP TABLE `settings`;

-- DropTable
DROP TABLE `student_day_packages`;

-- DropTable
DROP TABLE `student_progress`;

-- DropTable
DROP TABLE `student_quiz_answers`;

-- DropTable
DROP TABLE `student_quizzes`;

-- DropTable
DROP TABLE `subject_packages`;

-- DropTable
DROP TABLE `tarbia_attendance`;

-- DropTable
DROP TABLE `teacher_occupied_times`;

-- DropTable
DROP TABLE `teacher_ratings`;

-- DropTable
DROP TABLE `teacher_salary_payments`;

-- DropTable
DROP TABLE `test_appointments`;

-- DropTable
DROP TABLE `test_questions`;

-- DropTable
DROP TABLE `test_results`;

-- DropTable
DROP TABLE `tests`;

-- DropTable
DROP TABLE `zoom_links`;

-- CreateTable
CREATE TABLE `wpos_teams` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_ustaz_occupied_times` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ustaz_id` VARCHAR(255) NOT NULL,
    `time_slot` VARCHAR(255) NOT NULL,
    `daypackage` VARCHAR(255) NOT NULL,
    `student_id` INTEGER NOT NULL,
    `occupied_at` TIMESTAMP(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `end_at` TIMESTAMP(0) NULL,

    INDEX `idx_student`(`student_id`),
    INDEX `idx_occupied_times_occupied_at`(`occupied_at`),
    UNIQUE INDEX `wpos_ustaz_occupied_times_ustaz_id_time_slot_daypackage_key`(`ustaz_id`, `time_slot`, `daypackage`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacher_change_history` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `student_id` INTEGER NOT NULL,
    `old_teacher_id` VARCHAR(255) NULL,
    `new_teacher_id` VARCHAR(255) NOT NULL,
    `change_date` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `change_reason` VARCHAR(500) NULL,
    `time_slot` VARCHAR(255) NOT NULL,
    `daypackage` VARCHAR(255) NOT NULL,
    `student_package` VARCHAR(255) NULL,
    `monthly_rate` DECIMAL(10, 2) NULL,
    `daily_rate` DECIMAL(10, 2) NULL,
    `created_by` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_teacher_change_student`(`student_id`),
    INDEX `idx_teacher_change_old_teacher`(`old_teacher_id`),
    INDEX `idx_teacher_change_new_teacher`(`new_teacher_id`),
    INDEX `idx_teacher_change_date`(`change_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_33` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NULL,
    `username` VARCHAR(120) NULL,
    `password` VARCHAR(120) NULL,

    UNIQUE INDEX `wpos_wpdatatable_33_name_key`(`name`),
    UNIQUE INDEX `wpos_wpdatatable_33_username_key`(`username`),
    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_zoom_links` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER NOT NULL,
    `ustazid` VARCHAR(255) NULL,
    `link` VARCHAR(255) NOT NULL,
    `tracking_token` VARCHAR(32) NOT NULL,
    `clicked_at` DATETIME(0) NULL,
    `sent_time` DATETIME(0) NULL,
    `report` INTEGER NULL DEFAULT 0,
    `expiration_date` DATETIME(0) NULL,
    `packageId` VARCHAR(191) NULL,
    `packageRate` DECIMAL(10, 2) NULL,

    INDEX `idx_studentid`(`studentid`),
    INDEX `idx_ustazid`(`ustazid`),
    INDEX `idx_sent_time`(`sent_time`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `test` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `passingResult` INTEGER NOT NULL,
    `lastSubject` VARCHAR(191) NOT NULL DEFAULT '',

    UNIQUE INDEX `test_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AbsenceRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `timeSlots` VARCHAR(191) NULL,
    `permitted` BOOLEAN NOT NULL,
    `permissionRequestId` INTEGER NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `reviewedByManager` BOOLEAN NOT NULL,
    `reviewNotes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `AbsenceRecord_admin_fkey`(`adminId`),
    INDEX `AbsenceRecord_permissionRequestId_fkey`(`permissionRequestId`),
    INDEX `AbsenceRecord_teacherId_fkey`(`teacherId`),
    INDEX `AbsenceRecord_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceSubmissionLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `submittedAt` DATETIME(3) NOT NULL,
    `isLate` BOOLEAN NOT NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `AttendanceSubmissionLog_admin_fkey`(`adminId`),
    INDEX `AttendanceSubmissionLog_teacherId_fkey`(`teacherId`),
    INDEX `AttendanceSubmissionLog_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actionType` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `targetId` INTEGER NULL,
    `details` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `AuditLog_admin_fkey`(`adminId`),
    INDEX `AuditLog_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BonusRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `amount` DOUBLE NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `BonusRecord_admin_fkey`(`adminId`),
    INDEX `BonusRecord_teacherId_fkey`(`teacherId`),
    INDEX `BonusRecord_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `controllerEarning` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `controllerUsername` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `paymentId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidOut` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ControllerEarningsConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `mainBaseRate` DOUBLE NOT NULL DEFAULT 40,
    `referralBaseRate` DOUBLE NOT NULL DEFAULT 40,
    `leavePenaltyMultiplier` DOUBLE NOT NULL DEFAULT 3,
    `leaveThreshold` INTEGER NOT NULL DEFAULT 5,
    `unpaidPenaltyMultiplier` DOUBLE NOT NULL DEFAULT 2,
    `referralBonusMultiplier` DOUBLE NOT NULL DEFAULT 4,
    `targetEarnings` DOUBLE NOT NULL DEFAULT 3000,
    `effectiveFrom` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `ControllerEarningsConfig_admin_fkey`(`adminId`),
    INDEX `ControllerEarningsConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeductionBonusConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `configType` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `effectiveMonths` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `DeductionBonusConfig_admin_fkey`(`adminId`),
    INDEX `DeductionBonusConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LatenessDeductionConfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `excusedThreshold` INTEGER NOT NULL,
    `tier` INTEGER NOT NULL,
    `startMinute` INTEGER NOT NULL,
    `endMinute` INTEGER NOT NULL,
    `deductionPercent` DOUBLE NOT NULL,
    `isGlobal` BOOLEAN NOT NULL DEFAULT true,
    `teacherId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `LatenessDeductionConfig_admin_fkey`(`adminId`),
    INDEX `LatenessDeductionConfig_teacherId_fkey`(`teacherId`),
    INDEX `LatenessDeductionConfig_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LatenessRecord` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `classDate` DATETIME(3) NOT NULL,
    `scheduledTime` DATETIME(3) NOT NULL,
    `actualStartTime` DATETIME(3) NOT NULL,
    `latenessMinutes` INTEGER NOT NULL,
    `deductionApplied` DOUBLE NOT NULL,
    `deductionTier` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `LatenessRecord_admin_fkey`(`adminId`),
    INDEX `LatenessRecord_teacherId_fkey`(`teacherId`),
    INDEX `LatenessRecord_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Notification` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `type` VARCHAR(50) NOT NULL,
    `isRead` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `userId` VARCHAR(255) NOT NULL,
    `userRole` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wpos_wpdatatable_29` (
    `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    `studentid` INTEGER NOT NULL,
    `studentname` VARCHAR(255) NOT NULL,
    `paymentdate` DATETIME(0) NOT NULL,
    `transactionid` VARCHAR(255) NOT NULL,
    `paidamount` DECIMAL(10, 0) NOT NULL,
    `reason` VARCHAR(2000) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',

    PRIMARY KEY (`wdt_ID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermissionReason` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reason` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PermissionRequest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `requestedDate` VARCHAR(191) NOT NULL,
    `timeSlots` VARCHAR(191) NOT NULL,
    `reasonCategory` VARCHAR(191) NOT NULL,
    `reasonDetails` VARCHAR(191) NOT NULL,
    `supportingDocs` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL,
    `reviewedAt` DATETIME(3) NULL,
    `reviewNotes` VARCHAR(191) NULL,
    `lateReviewReason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `PermissionRequest_admin_fkey`(`adminId`),
    INDEX `PermissionRequest_teacherId_fkey`(`teacherId`),
    INDEX `PermissionRequest_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityAssessment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(191) NOT NULL,
    `weekStart` DATETIME(3) NOT NULL,
    `supervisorFeedback` TEXT NOT NULL,
    `examinerRating` DOUBLE NULL,
    `studentPassRate` DOUBLE NULL,
    `overallQuality` VARCHAR(191) NOT NULL,
    `managerApproved` BOOLEAN NOT NULL,
    `managerOverride` BOOLEAN NOT NULL,
    `overrideNotes` VARCHAR(191) NULL,
    `bonusAwarded` DOUBLE NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `QualityAssessment_admin_fkey`(`adminId`),
    INDEX `QualityAssessment_teacherId_fkey`(`teacherId`),
    INDEX `QualityAssessment_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `QualityDescription` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `adminId` VARCHAR(191) NULL,
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `QualityDescription_admin_fkey`(`adminId`),
    INDEX `QualityDescription_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `setting` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Setting_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `registralearningsconfig` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `registralearningsconfig_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TeacherSalaryPayment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teacherId` VARCHAR(255) NOT NULL,
    `period` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `adminId` VARCHAR(191) NULL,
    `totalSalary` DOUBLE NOT NULL,
    `latenessDeduction` DOUBLE NOT NULL,
    `absenceDeduction` DOUBLE NOT NULL,
    `bonuses` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `wpos_wpdatatable_28Wdt_ID` INTEGER NULL,

    INDEX `TeacherSalaryPayment_admin_fkey`(`adminId`),
    INDEX `TeacherSalaryPayment_teacherId_period_idx`(`teacherId`, `period`),
    INDEX `TeacherSalaryPayment_wpos_wpdatatable_28Wdt_ID_fkey`(`wpos_wpdatatable_28Wdt_ID`),
    UNIQUE INDEX `TeacherSalaryPayment_teacherId_period_key`(`teacherId`, `period`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testAppointment` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `date` DATETIME(3) NULL,

    INDEX `testAppointment_testId_fkey`(`testId`),
    UNIQUE INDEX `testAppointment_studentId_testId_key`(`studentId`, `testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testquestion` (
    `id` VARCHAR(191) NOT NULL,
    `testId` VARCHAR(191) NOT NULL,
    `question` VARCHAR(191) NOT NULL,
    `odd` INTEGER NOT NULL,

    INDEX `testQuestion_testId_fkey`(`testId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `testResult` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `result` INTEGER NOT NULL,

    INDEX `testResult_questionId_idx`(`questionId`),
    INDEX `testResult_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `coursePackage` (
    `id` VARCHAR(191) NOT NULL,
    `name` TEXT NOT NULL,
    `description` TEXT NULL,
    `examDurationMinutes` INTEGER NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `ustazId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subjectPackage` (
    `id` VARCHAR(191) NOT NULL,
    `kidpackage` BOOLEAN NULL DEFAULT false,
    `packageType` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course` (
    `id` VARCHAR(191) NOT NULL,
    `title` TEXT NOT NULL,
    `description` TEXT NULL,
    `imageUrl` TEXT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `timeLimit` INTEGER NULL,
    `timeUnit` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `course_packageId_idx`(`packageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chapter` (
    `id` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `videoUrl` TEXT NULL,
    `position` INTEGER NOT NULL,
    `isPublished` BOOLEAN NOT NULL DEFAULT false,
    `courseId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chapter_courseId_idx`(`courseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `question` (
    `id` VARCHAR(191) NOT NULL,
    `chapterId` VARCHAR(191) NULL,
    `packageId` VARCHAR(191) NULL,
    `question` TEXT NOT NULL,

    INDEX `question_chapterId_idx`(`chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questionOption` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `option` VARCHAR(191) NOT NULL,

    INDEX `questionOption_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `questionAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `answerId` VARCHAR(191) NOT NULL,

    INDEX `questionAnswer_answerId_idx`(`answerId`),
    INDEX `questionAnswer_questionId_idx`(`questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentQuiz` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `questionId` VARCHAR(191) NOT NULL,
    `isFinalExam` BOOLEAN NOT NULL DEFAULT false,
    `takenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `studentQuiz_questionId_idx`(`questionId`),
    INDEX `studentQuiz_studentId_idx`(`studentId`),
    UNIQUE INDEX `studentQuiz_studentId_questionId_key`(`studentId`, `questionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentQuizAnswer` (
    `id` VARCHAR(191) NOT NULL,
    `studentQuizId` VARCHAR(191) NOT NULL,
    `selectedOptionId` VARCHAR(191) NOT NULL,

    INDEX `studentQuizAnswer_selectedOptionId_idx`(`selectedOptionId`),
    INDEX `studentQuizAnswer_studentQuizId_idx`(`studentQuizId`),
    UNIQUE INDEX `studentQuizAnswer_studentQuizId_selectedOptionId_key`(`studentQuizId`, `selectedOptionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentProgress` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `chapterId` VARCHAR(191) NOT NULL,
    `isStarted` BOOLEAN NOT NULL DEFAULT true,
    `isCompleted` BOOLEAN NOT NULL DEFAULT false,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `studentProgress_chapterId_idx`(`chapterId`),
    INDEX `studentProgress_studentId_idx`(`studentId`),
    UNIQUE INDEX `studentProgress_studentId_chapterId_key`(`studentId`, `chapterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `finalExamResult` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `updationProhibited` BOOLEAN NOT NULL DEFAULT false,
    `startingTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `endingTime` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tarbiaAttendance` (
    `id` VARCHAR(191) NOT NULL,
    `studId` INTEGER NOT NULL,
    `packageId` VARCHAR(191) NOT NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageSalary` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageName` VARCHAR(191) NOT NULL,
    `salaryPerStudent` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PackageSalary_packageName_key`(`packageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentStatus` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentStatus_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentPackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentPackage_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StudentSubject` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StudentSubject_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PackageDeduction` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `packageName` VARCHAR(191) NOT NULL,
    `latenessBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 30.00,
    `absenceBaseAmount` DECIMAL(10, 2) NOT NULL DEFAULT 25.00,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PackageDeduction_packageName_key`(`packageName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `studentdaypackage` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `studentdaypackage_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `teacherRating` (
    `id` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_PackageHistory` (
    `A` VARCHAR(191) NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_PackageHistory_AB_unique`(`A`, `B`),
    INDEX `_PackageHistory_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `admin_chat_id_key` ON `admin`(`chat_id`);

-- CreateIndex
CREATE INDEX `months_table_studentid_idx` ON `months_table`(`studentid`);

-- CreateIndex
CREATE INDEX `idx_student_attendance_progress` ON `student_attendance_progress`(`student_id`);

-- CreateIndex
CREATE INDEX `idx_ustaz` ON `wpos_wpdatatable_23`(`ustaz`);

-- CreateIndex
CREATE INDEX `wpos_wpdatatable_23_u_control_fkey` ON `wpos_wpdatatable_23`(`u_control`);

-- CreateIndex
CREATE INDEX `wpos_wpdatatable_24_control_fkey` ON `wpos_wpdatatable_24`(`control`);

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_24` ADD CONSTRAINT `wpos_wpdatatable_24_control_fkey` FOREIGN KEY (`control`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_youtubeSubject_fkey` FOREIGN KEY (`youtubeSubject`) REFERENCES `coursePackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_u_control_fkey` FOREIGN KEY (`u_control`) REFERENCES `wpos_wpdatatable_28`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_ustaz_fkey` FOREIGN KEY (`ustaz`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_ustaz_occupied_times` ADD CONSTRAINT `wpos_ustaz_occupied_times_ustaz_id_fkey` FOREIGN KEY (`ustaz_id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_change_history` ADD CONSTRAINT `teacher_change_history_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_change_history` ADD CONSTRAINT `teacher_change_history_old_teacher_id_fkey` FOREIGN KEY (`old_teacher_id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacher_change_history` ADD CONSTRAINT `teacher_change_history_new_teacher_id_fkey` FOREIGN KEY (`new_teacher_id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `months_table` ADD CONSTRAINT `month_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_attendance_progress` ADD CONSTRAINT `student_attendance_progress_student_id_fkey` FOREIGN KEY (`student_id`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_zoom_links` ADD CONSTRAINT `wpos_zoom_links_ustazid_fkey` FOREIGN KEY (`ustazid`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_permissionRequestId_fkey` FOREIGN KEY (`permissionRequestId`) REFERENCES `PermissionRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AbsenceRecord` ADD CONSTRAINT `AbsenceRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceSubmissionLog` ADD CONSTRAINT `AttendanceSubmissionLog_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusRecord` ADD CONSTRAINT `BonusRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusRecord` ADD CONSTRAINT `BonusRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BonusRecord` ADD CONSTRAINT `BonusRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ControllerEarningsConfig` ADD CONSTRAINT `ControllerEarningsConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ControllerEarningsConfig` ADD CONSTRAINT `ControllerEarningsConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeductionBonusConfig` ADD CONSTRAINT `DeductionBonusConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeductionBonusConfig` ADD CONSTRAINT `DeductionBonusConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessDeductionConfig` ADD CONSTRAINT `LatenessDeductionConfig_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessRecord` ADD CONSTRAINT `LatenessRecord_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessRecord` ADD CONSTRAINT `LatenessRecord_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LatenessRecord` ADD CONSTRAINT `LatenessRecord_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_29` ADD CONSTRAINT `Payment_studentid_fkey` FOREIGN KEY (`studentid`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionRequest` ADD CONSTRAINT `PermissionRequest_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionRequest` ADD CONSTRAINT `PermissionRequest_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PermissionRequest` ADD CONSTRAINT `PermissionRequest_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityAssessment` ADD CONSTRAINT `QualityAssessment_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityAssessment` ADD CONSTRAINT `QualityAssessment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityAssessment` ADD CONSTRAINT `QualityAssessment_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityDescription` ADD CONSTRAINT `QualityDescription_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `QualityDescription` ADD CONSTRAINT `QualityDescription_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_admin_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TeacherSalaryPayment` ADD CONSTRAINT `TeacherSalaryPayment_wpos_wpdatatable_28Wdt_ID_fkey` FOREIGN KEY (`wpos_wpdatatable_28Wdt_ID`) REFERENCES `wpos_wpdatatable_28`(`wdt_ID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testAppointment` ADD CONSTRAINT `testAppointment_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testAppointment` ADD CONSTRAINT `testAppointment_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testquestion` ADD CONSTRAINT `testQuestion_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `test`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testResult` ADD CONSTRAINT `testResult_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `testquestion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `testResult` ADD CONSTRAINT `testResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coursePackage` ADD CONSTRAINT `coursePackage_id_fkey` FOREIGN KEY (`id`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subjectPackage` ADD CONSTRAINT `subjectPackage_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course` ADD CONSTRAINT `course_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chapter` ADD CONSTRAINT `chapter_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question` ADD CONSTRAINT `question_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `question` ADD CONSTRAINT `question_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questionOption` ADD CONSTRAINT `questionOption_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questionAnswer` ADD CONSTRAINT `questionAnswer_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `questionAnswer` ADD CONSTRAINT `questionAnswer_answerId_fkey` FOREIGN KEY (`answerId`) REFERENCES `questionOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuiz` ADD CONSTRAINT `studentQuiz_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuiz` ADD CONSTRAINT `studentQuiz_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuizAnswer` ADD CONSTRAINT `studentQuizAnswer_studentQuizId_fkey` FOREIGN KEY (`studentQuizId`) REFERENCES `studentQuiz`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentQuizAnswer` ADD CONSTRAINT `studentQuizAnswer_selectedOptionId_fkey` FOREIGN KEY (`selectedOptionId`) REFERENCES `questionOption`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentProgress` ADD CONSTRAINT `studentProgress_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `studentProgress` ADD CONSTRAINT `studentProgress_chapterId_fkey` FOREIGN KEY (`chapterId`) REFERENCES `chapter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finalExamResult` ADD CONSTRAINT `finalExamResult_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `finalExamResult` ADD CONSTRAINT `finalExamResult_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarbiaAttendance` ADD CONSTRAINT `tarbiaAttendance_studId_fkey` FOREIGN KEY (`studId`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tarbiaAttendance` ADD CONSTRAINT `tarbiaAttendance_packageId_fkey` FOREIGN KEY (`packageId`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teacherRating` ADD CONSTRAINT `teacherRating_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `wpos_wpdatatable_24`(`ustazid`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PackageHistory` ADD CONSTRAINT `_PackageHistory_A_fkey` FOREIGN KEY (`A`) REFERENCES `coursePackage`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_PackageHistory` ADD CONSTRAINT `_PackageHistory_B_fkey` FOREIGN KEY (`B`) REFERENCES `wpos_wpdatatable_23`(`wdt_ID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- RedefineIndex
CREATE INDEX `idx_admin` ON `deduction_waivers`(`adminId`);
DROP INDEX `deduction_waivers_adminId_idx` ON `deduction_waivers`;

-- RedefineIndex
CREATE INDEX `idx_type_date` ON `deduction_waivers`(`deductionType`, `deductionDate`);
DROP INDEX `deduction_waivers_deductionType_deductionDate_idx` ON `deduction_waivers`;

-- RedefineIndex
CREATE INDEX `idx_teacher_date` ON `deduction_waivers`(`teacherId`, `deductionDate`);
DROP INDEX `deduction_waivers_teacherId_deductionDate_idx` ON `deduction_waivers`;

-- RedefineIndex
CREATE INDEX `idx_date` ON `student_attendance_progress`(`date`);
DROP INDEX `student_attendance_progress_date_idx` ON `student_attendance_progress`;

-- RedefineIndex
CREATE INDEX `idx_ustazid` ON `wpos_wpdatatable_24`(`ustazid`);
DROP INDEX `wpos_wpdatatable_24_ustazid_idx` ON `wpos_wpdatatable_24`;
