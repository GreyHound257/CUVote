"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema, ForgotPasswordInput } from "@/validation/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Routes } from "@/constants";
import Link from "next/link";
import { Loader2, KeyRound } from "lucide-react";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    setIsSubmitting(true);
    setDevResetUrl(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        toast.error(json.error || "Request failed");
        return;
      }
      setSubmitted(true);
      toast.success(json.data?.message || "Check your email for reset instructions.");
      if (json.data?.devResetUrl) {
        setDevResetUrl(json.data.devResetUrl);
      }
    } catch {
      toast.error("Request failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-muted/30 p-4">
      <Card className="relative w-full max-w-md border-border/50 bg-card/80 shadow-lg backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Forgot password</CardTitle>
            <CardDescription>
              Enter your account email and we&apos;ll send a reset link if it exists.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4 text-center text-sm text-muted-foreground">
              <p>
                If an account exists for that email, password reset instructions have been sent.
                The link expires in one hour.
              </p>
              {devResetUrl && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-left text-foreground">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Development only
                  </p>
                  <p className="mb-2 text-xs text-muted-foreground">
                    SMTP is not configured — use this local reset link:
                  </p>
                  <Link
                    href={devResetUrl}
                    className="break-all text-sm font-medium text-primary hover:underline"
                  >
                    {devResetUrl}
                  </Link>
                </div>
              )}
              <Link href={Routes.LOGIN} className="inline-block font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="email@covenant.edu"
                  className="rounded-full focus-visible:ring-primary/20"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full rounded-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>
          )}

          {!submitted && (
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Remembered it?{" "}
              <Link href={Routes.LOGIN} className="font-medium text-primary hover:underline">
                Sign in
              </Link>
              {" · "}
              <Link href={Routes.ONBOARDING} className="font-medium text-primary hover:underline">
                New user setup
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
