/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { authService, type Session } from "@/services/api/auth";

interface AuthCtx {
  session: Session | null;
  signIn: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; company: string; password: string }) => Promise<void>;
  signOut: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(() => authService.current());
  const value: AuthCtx = {
    session,
    signIn: async (e, p) => setSession(await authService.signIn(e, p)),
    register: async (i) => setSession(await authService.register(i)),
    signOut: () => {
      authService.signOut();
      setSession(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const loc = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return <>{children}</>;
}
