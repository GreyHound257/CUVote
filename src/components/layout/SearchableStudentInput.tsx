"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Student {
  id: string;
  fullName: string;
  matricNo: string;
  departmentId: string;
}

interface SearchableStudentInputProps {
  value: string | null;
  onChange: (value: string | null) => void;
  departmentId?: string | null; // Used to filter students eligible for the selected election
  disabled?: boolean;
}

export function SearchableStudentInput({
  value,
  onChange,
  departmentId,
  disabled = false,
}: SearchableStudentInputProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null);

  React.useEffect(() => {
    let mounted = true;
    
    const fetchStudents = async () => {
      setLoading(true);
      try {
        const url = new URL("/api/students", window.location.origin);
        url.searchParams.set("limit", "50"); // Fetch a reasonable chunk
        
        if (debouncedQuery) {
          url.searchParams.set("search", debouncedQuery);
        }
        if (departmentId) {
          url.searchParams.set("departmentId", departmentId);
        }

        const res = await fetch(url.toString());
        const json = await res.json();
        
        if (mounted) {
          // Handling the paginated API response shape dynamically
          const rawData = json.data?.data || json.data;
          setStudents(Array.isArray(rawData) ? rawData : []);
        }
      } catch (error) {
        console.error("Failed to fetch students", error);
        if (mounted) setStudents([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    // Only fetch if the dropdown is open or we are initializing
    if (open || debouncedQuery) {
      fetchStudents();
    }

    return () => {
      mounted = false;
    };
  }, [debouncedQuery, departmentId, open]);

  // Keep internal selected student state synced with the external value prop
  React.useEffect(() => {
    if (value && !selectedStudent) {
       const student = students.find(s => s.id === value);
       if (student) setSelectedStudent(student);
    }
    if (!value) {
         setSelectedStudent(null);
    }
  }, [value, students, selectedStudent]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between rounded-full"
            disabled={disabled}
          >
            {selectedStudent
              ? `${selectedStudent.fullName} (${selectedStudent.matricNo})`
              : "Search by name or matric no..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        }
      />
      
      {/* width matches the trigger button exactly */}
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 rounded-xl z-[250]">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type to search students..." 
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                "No students found."
              )}
            </CommandEmpty>
            <CommandGroup>
              {students.map((student) => (
                <CommandItem
                  key={student.id}
                  value={student.id}
                  onSelect={() => {
                    onChange(student.id);
                    setSelectedStudent(student);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === student.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {student.fullName} ({student.matricNo})
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}