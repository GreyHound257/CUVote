"use client";

import { Loader2 } from "lucide-react";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { onboardSchema, OnboardInput } from "@/validation/onboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Routes } from "@/constants";

export default function OnboardPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<OnboardInput>({
    resolver: zodResolver(onboardSchema),
  });

  const onSubmit = async (data: OnboardInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();

      if (json.success) {
        toast.success("Password set successfully. Please login.");
        router.push(Routes.LOGIN);
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("An error occurred during onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/40">
      <div className="mx-auto w-full max-w-sm space-y-6 bg-card p-8 shadow rounded-lg border">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Set Password</h1>
          <p className="text-muted-foreground">Complete your account setup by setting a password.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input {...register("email")} type="email" placeholder="email@covenant.edu" />
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
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Set Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
