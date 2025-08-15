import { prisma } from "./prisma";

export interface NotificationData {
  userId: string;
  userRole: string;
  type: string;
  title: string;
  message: string;
}

export async function createNotification(data: NotificationData) {
  try {
    const notification = await prisma.notification.create({
      data: {
        ...data,
        isRead: false,
        createdAt: new Date(),
      },
    });
    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
}

export async function createAdminNotification(
  title: string,
  message: string,
  type: string = "system"
) {
  try {
    // Get all admins
    const admins = await prisma.admin.findMany({
      select: { id: true },
    });

    // Create notifications for all admins
    const notifications = await Promise.all(
      admins.map(admin =>
        createNotification({
          userId: admin.id,
          userRole: "admin",
          type,
          title,
          message,
        })
      )
    );

    return notifications;
  } catch (error) {
    console.error("Failed to create admin notifications:", error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: number) {
  try {
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
    return notification;
  } catch (error) {
    console.error("Failed to mark notification as read:", error);
    throw error;
  }
}

export async function getUnreadNotificationCount(userId: string) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
    return count;
  } catch (error) {
    console.error("Failed to get unread notification count:", error);
    return 0;
  }
}