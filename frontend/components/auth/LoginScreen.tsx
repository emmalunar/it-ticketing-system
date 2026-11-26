"use client";

import { useState, type FormEvent } from "react";
import { Brand } from "@/components/layout/Brand";
import { Alert } from "@/components/ui/Feedback";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Form";
import { LockIcon, ShieldIcon, TicketIcon } from "@/components/ui/icons";

export type LoginScreenProps = {
  onSubmit: (username: string, password: string) => void | Promise<void>;
  authenticating: boolean;
  error: string | null;
};

const highlights = [
  { icon: TicketIcon, text: "Raise a request and track every update in one place." },
  { icon: ShieldIcon, text: "Role-aware queues keep the right work with the right team." },
  { icon: LockIcon, text: "Secure, session-based access for OmniGroup staff." },
];

export function LoginScreen({ onSubmit, authenticating, error }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSubmit(username, password);
  }

  return (
    <div className="auth-shell">
      <aside className="auth-aside" aria-label="About the service desk">
        <Brand inverse />
        <div className="auth-aside__art" aria-hidden="true" />
        <div className="auth-aside__content">
          <p className="auth-aside__eyebrow">OmniGroup IT</p>
          <p className="auth-aside__title">
            Support that keeps your work <em>moving.</em>
          </p>
          <p className="auth-aside__body">
            One desk for requests, queue management, and resolution updates across every
            station.
          </p>
          <ul className="auth-points">
            {highlights.map(({ icon: Icon, text }) => (
              <li key={text}>
                <Icon size={15} />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="auth-aside__footer">
          <span>Service Desk</span>
          <span>Internal use only</span>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-panel">
          <div className="auth-mobile-brand">
            <Brand large />
          </div>
          <header className="auth-header">
            <h1 className="auth-title">Sign in to Service Desk</h1>
            <p className="auth-subtitle">Use your internal support account to continue.</p>
          </header>
          <div className="auth-card">
            <form className="auth-form" onSubmit={handleSubmit} noValidate={false}>
              {error ? (
                <Alert tone="error" title="Unable to sign in">
                  {error}
                </Alert>
              ) : null}
              <TextField
                label="Username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                disabled={authenticating}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. j.doe"
              />
              <TextField
                label="Password"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                disabled={authenticating}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Enter your password"
              />
              <Button type="submit" variant="primary" size="lg" block loading={authenticating}>
                {authenticating ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </div>
          <p className="auth-footer">
            Trouble signing in? Contact your IT administrator or the service desk supervisor.
          </p>
        </div>
      </main>
    </div>
  );
}
