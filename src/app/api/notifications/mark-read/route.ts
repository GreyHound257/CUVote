import { logger } from "@/utils/logger";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { successResponse, errorResponse } from "@/utils/api";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return errorResponse("Unauthorized", 401);
    }

    const body = await req.json();
    const { notificationIds } = body; // Optional array of IDs. If omitted, mark all as read.

    if (notificationIds && Array.isArray(notificationIds)) {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          id: { in: notificationIds },
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    } else {
      // Mark all as read
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    }

    return successResponse({ message: "Notifications marked as read" });
  } catch (error: unknown) {
    logger.error("Notifications PATCH Error:", error);
    return errorResponse("Internal server error", 500);
  }
}
