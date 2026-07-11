"use client";

import React from "react";
import Link from "next/link";
import { Routes } from "@/constants";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <div className="font-bold text-xl">
        <Link href={Routes.HOME}>CUVote</Link>
      </div>
      <nav className="flex items-center gap-4">
        <Link href={Routes.DASHBOARD} className="text-sm font-medium hover:underline">
          Dashboard
        </Link>
        {session?.user ? (
          <>
            <Link href={Routes.PROFILE} className="text-sm font-medium hover:underline">
              Profile
            </Link>
            <Button variant="ghost" size="sm" onClick={() => signOut()}>
              Logout
            </Button>
          </>
        ) : (
          <Link href={Routes.LOGIN} className="text-sm font-medium hover:underline">
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
