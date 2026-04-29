"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiFetch, isApiError } from "@/lib/api";
import { getAccessToken, setSession } from "@/lib/session";

type RegisterResponse = {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string; full_name: string };
  organizations: { id: string; name: string; slug: string; role: string }[];
};

export default function RegisterPage() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [organizationSlug, setOrganizationSlug] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getAccessToken()) {
      router.replace("/dashboard");
    }
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          organization_name: organizationName.trim(),
          organization_slug: organizationSlug.trim().toLowerCase(),
          email: email.trim(),
          password,
          full_name: fullName.trim() || undefined,
        }),
      });
      const orgId = data.organizations[0]?.id;
      if (!orgId) {
        setError("Registration succeeded but no organization was returned.");
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
      setError(isApiError(err) ? err.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>CreditMind AI</CardTitle>
          <CardDescription>Create your workspace and admin account.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reg-org-name" className="text-sm font-medium">
                Organization name
              </label>
              <Input
                id="reg-org-name"
                type="text"
                autoComplete="organization"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                required
                minLength={2}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-org-slug" className="text-sm font-medium">
                Organization URL slug
              </label>
              <Input
                id="reg-org-slug"
                type="text"
                value={organizationSlug}
                onChange={(e) =>
                  setOrganizationSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                  )
                }
                required
                minLength={2}
                pattern="[a-z0-9-]+"
                title="Lowercase letters, numbers, and hyphens only"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters, numbers, and hyphens only (e.g. shinhan-hcm).
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-full-name" className="text-sm font-medium">
                Full name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="reg-full-name"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="reg-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="reg-confirm" className="text-sm font-medium">
                Confirm password
              </label>
              <Input
                id="reg-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? "Creating…" : "Create account"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-medium">
              Sign in
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
