"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileDown, Download } from "lucide-react";
import Link from "next/link";
import { SearchFilter } from "@/components/dashboard/search-filter";
import { useState } from "react";

export function ReportCard({ report }: { report: any }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleSearch = (term: string) => setSearchTerm(term);
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === "status") setStatusFilter(value);
  };

  const exportUrl = `/api/reports/export?type=${report.id}${searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ''}${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ''}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          {report.title}
        </CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.id !== "audit" && (
          <SearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            placeholder={`Search ${report.id}...`}
            filterOptions={[
                { label: "Active", value: "ACTIVE" },
                { label: "Inactive/Closed", value: "INACTIVE" }
            ]}
          />
        )}
        <Button className="w-full" render={<Link href={exportUrl} target="_blank" className="flex items-center" />}>
          <span className="flex items-center">
            <Download className="mr-2 h-4 w-4" /> Download CSV
          </span>
        </Button>
      </CardContent>
    </Card>
  );
}
