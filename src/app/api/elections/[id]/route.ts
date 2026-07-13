import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ElectionService } from "@/services/electionService";
import { updateElectionStatusSchema } from "@/validation/election";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    const { id } = await params;
    const election = await ElectionService.getElectionById(id);

    if (
      session.user.role === Role.DEPARTMENT_ADMIN &&
      election.departmentId !== session.user.departmentId
    ) {
      return errorResponse("Forbidden", 403);
    }

    if (session.user.role === Role.STUDENT) {
      return errorResponse("Forbidden", 403);
    }

    return successResponse(election);
  } catch (error) {
    logger.error("GET Election Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 404);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (session.user.role === Role.STUDENT) {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = updateElectionStatusSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    const election = await ElectionService.updateElectionStatus(
      id,
      parsed.data.status,
      session.user.id,
      session.user.role as Role,
      session.user.departmentId
    );

    return successResponse(election);
  } catch (error) {
    logger.error("PATCH Election Error:", error);
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 400);
  }
}
