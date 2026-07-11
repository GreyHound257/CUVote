import React from "react";
import Link from "next/link";
import { Routes } from "@/constants";

export function Sidebar() {
  return (
    <aside className="w-64 border-r h-full p-4 hidden md:block">
      <nav className="flex flex-col gap-2">
        <Link href={Routes.DASHBOARD} className="p-2 hover:bg-accent rounded-md">
          Dashboard
        </Link>
        <Link href={Routes.DEPARTMENTS} className="p-2 hover:bg-accent rounded-md">
          Departments
        </Link>
        <Link href={Routes.ELECTIONS} className="p-2 hover:bg-accent rounded-md">
          Elections
        </Link>
        <Link href={Routes.STUDENTS} className="p-2 hover:bg-accent rounded-md">
          Students
        </Link>
      </nav>
    </aside>
  );
}
