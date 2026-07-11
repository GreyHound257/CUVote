"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { setupWizardSchema, SetupWizardInput } from "@/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Routes } from "@/constants";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/setup")
      .then(res => res.json())
      .then(data => {
        if (data.data?.isSetupComplete) {
          router.push(Routes.LOGIN);
        } else {
          setLoading(false);
        }
      });
  }, [router]);

  const { register, handleSubmit, formState: { errors } } = useForm<SetupWizardInput>({
    resolver: zodResolver(setupWizardSchema),
  });

  const onSubmit = async (data: SetupWizardInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Setup complete. Please login.");
        router.push(Routes.LOGIN);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("An error occurred during setup.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return null;

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <div className="mx-auto w-full max-w-md space-y-6 bg-card p-8 shadow rounded-lg border">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Welcome to CUVote</h1>
          <p className="text-muted-foreground">Setup the initial Super Administrator account.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input {...register("name")} placeholder="John Doe" />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input {...register("email")} type="email" placeholder="admin@covenant.edu" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Password</label>
            <Input {...register("password")} type="password" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm Password</label>
            <Input {...register("confirmPassword")} type="password" />
            {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Complete Setup"}
          </Button>
        </form>
      </div>
    </div>
  );
}
