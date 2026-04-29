"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, isApiError } from "@/lib/api";
import { getAccessToken, setSession } from "@/lib/session";

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; full_name: string };
  organizations: { id: string; name: string; slug: string; role: string }[];
};

const showDemoHint =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_SHOW_DEMO_LOGIN_HINT === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetBanner, setResetBanner] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const ok = new URLSearchParams(window.location.search).get("reset") === "ok";
    setResetBanner(ok);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const orgId = data.organizations[0]?.id;
      if (!orgId) {
        setError("No organization membership. Complete registration first.");
        return;
      }
      setSession({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        organizationId: orgId,
        email: data.user.email,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(isApiError(err) ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>CreditMind AI</CardTitle>
          <CardDescription>Sign in to your workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="login-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="login-password" className="text-sm font-medium">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {resetBanner && (
              <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                Password reset successful. Sign in with your new password.
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            No account yet?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Register
            </Link>
          </p>
          {showDemoHint && (
            <div className="text-xs text-muted-foreground mt-3 rounded-md bg-muted/50 p-2">
              <p>
                <strong className="text-foreground">Demo:</strong>{" "}
                <code className="text-[11px] break-all">
                  admin@demo.creditmind.example.com / DemoBank!2026
                </code>
              </p>
              <details className="mt-2">
                <summary className="cursor-pointer font-medium text-foreground/80">Note</summary>
                <p className="mt-1.5 text-[11px] pl-1 border-l-2 border-border">
                  The backend may create a demo account on startup. Run the full seed script only when you need sample
                  data — it can remove users created via self-registration.
                </p>
              </details>
            </div>
          )}
          <p className="text-sm mt-4 text-center">
            <Link href="/" className="text-primary hover:underline">
              Back to home
            </Link>
          </p>
          <AuthLegalFooter />
        </CardContent>
      </Card>
    </div>
  );
}

function AuthLegalFooter() {
  const privacy = process.env.NEXT_PUBLIC_LEGAL_PRIVACY_URL;
  const terms = process.env.NEXT_PUBLIC_LEGAL_TERMS_URL;
  const support = process.env.NEXT_PUBLIC_SUPPORT_URL;
  if (!privacy && !terms && !support) return null;
  return (
    <nav className="mt-6 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground border-t border-border pt-4">
      {privacy && (
        <a href={privacy} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Privacy
        </a>
      )}
      {terms && (
        <a href={terms} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Terms
        </a>
      )}
      {support && (
        <a href={support} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
          Support
        </a>
      )}
    </nav>
  );
}
