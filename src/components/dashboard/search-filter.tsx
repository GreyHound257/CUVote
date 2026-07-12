"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useState } from "react";

interface SearchFilterProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filterType: string, value: string) => void;
  filterOptions?: { label: string; value: string }[];
  placeholder?: string;
}

export function SearchFilter({ onSearch, onFilterChange, filterOptions = [], placeholder = "Search..." }: SearchFilterProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onSearch(val);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 items-center w-full print:hidden">
      <div className="relative flex-1 w-full">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleSearch}
          className="pl-8"
        />
      </div>

      {filterOptions.length > 0 && (
        <div className="w-full sm:w-[200px]">
          <Select onValueChange={(val: string | null) => { if (val) onFilterChange("status", val === "ALL" ? "" : val); }}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              {filterOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
