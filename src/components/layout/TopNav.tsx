import React from "react";
import Link from "next/link";
import { Routes } from "@/constants";

export function TopNav() {
  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="font-bold text-xl">
        <Link href={Routes.HOME}>CUVote</Link>
      </div>
      <nav className="flex gap-4">
        <Link href={Routes.DASHBOARD} className="text-sm font-medium hover:underline">
          Dashboard
        </Link>
        <Link href={Routes.LOGIN} className="text-sm font-medium hover:underline">
          Login
        </Link>
      </nav>
    </header>
  );
}
