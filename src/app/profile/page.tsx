"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, ChangePasswordInput } from "@/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProfilePage() {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data: ChangePasswordInput) => {
    if (!session?.user?.id) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/users/${session.user.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (json.success) {
        toast.success("Password updated successfully");
        reset();
      } else {
        toast.error(json.error);
      }
    } catch (e) {
      toast.error("Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.user) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and password.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your current profile details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <div>
                <span className="text-sm font-medium text-muted-foreground">Name</span>
                <p className="text-lg">{session.user.name}</p>
             </div>
             <div>
                <span className="text-sm font-medium text-muted-foreground">Email</span>
                <p className="text-lg">{session.user.email}</p>
             </div>
             <div>
                <span className="text-sm font-medium text-muted-foreground">Role</span>
                <p className="text-lg">{session.user.role}</p>
             </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your password to stay secure.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Current Password</label>
                <Input {...register("currentPassword")} type="password" />
                {errors.currentPassword && <p className="text-sm text-destructive">{errors.currentPassword.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input {...register("newPassword")} type="password" />
                {errors.newPassword && <p className="text-sm text-destructive">{errors.newPassword.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Confirm New Password</label>
                <Input {...register("confirmNewPassword")} type="password" />
                {errors.confirmNewPassword && <p className="text-sm text-destructive">{errors.confirmNewPassword.message}</p>}
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
