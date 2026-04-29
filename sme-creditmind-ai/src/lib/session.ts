const TOKEN_KEY = "creditmind_access_token";
const REFRESH_KEY = "creditmind_refresh_token";
const ORG_KEY = "creditmind_org_id";
const USER_EMAIL_KEY = "creditmind_user_email";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getOrganizationId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ORG_KEY);
}

export function setSession(params: {
  accessToken: string;
  refreshToken: string;
  organizationId: string;
  email?: string;
}): void {
  localStorage.setItem(TOKEN_KEY, params.accessToken);
  localStorage.setItem(REFRESH_KEY, params.refreshToken);
  localStorage.setItem(ORG_KEY, params.organizationId);
  if (params.email) localStorage.setItem(USER_EMAIL_KEY, params.email);
}

export function setOrganizationId(organizationId: string): void {
  localStorage.setItem(ORG_KEY, organizationId);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(ORG_KEY);
  localStorage.removeItem(USER_EMAIL_KEY);
}

export function getUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(USER_EMAIL_KEY);
}
