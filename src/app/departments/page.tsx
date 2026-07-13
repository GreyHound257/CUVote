"use client";

import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";


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
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ArrowUpDown } from "lucide-react";
import { Department } from "@prisma/client";
import { useRouter } from "next/navigation";

export default function DepartmentsPage() {
  const router = useRouter();
  const [data, setData] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        toast.error("Failed to fetch departments: " + json.error);
      }
    } catch (error) {
      toast.error("An error occurred while fetching data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to soft delete this department?")) return;

    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        toast.success("Department soft deleted.");
        fetchDepartments();
      } else {
        toast.error(json.error);
      }
    } catch (error) {
      toast.error("Failed to delete department.");
    }
  };

  const handleAction = async (id: string, action: string) => {
    try {
      const res = await fetch(`/api/departments/${id}?action=${action}`, { method: "PATCH" });
      const json = await res.json();
      if (json.success) {
        toast.success(`Department ${action}d successfully.`);
        fetchDepartments();
      } else {
        toast.error(json.error);
      }
    } catch (error) {
      toast.error(`Failed to ${action} department.`);
    }
  };

  const columns: ColumnDef<Department>[] = [
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
      accessorKey: "code",
      header: "Code",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "ACTIVE" ? "default" : status === "INACTIVE" ? "secondary" : "destructive"}>
            {status}
          </Badge>
        );
      }
    },
    {
      accessorKey: "createdAt",
      header: "Date Created",
      cell: ({ row }) => format(new Date(row.getValue("createdAt")), "MMM dd, yyyy"),
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const dept = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" className="h-8 w-8 p-0" render={
                <div>
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              } />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => router.push(`${Routes.DEPARTMENTS}/${dept.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`${Routes.DEPARTMENTS}/${dept.id}/edit`)}>
                Edit
              </DropdownMenuItem>
              {dept.status !== "DELETED" && (
                <DropdownMenuItem onClick={() => handleDelete(dept.id)}>
                  Soft Delete
                </DropdownMenuItem>
              )}
              {dept.status === "ACTIVE" && (
                 <DropdownMenuItem onClick={() => handleAction(dept.id, "deactivate")}>
                  Deactivate
               </DropdownMenuItem>
              )}
              {dept.status === "INACTIVE" && (
                 <DropdownMenuItem onClick={() => handleAction(dept.id, "activate")}>
                  Activate
               </DropdownMenuItem>
              )}
               {dept.status === "DELETED" && (
                 <DropdownMenuItem onClick={() => handleAction(dept.id, "restore")}>
                  Restore
               </DropdownMenuItem>
              )}
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

  if (loading) {
    return <LoadingState message="Loading departments..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Departments</h1>
        <Button onClick={() => router.push(`${Routes.DEPARTMENTS}/new`)}>Create Department</Button>
      </div>

      <div className="flex items-center py-4">
        <Input
          placeholder="Filter by name..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
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
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
