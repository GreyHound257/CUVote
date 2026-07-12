"use client";
import { logger } from "@/utils/logger";

import React, { useState, useEffect } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
} from "@tanstack/react-table";
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
import { Student } from "@prisma/client";
import { StudentImportDialog } from "@/components/students/StudentImportDialog";
import { StudentDetailsDialog } from "@/components/students/StudentDetailsDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Student Directory</h1>
        <StudentImportDialog onImportSuccess={() => fetchStudents()} />
      </div>

      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Search by name or matric no..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

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
      </div>

      <div className="rounded-md border">
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
                    <TableCell colSpan={columns.length} className="h-24 text-center">Loading...</TableCell>
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
                  No students found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <span className="text-sm text-gray-500 mr-4">Page {page} of {totalPages || 1}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>

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
    </div>
  );
}
