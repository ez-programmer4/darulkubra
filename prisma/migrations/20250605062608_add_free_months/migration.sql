-- DropIndex
DROP INDEX `months_table_studentid_month_key` ON `months_table`;

-- AlterTable
ALTER TABLE `months_table` ADD COLUMN `free_month_reason` VARCHAR(100) NULL,
    ADD COLUMN `is_free_month` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `student_referrals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referrer_id` INTEGER UNSIGNED NOT NULL,
    `referred_id` INTEGER UNSIGNED NOT NULL,
    `referral_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
    `free_months_earned` INTEGER NOT NULL DEFAULT 0,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `student_referrals` ADD CONSTRAINT `student_referrals_referrer_id_fkey` FOREIGN KEY (`referrer_id`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_referrals` ADD CONSTRAINT `student_referrals_referred_id_fkey` FOREIGN KEY (`referred_id`) REFERENCES `wpos_wpdatatable_23`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
