import { LoadingState } from "@/components/shared/LoadingState";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SuperAdminDashboard } from "@/components/dashboard/super-admin-dashboard";
import { Suspense } from "react";
import { DeptAdminDashboard } from "@/components/dashboard/dept-admin-dashboard";
import { StudentDashboard } from "@/components/dashboard/student-dashboard";

export const metadata = {
  title: "Dashboard - CUVote",
  description: "CUVote interactive dashboard.",
};

import { AppPage } from "@/components/shared/AppPage";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const { role } = session.user;

  return (
    <AppPage>
      {role === "SUPER_ADMIN" && <Suspense fallback={<LoadingState message="Loading dashboard..." />}><SuperAdminDashboard /></Suspense>}
      {role === "DEPARTMENT_ADMIN" && <Suspense fallback={<LoadingState message="Loading dashboard..." />}><DeptAdminDashboard /></Suspense>}
      {role === "STUDENT" && <Suspense fallback={<LoadingState message="Loading dashboard..." />}><StudentDashboard /></Suspense>}
    </AppPage>
  );
}
