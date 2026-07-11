import { DepartmentForm } from "@/components/departments/DepartmentForm";

export default function NewDepartmentPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Department</h1>
        <p className="text-muted-foreground">Add a new department to the system.</p>
      </div>
      <DepartmentForm />
    </div>
  );
}
