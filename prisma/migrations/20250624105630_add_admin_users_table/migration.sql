-- CreateTable
CREATE TABLE `admin` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `username` VARCHAR(120) NOT NULL,
    `password` VARCHAR(120) NOT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'admin',

    UNIQUE INDEX `admin_name_key`(`name`),
    UNIQUE INDEX `admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
