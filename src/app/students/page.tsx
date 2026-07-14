"use client";

import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataTableToolbar } from "@/components/shared/DataTableToolbar";
import { DataTablePagination } from "@/components/shared/DataTablePagination";

import { logger } from "@/utils/logger";

import React, { useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
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
import { Student } from "@prisma/client";
import { StudentImportDialog } from "@/components/students/StudentImportDialog";
import { StudentDetailsDialog } from "@/components/students/StudentDetailsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppPage } from "@/components/shared/AppPage";
import { PageHeader } from "@/components/shared/PageHeader";

type StudentWithDept = Student & { department: { name: string, code: string } };

export default function StudentsPage() {
  const [data, setData] = useState<StudentWithDept[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("all");
  const [isEligible, setIsEligible] = useState<string>("all");

  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  // Selected for dialog
  const [selectedStudent, setSelectedStudent] = useState<StudentWithDept | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [page, search, departmentId, isEligible]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const json = await res.json();
      if (json.success) {
        setDepartments(json.data);
      }
    } catch (e) {
      logger.error(e instanceof Error ? e.message : String(e));
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      if (search) params.append("search", search);
      if (departmentId !== "all") params.append("departmentId", departmentId);
      if (isEligible !== "all") params.append("isEligible", isEligible);

      const res = await fetch(`/api/students?${params.toString()}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error);

      setData(json.data);
      setTotalPages(json.meta.totalPages);
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const columns: ColumnDef<StudentWithDept>[] = [
    {
      accessorKey: "matricNo",
      header: "Matric No",
    },
    {
      accessorKey: "fullName",
      header: "Full Name",
    },
    {
      accessorKey: "department.code",
      header: "Department",
    },
    {
      accessorKey: "level",
      header: "Level",
    },
    {
      accessorKey: "isEligible",
      header: "Eligibility",
      cell: ({ row }) => {
        const eligible = row.getValue("isEligible") as boolean;
        return (
          <Badge variant={eligible ? "default" : "destructive"} className={eligible ? "bg-green-600 hover:bg-green-700" : ""}>
            {eligible ? "Eligible" : "Ineligible"}
          </Badge>
        );
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string;
        return (
          <Badge variant={status === "ACTIVE" ? "outline" : "secondary"}>
            {status}
          </Badge>
        );
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
         <Button variant="ghost" size="sm" onClick={() => {
             setSelectedStudent(row.original);
             setDetailsOpen(true);
         }}>
             View
         </Button>
      )
    }
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    // We are handling pagination server-side, so we just use the data passed
  });

  return (
    <AppPage>
      <PageHeader
        title="Student Directory"
        description="Manage student records and voting eligibility. Imported students get login accounts automatically; they set passwords via Login → Set your password."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={provisioning}
              onClick={async () => {
                setProvisioning(true);
                try {
                  const res = await fetch("/api/students/provision-accounts", { method: "POST" });
                  const json = await res.json();
                  if (!json.success) {
                    toast.error(json.error || "Could not provision accounts");
                    return;
                  }
                  const { linked, total, errors } = json.data as {
                    linked: number;
                    total: number;
                    errors: string[];
                  };
                  if (linked > 0) {
                    toast.success(`Linked login accounts for ${linked} of ${total} student(s).`);
                  } else if (total === 0) {
                    toast.success("All students already have login accounts.");
                  } else {
                    toast.error(`Could not link accounts (${errors?.[0] || "see errors"}).`);
                  }
                  fetchStudents();
                } catch {
                  toast.error("Failed to provision login accounts.");
                } finally {
                  setProvisioning(false);
                }
              }}
            >
              {provisioning ? "Linking accounts…" : "Link login accounts"}
            </Button>
            <StudentImportDialog onImportSuccess={() => fetchStudents()} />
          </div>
        }
      />

      <DataTableToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or matric no..."
      >
        <Select value={departmentId} onValueChange={(val) => setDepartmentId(val || "all")}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={isEligible} onValueChange={(val) => setIsEligible(val || "all")}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Eligibility" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="true">Eligible</SelectItem>
            <SelectItem value="false">Ineligible</SelectItem>
          </SelectContent>
        </Select>
      </DataTableToolbar>

      <div className="overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
                <TableRow>
                    <TableCell colSpan={columns.length}><LoadingState message="Loading students..." /></TableCell>
                </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                  <EmptyState title="No students found" description="There are no students matching your search criteria." />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <StudentDetailsDialog
        student={selectedStudent}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={() => {
            fetchStudents(); // Refresh the list
            // Also update the selected student in the dialog
            if (selectedStudent) {
               fetch(`/api/students?search=${selectedStudent.matricNo}`)
                 .then(res => res.json())
                 .then(json => {
                     if (json.data && json.data.length > 0) {
                         setSelectedStudent(json.data[0]);
                     }
                 });
            }
        }}
      />
    </AppPage>
  );
}
