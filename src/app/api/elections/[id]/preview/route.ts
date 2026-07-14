import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ElectionService } from "@/services/electionService";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";

/**
 * Admin ballot preview — approved candidates only, no voting.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);
    if (session.user.role === Role.STUDENT) return errorResponse("Forbidden", 403);

    const { id } = await params;
    const preview = await ElectionService.getBallotPreview(id);

    if (
      session.user.role === Role.DEPARTMENT_ADMIN &&
      preview.election.department.id !== session.user.departmentId
    ) {
      return errorResponse("Forbidden", 403);
    }

    return successResponse(preview);
  } catch (error: unknown) {
    logger.error("GET /api/elections/[id]/preview", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      404
    );
  }
}
