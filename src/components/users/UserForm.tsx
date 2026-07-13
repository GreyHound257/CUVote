"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, CreateUserInput } from "@/validation/user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Role } from "@prisma/client";

interface UserFormProps {
  initialData?: Record<string, unknown>;
  isEdit?: boolean;
}

export function UserForm({ initialData, isEdit }: UserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
     fetch("/api/departments")
       .then(res => res.json())
       .then(json => {
          if (json.success) setDepartments(json.data);
       });
  }, []);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: (initialData?.name as string) || "",
      email: (initialData?.email as string) || "",
      role: (initialData?.role as Role) || "STUDENT",
      status: (initialData?.status as "ACTIVE" | "SUSPENDED" | "DELETED") || "ACTIVE",
      departmentId: (initialData?.departmentId as string) || null,
    }
  });

  const selectedRole = watch("role");

  const onSubmit = async (data: CreateUserInput) => {
    setIsSubmitting(true);
    try {
      const url = isEdit && initialData?.id ? `/api/users/${initialData.id as string}` : "/api/users";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success) {
        toast.success(
          isEdit
            ? "User updated successfully"
            : "User created. If Student role, they must set a password via Login → Set your password."
        );
        router.push("/users");
      } else {
        toast.error(json.error || "An error occurred");
      }
    } catch (error) {
      toast.error("Network error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input {...register("name")} placeholder="John Doe" />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <Input {...register("email")} type="email" placeholder="john.doe@covenant.edu" />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Role</label>
        <Select
          value={watch("role") ?? null}
          onValueChange={(val: Role | null) => {
            if (!val) return;
            setValue("role", val);
            if (val === "SUPER_ADMIN") setValue("departmentId", null);
          }}
        >
          <SelectTrigger className="w-full rounded-full">
            <SelectValue placeholder="Select role">
              {{
                SUPER_ADMIN: "Super Admin",
                DEPARTMENT_ADMIN: "Department Admin",
                STUDENT: "Student",
              }[watch("role") as Role] ?? null}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="z-[200]">
            <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
            <SelectItem value="DEPARTMENT_ADMIN">Department Admin</SelectItem>
            <SelectItem value="STUDENT">Student</SelectItem>
          </SelectContent>
        </Select>
        {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
      </div>

      {selectedRole !== "SUPER_ADMIN" && (
         <div className="space-y-2">
           <label className="text-sm font-medium">Department</label>
           <Select
             // Always controlled: use null, never undefined
             value={watch("departmentId") ?? null}
             onValueChange={(val: string | null) => setValue("departmentId", val || null)}
           >
             <SelectTrigger className="w-full rounded-full">
               <SelectValue placeholder="Select department">
                 {departments.find((d) => d.id === watch("departmentId"))?.name ?? null}
               </SelectValue>
             </SelectTrigger>
             <SelectContent className="z-[200]">
                {departments.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">No departments available</div>
                ) : (
                  departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))
                )}
             </SelectContent>
           </Select>
           {errors.departmentId && <p className="text-sm text-destructive">{errors.departmentId.message}</p>}
         </div>
      )}

      {isEdit && (
         <div className="space-y-2">
           <label className="text-sm font-medium">Status</label>
           <Select
             value={watch("status") ?? null}
             onValueChange={(val: "ACTIVE" | "SUSPENDED" | "DELETED" | null) => val && setValue("status", val)}
           >
             <SelectTrigger className="w-full rounded-full">
               <SelectValue placeholder="Select status">
                 {watch("status") === "SUSPENDED" ? "Suspended" : "Active"}
               </SelectValue>
             </SelectTrigger>
             <SelectContent className="z-[200]">
               <SelectItem value="ACTIVE">Active</SelectItem>
               <SelectItem value="SUSPENDED">Suspended</SelectItem>
             </SelectContent>
           </Select>
           {errors.status && <p className="text-sm text-destructive">{errors.status.message}</p>}
         </div>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isEdit ? "Update User" : "Create User"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
