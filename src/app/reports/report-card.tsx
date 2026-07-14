"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { FileDown, Download } from "lucide-react";
import { SearchFilter } from "@/components/dashboard/search-filter";
import { useState } from "react";

type ReportDefinition = {
  id: string;
  title: string;
  description: string;
  filterOptions?: { label: string; value: string }[];
  placeholder?: string;
};

export function ReportCard({ report }: { report: ReportDefinition }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleSearch = (term: string) => setSearchTerm(term);
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === "status") setStatusFilter(value);
  };

  const exportUrl = `/api/reports/export?type=${report.id}${
    searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""
  }${statusFilter ? `&status=${encodeURIComponent(statusFilter)}` : ""}`;

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileDown className="h-5 w-5" />
          {report.title}
        </CardTitle>
        <CardDescription>{report.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.id !== "audit" && report.filterOptions && (
          <SearchFilter
            onSearch={handleSearch}
            onFilterChange={handleFilterChange}
            placeholder={report.placeholder ?? `Search ${report.id}…`}
            filterOptions={report.filterOptions}
          />
        )}
        <LinkButton
          href={exportUrl}
          target="_blank"
          className="w-full rounded-full"
          linkClassName="flex items-center justify-center"
        >
          <Download className="mr-2 h-4 w-4" /> Download CSV
        </LinkButton>
      </CardContent>
    </Card>
  );
}
