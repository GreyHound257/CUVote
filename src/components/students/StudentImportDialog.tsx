"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export function StudentImportDialog({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[] } | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const res = await fetch("/api/students/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvText: text }),
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Import failed");
      } else {
        setResult(json);
        toast.success(
          `Import complete! Imported: ${json.imported}, Skipped: ${json.skipped}. New students can set passwords at the login page.`
        );
        if (json.imported > 0) {
            onImportSuccess();
        }
      }
    } catch (err) {
      toast.error("An error occurred during import.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
        setOpen(val);
        if (!val) {
            setFile(null);
            setResult(null);
        }
    }}>
      <DialogTrigger render={<Button variant="outline" className="rounded-full" />}>
        <UploadCloud className="w-4 h-4 mr-2" /> Bulk Import
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Students</DialogTitle>
          <DialogDescription>
            Upload a CSV with columns: matricNo, fullName, email, departmentCode, level.
            Each imported student automatically gets a login account (password set via{" "}
            <span className="font-medium">Set your password</span> on the login page).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!result ? (
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
          ) : (
            <div className="space-y-2 text-sm">
                <div className="font-medium text-green-600">Successfully Imported: {result.imported}</div>
                <div className="font-medium text-amber-600">Skipped/Duplicates: {result.skipped}</div>
                {result.errors.length > 0 && (
                    <div className="mt-2 text-red-600 max-h-32 overflow-y-auto border border-red-200 p-2 rounded">
                        <p className="font-bold mb-1">Errors:</p>
                        {result.errors.map((e, i) => <div key={i}>{e}</div>)}
                    </div>
                )}
            </div>
          )}
        </div>

        <DialogFooter>
          {!result ? (
             <Button onClick={handleImport} disabled={!file || loading}>
                {loading ? "Importing..." : "Import CSV"}
             </Button>
          ) : (
             <Button onClick={() => setOpen(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
