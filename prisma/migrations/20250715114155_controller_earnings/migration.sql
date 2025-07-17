-- CreateTable
CREATE TABLE `ControllerEarning` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `controllerUsername` VARCHAR(191) NOT NULL,
    `studentId` INTEGER NOT NULL,
    `paymentId` INTEGER NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `paidOut` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
