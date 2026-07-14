"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { Loader2 } from "lucide-react";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DataTableToolbar } from "@/components/shared/DataTableToolbar";
import { DataTablePagination } from "@/components/shared/DataTablePagination";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  SortingState,
  getSortedRowModel,
  ColumnFiltersState,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Routes } from "@/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { User, Role } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const resetPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmNewPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match",
  path: ["confirmNewPassword"],
});

export default function UsersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        const errorMsg = "Failed to fetch users: " + json.error;
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred while fetching data.";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/users/${id}?action=${action}`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        toast.success(`User ${action}d successfully.`);
        fetchUsers();
      } else {
        toast.error(json.error);
      }
    } catch (error) {
      toast.error(`Failed to ${action} user.`);
    }
  };

  const handlePasswordReset = async (data: z.infer<typeof resetPasswordSchema>) => {
    if (!userToReset) return;
    try {
      const res = await fetch(`/api/users/${userToReset.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          forceReset: true,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Password reset successfully.");
        setUserToReset(null);
        reset();
      } else {
        toast.error(json.error);
      }
    } catch (error) {
      toast.error("Failed to reset password.");
    }
  };

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "ACTIVE" ? "default" : status === "SUSPENDED" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const user = row.original;
        const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
        const isSelf = session?.user?.id === user.id;

return (
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" />}>
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push(`/users/${user.id}`)}>
                  View Details
                </DropdownMenuItem>
                {isSuperAdmin && (
                  <DropdownMenuItem onClick={() => router.push(`/users/${user.id}/edit`)}>
                    Edit
                  </DropdownMenuItem>
                )}
                {isSuperAdmin && !isSelf && user.role !== "SUPER_ADMIN" && (
                  <>
                    <DropdownMenuItem onClick={() => setUserToReset(user)}>
                      Reset Password
                    </DropdownMenuItem>
                    {user.status === "ACTIVE" && (
                      <DropdownMenuItem onClick={() => handleAction(user.id, "suspend")}>
                        Suspend
                      </DropdownMenuItem>
                    )}
                    {user.status === "SUSPENDED" && (
                      <DropdownMenuItem onClick={() => handleAction(user.id, "activate")}>
                        Activate
                      </DropdownMenuItem>
                    )}
                    {user.status !== "DELETED" && (
                      <DropdownMenuItem onClick={() => setUserToDelete(user)} className="text-destructive">
                        Delete
                      </DropdownMenuItem>
                    )}
                  </>
                )}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  if (error) {
    return (
      <AppPage>
        <ErrorState
          title="Failed to load users"
          message={error}
          onRetry={fetchUsers}
        />
      </AppPage>
    );
  }

  if (loading) {
    return <LoadingState message="Loading users..." />;
  }

  return (
    <AppPage>
      <PageHeader
        title="Users"
        description="Manage platform users and their permissions."
        action={
          session?.user?.role === "SUPER_ADMIN" && (
            <Button onClick={() => router.push(`/users/new`)} className="rounded-full">Create User</Button>
          )
        }
      />

      <DataTableToolbar
        search={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
        onSearchChange={(val) => table.getColumn("email")?.setFilterValue(val)}
        searchPlaceholder="Filter by email..."
      />

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        currentPage={table.getState().pagination.pageIndex + 1}
        totalPages={Math.ceil(data.length / table.getState().pagination.pageSize)}
        onPageChange={(page) => table.setPageIndex(page - 1)}
      />

      <Dialog open={!!userToReset} onOpenChange={(open) => !open && setUserToReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {userToReset?.name} ({userToReset?.email}).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(handlePasswordReset)} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <Input {...register("newPassword")} type="password" />
              {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm New Password</label>
              <Input {...register("confirmNewPassword")} type="password" />
              {errors.confirmNewPassword && <p className="text-sm text-destructive">{errors.confirmNewPassword.message}</p>}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setUserToReset(null)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {userToDelete?.name}? This action cannot be undone.
              Consider suspending the user instead if they might return.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUserToDelete(null)}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={() => {
              if (userToDelete) {
                handleAction(userToDelete.id, "delete");
                setUserToDelete(null);
              }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppPage>
  );
}
