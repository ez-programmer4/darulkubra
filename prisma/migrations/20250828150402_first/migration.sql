/*
  Warnings:

  - The primary key for the `wpos_wpdatatable_29` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `wpos_wpdatatable_29` table. All the data in the column will be lost.
  - You are about to alter the column `paidamount` on the `wpos_wpdatatable_29` table. The data in that column could be lost. The data in that column will be cast from `Decimal(12,2)` to `Decimal(10,0)`.
  - A unique constraint covering the columns `[chat_id]` on the table `admin` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `chat_id` to the `admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `wdt_ID` to the `wpos_wpdatatable_29` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `Payment_paymentdate_idx` ON `wpos_wpdatatable_29`;

-- DropIndex
DROP INDEX `Payment_transactionid_key` ON `wpos_wpdatatable_29`;

-- AlterTable
ALTER TABLE `admin` ADD COLUMN `chat_id` VARCHAR(191) NOT NULL,
    ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `wpos_wpdatatable_23` ADD COLUMN `coursePackageId` VARCHAR(191) NULL,
    ADD COLUMN `isKid` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `youtubeSubject` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `wpos_wpdatatable_29` DROP PRIMARY KEY,
    DROP COLUMN `id`,
    ADD COLUMN `wdt_ID` INTEGER NOT NULL AUTO_INCREMENT,
    MODIFY `transactionid` VARCHAR(255) NOT NULL,
    MODIFY `paidamount` DECIMAL(10, 0) NOT NULL,
    MODIFY `reason` VARCHAR(2000) NOT NULL,
    ADD PRIMARY KEY (`wdt_ID`);

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

-- CreateIndex
CREATE UNIQUE INDEX `admin_chat_id_key` ON `admin`(`chat_id`);

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_youtubeSubject_fkey` FOREIGN KEY (`youtubeSubject`) REFERENCES `coursePackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wpos_wpdatatable_23` ADD CONSTRAINT `wpos_wpdatatable_23_coursePackageId_fkey` FOREIGN KEY (`coursePackageId`) REFERENCES `coursePackage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

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
