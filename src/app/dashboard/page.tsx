import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { DeptAdminDashboard } from "@/components/dashboard/dept-admin-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export const metadata = {
  title: "Dashboard - CUVote",
  description: "CUVote interactive dashboard.",
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { role } = session.user;

  return (
    <div className="w-full">
      {role === "SUPER_ADMIN" && <SuperAdminDashboard />}
      {role === "DEPARTMENT_ADMIN" && <DeptAdminDashboard />}
      {role === "STUDENT" && <StudentDashboard />}
    </div>
  );
}
