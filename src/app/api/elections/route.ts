import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";
import { ElectionService } from "@/services/electionService";
import { createElectionSchema } from "@/validation/election";
import { successResponse, errorResponse } from "@/utils/api";
import { logger } from "@/utils/logger";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (session.user.role === Role.STUDENT) {
      return errorResponse("Forbidden", 403);
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;

    const filters: { search?: string; status?: string; departmentId?: string; page?: number; limit?: number } = {
      search,
      status,
      page,
      limit,
    };

    if (session.user.role === Role.DEPARTMENT_ADMIN) {
      if (!session.user.departmentId) {
        return errorResponse("Department admin has no assigned department", 400);
      }
      filters.departmentId = session.user.departmentId;
    }

    // --- Temporary Debug Snippet ---
    console.log("--- DEBUG: GET /api/elections ---");
    console.log("Session User Role:", session.user.role);
    console.log("Filter - Status:", filters.status);
    console.log("Filter - Department ID:", filters.departmentId);
    console.log("---------------------------------");

    // Put this right below where you set up the 'filters' object:
    console.log("=== ELECTION FETCH DEBUG ===");
    console.log("User Role:", session.user.role);
    console.log("User Dept ID:", session.user.departmentId);
    console.log("Incoming Filters:", filters);
    console.log("============================")

    const result = await ElectionService.getElections(filters);
    return successResponse(result);
  } catch (error) {
    logger.error("GET Elections Error:", error);
    return errorResponse("Internal server error", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return errorResponse("Unauthorized", 401);

    if (session.user.role === Role.STUDENT) {
      return errorResponse("Forbidden", 403);
    }

    const body = await req.json();
    const parsed = createElectionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.issues[0].message, 400);
    }

    if (
      session.user.role === Role.DEPARTMENT_ADMIN &&
      parsed.data.departmentId !== session.user.departmentId
    ) {
      return errorResponse("Forbidden: Cannot create elections for other departments", 403);
    }

    const election = await ElectionService.createElection(parsed.data, session.user.id);
    return successResponse(election, 201);
  } catch (error) {
    logger.error("POST Election Error:", error);
    if (error && typeof error === "object" && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2028") {
        return errorResponse(
          "Database is busy right now. Please wait a moment and try creating the election again.",
          503
        );
      }
      if (code === "P2003") {
        return errorResponse(
          "Selected department is invalid. Please choose an existing department.",
          400
        );
      }
    }
    return errorResponse(error instanceof Error ? error.message : "Internal server error", 400);
  }
}
