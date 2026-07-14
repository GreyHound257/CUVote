import { logger } from "@/utils/logger";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ResultService } from "@/services/resultService";
import { ElectionStatus } from "@prisma/client";
import { enforceRateLimit } from "@/lib/request";

function jsonToCsv(items: Record<string, string | number>[]) {
  if (items.length === 0) return "";

  const headers = Object.keys(items[0]);
  const csvRows = [headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(",")];

  for (const item of items) {
    const values = headers.map((header) => {
      const val = item[header];
      const strVal = val === null || val === undefined ? "" : String(val);
      return `"${strVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

export async function GET(request: Request) {
  try {
    const limited = enforceRateLimit(request, "EXPORT");
    if (limited) return limited;

    const session = await auth();
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const departmentId = searchParams.get("departmentId");
    const statusFilter = searchParams.get("status");
    const searchFilter = searchParams.get("search");

    if (session.user.role === "STUDENT") {
      return new NextResponse("Forbidden", { status: 403 });
    }

    if (session.user.role === "DEPARTMENT_ADMIN") {
      if (departmentId && departmentId !== session.user.departmentId) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const targetDeptId =
      session.user.role === "DEPARTMENT_ADMIN"
        ? session.user.departmentId
        : departmentId;

    let data: Record<string, string | number>[] = [];
    const filename = `report_${type}_${new Date().toISOString().split("T")[0]}.csv`;

    if (type === "students") {
      const students = await prisma.student.findMany({
        where: {
          ...(targetDeptId ? { departmentId: targetDeptId } : {}),
          ...(statusFilter ? { status: statusFilter as "ACTIVE" | "INACTIVE" } : {}),
          ...(searchFilter
            ? {
                OR: [
                  { matricNo: { contains: searchFilter, mode: "insensitive" } },
                  { fullName: { contains: searchFilter, mode: "insensitive" } },
                  { email: { contains: searchFilter, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { department: true },
      });
      data = students.map((s) => ({
        Matric_No: s.matricNo,
        Full_Name: s.fullName,
        Email: s.email,
        Level: s.level,
        Status: s.status,
        Eligible: s.isEligible ? "Yes" : "No",
        Department: s.department.code,
      }));
    } else if (type === "elections") {
      const elections = await prisma.election.findMany({
        where: {
          ...(targetDeptId ? { departmentId: targetDeptId } : {}),
          ...(statusFilter ? { status: statusFilter as ElectionStatus } : {}),
          ...(searchFilter
            ? { title: { contains: searchFilter, mode: "insensitive" } }
            : {}),
        },
        include: {
          department: true,
          _count: { select: { voteRecords: true, positions: true, candidates: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      data = await Promise.all(
        elections.map(async (e) => {
          const eligibleVoters = await ResultService.countEligibleVoters(
            e.departmentId,
            e.eligibilityLevels
          );
          const turnoutRate =
            eligibleVoters > 0
              ? `${((e._count.voteRecords / eligibleVoters) * 100).toFixed(2)}%`
              : "0%";

          return {
            Title: e.title,
            Status: e.status,
            Department: e.department.code,
            Positions: e._count.positions,
            Candidates: e._count.candidates,
            Votes_Cast: e._count.voteRecords,
            Eligible_Voters: eligibleVoters,
            Turnout_Rate: turnoutRate,
            Start_Time: e.startTime?.toISOString() || "",
            End_Time: e.endTime?.toISOString() || "",
          };
        })
      );
    } else if (type === "election-results") {
      const publishedStatuses: ElectionStatus[] = [
        ElectionStatus.PUBLISHED_RESULTS,
        ElectionStatus.ARCHIVED,
      ];

      const elections = await prisma.election.findMany({
        where: {
          ...(targetDeptId ? { departmentId: targetDeptId } : {}),
          status: statusFilter
            ? (statusFilter as ElectionStatus)
            : { in: publishedStatuses },
          ...(searchFilter
            ? { title: { contains: searchFilter, mode: "insensitive" } }
            : {}),
        },
        include: {
          department: true,
          positions: {
            include: {
              candidates: { include: { student: true } },
              electionResults: { orderBy: { voteCount: "desc" } },
            },
          },
          _count: { select: { voteRecords: true } },
        },
        orderBy: { updatedAt: "desc" },
      });

      for (const election of elections) {
        const eligibleVoters = await ResultService.countEligibleVoters(
          election.departmentId,
          election.eligibilityLevels
        );
        const turnoutRate =
          eligibleVoters > 0
            ? ((election._count.voteRecords / eligibleVoters) * 100).toFixed(2)
            : "0";

        for (const position of election.positions) {
          const positionTotal = position.electionResults.reduce(
            (sum, r) => sum + r.voteCount,
            0
          );
          const topVotes = position.electionResults[0]?.voteCount ?? 0;

          for (const result of position.electionResults) {
            const candidate = position.candidates.find(
              (c) => c.id === result.candidateId
            );
            const percentage =
              positionTotal > 0
                ? ((result.voteCount / positionTotal) * 100).toFixed(2)
                : "0";

            data.push({
              Election: election.title,
              Department: election.department.code,
              Status: election.status,
              Position: position.title,
              Candidate: candidate?.student.fullName ?? "Unknown",
              Votes: result.voteCount,
              Percentage: `${percentage}%`,
              Winner:
                topVotes > 0 && result.voteCount === topVotes ? "Yes" : "No",
              Tie: result.isTie ? "Yes" : "No",
              Turnout: election._count.voteRecords,
              Eligible_Voters: eligibleVoters,
              Turnout_Rate: `${turnoutRate}%`,
            });
          }
        }
      }
    } else if (type === "audit" && session.user.role === "SUPER_ADMIN") {
      const logs = await prisma.auditLog.findMany({
        include: { user: true },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });
      data = logs.map((l) => ({
        Timestamp: l.createdAt.toISOString(),
        User: l.user?.email || "System",
        Action: l.action,
        Entity: l.entity || "",
        Entity_ID: l.entityId || "",
        IP_Address: l.ipAddress || "",
      }));
    } else {
      return new NextResponse("Invalid report type or insufficient permissions", {
        status: 400,
      });
    }

    const csvData = jsonToCsv(data);
    const metadata = `"Report Type: ${type}","Generated Date: ${new Date().toISOString()}","Generated By: ${session.user.email}","Filters Applied: Status=${statusFilter || "All"}, Search=${searchFilter || "None"}"\n\n`;

    return new NextResponse(metadata + csvData, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error("Export Error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
