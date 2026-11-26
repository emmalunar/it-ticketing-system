"use client";

import { useEffect, useState } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { LoginScreen } from "@/components/auth/LoginScreen";
import { OfficerDashboard } from "@/components/officer/OfficerDashboard";
import { RequesterDashboard } from "@/components/requester/RequesterDashboard";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  ApiRequestError,
  getCsrfCookie,
  getCurrentUser,
  login,
  logout,
  type ApiUser,
} from "@/lib/api";
import DashboardSkeleton from "./DashboardSkeleton";

export default function Home() {
  return (
    <ToastProvider>
      <ServiceDeskApp />
    </ToastProvider>
  );
}

function ServiceDeskApp() {
  const toast = useToast();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) setUser(currentUser);
      } catch (caught) {
        if (cancelled) return;
        if (!(caught instanceof ApiRequestError) || ![401, 403].includes(caught.status)) {
          setError(caught instanceof Error ? caught.message : "Unable to connect to the service desk.");
        }
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLogin(username: string, password: string) {
    setAuthenticating(true);
    setError(null);
    try {
      if (!document.cookie.split("; ").some((cookie) => cookie.startsWith("csrftoken="))) {
        await getCsrfCookie();
      }
      const result = await login(username, password);
      setUser(result.user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to sign in.");
    } finally {
      setAuthenticating(false);
    }
  }

  async function handleLogout() {
    try {
      await logout();
      setUser(null);
      setError(null);
    } catch (caught) {
      toast.error(
        "Unable to sign out",
        caught instanceof Error ? caught.message : "Please try again in a moment.",
      );
    }
  }

  if (checkingSession) return <DashboardSkeleton />;

  if (!user) {
    return (
      <LoginScreen
        authenticating={authenticating}
        error={error}
        onSubmit={handleLogin}
      />
    );
  }

  const signOut = () => void handleLogout();

  if (user.role === "ADMIN") return <AdminDashboard onLogout={signOut} user={user} />;
  if (user.role === "AGENT") return <OfficerDashboard onLogout={signOut} user={user} />;
  return <RequesterDashboard onLogout={signOut} user={user} />;
}
