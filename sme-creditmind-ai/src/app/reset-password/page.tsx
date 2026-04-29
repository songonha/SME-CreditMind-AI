"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, isApiError } from "@/lib/api";
import { getAccessToken } from "@/lib/session";

type ResetResponse = { message: string };

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token") ?? "";

  const [token, setToken] = useState(tokenFromUrl);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    setToken(tokenFromUrl);
  }, [tokenFromUrl]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!token.trim()) {
      setError("Missing reset token. Open the link from your email again.");
      return;
    }
    setLoading(true);
    try {
      await apiFetch<ResetResponse>("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token: token.trim(), new_password: password }),
      });
      router.push("/login?reset=ok");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>New password</CardTitle>
        <CardDescription>Choose a strong password for your account.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="reset-token" className="text-sm font-medium">
              Reset token
            </label>
            <Input
              id="reset-token"
              type="text"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              className="font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground">Pre-filled when you open the link from email.</p>
          </div>
          <div className="space-y-2">
            <label htmlFor="reset-password" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="reset-confirm" className="text-sm font-medium">
              Confirm password
            </label>
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Updating…" : "Update password"}
          </Button>
          <p className="text-sm text-center">
            <Link href="/login" className="text-primary hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Suspense
        fallback={
          <Card className="w-full max-w-md p-8">
            <p className="text-sm text-muted-foreground">Loading…</p>
          </Card>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
