/**
 * Authentication service.
 * MOCK: stores a demo session in localStorage.
 * LIVE: intended to wrap Amazon Cognito User Pools (e.g. via `amazon-cognito-identity-js`
 * or AWS Amplify Auth) using the public pool/client IDs from apiConfig — no secrets.
 */
import type { User } from "@/types";
import { isMock, mockDelay } from "./config";

const SESSION_KEY = "panelmorrow.session";

export interface Session {
  user: User;
  idToken: string;
  expiresAt: number;
}

function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

function notLive(): never {
  throw new Error("Live Cognito auth is not configured in this build. Set VITE_API_MODE=mock or wire Cognito in services/api/auth.ts.");
}

export const authService = {
  current: readSession,

  async getIdToken() {
    return readSession()?.idToken ?? null;
  },

  async signIn(email: string, _password: string): Promise<Session> {
    if (!isMock) notLive();
    await mockDelay(500);
    const name = email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const session: Session = {
      user: { id: "usr_demo", name: name || "Demo User", email, company: "Brightline Solar O&M", role: "Maintenance Manager" },
      idToken: "mock-jwt." + btoa(email),
      expiresAt: Date.now() + 8 * 3600_000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async register(input: { name: string; email: string; company: string; password: string }): Promise<Session> {
    if (!isMock) notLive();
    await mockDelay(700);
    const session: Session = {
      user: { id: "usr_" + Date.now().toString(36), name: input.name, email: input.email, company: input.company, role: "Admin" },
      idToken: "mock-jwt." + btoa(input.email),
      expiresAt: Date.now() + 8 * 3600_000,
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async requestPasswordReset(_email: string) {
    if (!isMock) notLive();
    await mockDelay(500);
  },

  signOut() {
    localStorage.removeItem(SESSION_KEY);
  },
};
