"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch, isApiError } from "@/lib/api";

type ProviderRuntimeConfig = {
  provider: string;
  baseUrl: string;
  model: string;
  hasApiKey: boolean;
  organizationConfigured: boolean;
  projectConfigured: boolean;
};

type ProviderHealthItem = {
  provider: string;
  configured: boolean;
  healthy: boolean;
  latencyMs?: number | null;
  statusCode?: number | null;
  model?: string | null;
  message: string;
};

type ProviderConfigResponse = { providers: ProviderRuntimeConfig[] };
type ProviderHealthResponse = { providers: ProviderHealthItem[] };
type ChangePasswordResponse = { message: string };

export default function SettingsPage() {
  const [providers, setProviders] = useState<ProviderRuntimeConfig[]>([]);
  const [health, setHealth] = useState<ProviderHealthItem[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const loadProviderConfig = async () => {
    setLoadingConfig(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch<ProviderConfigResponse>("/api/ai/providers/config");
      setProviders(res.providers);
      if (res.providers.length === 0) {
        setInfoMessage("No AI provider configured on backend yet.");
      } else {
        setInfoMessage("Model runtime config loaded from backend environment.");
      }
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : "Failed to load provider runtime config.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadProviderHealth = async () => {
    setLoadingHealth(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch<ProviderHealthResponse>("/api/ai/providers/health");
      setHealth(res.providers);
    } catch (error) {
      setErrorMessage(isApiError(error) ? error.message : "Failed to run provider health checks.");
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadProviderConfig();
    loadProviderHealth();
  }, []);

  const submitChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordInfo(null);
    setPasswordError(null);
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await apiFetch<ChangePasswordResponse>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setPasswordInfo(res.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      setPasswordError(isApiError(err) ? err.message : "Could not update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure integrations and inspect backend AI runtime health.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitChangePassword} className="space-y-4 max-w-md">
            <div className="space-y-2">
              <label htmlFor="settings-current-pw" className="text-sm font-medium">
                Current password
              </label>
              <Input
                id="settings-current-pw"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-new-pw" className="text-sm font-medium">
                New password
              </label>
              <Input
                id="settings-new-pw"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="settings-confirm-pw" className="text-sm font-medium">
                Confirm new password
              </label>
              <Input
                id="settings-confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            {passwordInfo ? <p className="text-sm text-emerald-600">{passwordInfo}</p> : null}
            {passwordError ? <p className="text-sm text-destructive">{passwordError}</p> : null}
            <Button type="submit" size="sm" disabled={passwordLoading}>
              {passwordLoading ? "Updating…" : "Update password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI Provider Runtime (Backend)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            API keys are loaded only from backend environment variables. This UI does not store
            secrets in browser localStorage.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadProviderConfig} disabled={loadingConfig}>
              {loadingConfig ? "Loading..." : "Refresh Runtime Config"}
            </Button>
            <Button variant="outline" size="sm" onClick={loadProviderHealth} disabled={loadingHealth}>
              {loadingHealth ? "Checking..." : "Run Health Check"}
            </Button>
          </div>
          {providers.length > 0 ? (
            <div className="space-y-3">
              {providers.map((provider) => (
                <div key={provider.provider} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium uppercase">{provider.provider}</span>
                    <Badge variant={provider.hasApiKey ? "default" : "destructive"}>
                      {provider.hasApiKey ? "API key configured" : "API key missing"}
                    </Badge>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div>
                      <label className="text-xs text-muted-foreground">Model</label>
                      <Input value={provider.model} readOnly className="mt-1.5" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Base URL</label>
                      <Input value={provider.baseUrl} readOnly className="mt-1.5" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      Org: {provider.organizationConfigured ? "configured" : "not set"}
                    </Badge>
                    <Badge variant="outline">
                      Project: {provider.projectConfigured ? "configured" : "not set"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Provider Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {health.length > 0 ? (
            health.map((item) => (
              <div key={item.provider} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium uppercase">{item.provider}</span>
                  <Badge variant={item.healthy ? "default" : "destructive"}>
                    {item.healthy ? "Healthy" : "Unhealthy"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{item.message}</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">Configured: {item.configured ? "yes" : "no"}</Badge>
                  {item.model ? <Badge variant="outline">Model: {item.model}</Badge> : null}
                  {item.statusCode ? <Badge variant="outline">HTTP: {item.statusCode}</Badge> : null}
                  {typeof item.latencyMs === "number" ? (
                    <Badge variant="outline">Latency: {item.latencyMs} ms</Badge>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No health result yet.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scoring Thresholds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { grade: "A", range: "800-1000", action: "Auto-Approve" },
            { grade: "B", range: "650-799", action: "Auto-Approve with conditions" },
            { grade: "C", range: "500-649", action: "Manual Review" },
            { grade: "D", range: "350-499", action: "Enhanced Due Diligence" },
            { grade: "E", range: "0-349", action: "Decline" },
          ].map((t) => (
            <div key={t.grade} className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-bold w-8 justify-center">{t.grade}</Badge>
                <span className="text-sm font-mono">{t.range}</span>
              </div>
              <span className="text-sm text-muted-foreground">{t.action}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">POS Integrations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["VNPay", "Momo", "ZaloPay", "Bank POS"].map((provider) => (
            <div key={provider} className="flex items-center justify-between rounded-lg border p-3">
              <span className="text-sm font-medium">{provider}</span>
              <Button variant="outline" size="sm">Configure</Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-2">
        {infoMessage ? <p className="text-sm text-emerald-600">{infoMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-destructive">{errorMessage}</p> : null}
      </div>
    </div>
  );
}
