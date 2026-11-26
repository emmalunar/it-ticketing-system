"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { ApiUser } from "@/lib/api";
import { cn } from "@/lib/cn";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scroll-lock";
import { displayName, roleLabel } from "@/lib/ticket-meta";
import { Avatar } from "../ui/Avatar";
import { Brand } from "./Brand";
import { ChevronDownIcon, LockIcon, LogOutIcon, MenuIcon, XIcon } from "../ui/icons";

export type AppNavItem = {
  id: string;
  label: string;
  icon: ReactNode;
  count?: number;
};

export type AppNavSection = {
  label?: string;
  items: AppNavItem[];
};

type AppShellProps = {
  user: ApiUser;
  navSections: AppNavSection[];
  activeItem: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  contextLabel: string;
  pageTitle?: string;
  children: ReactNode;
  topbarActions?: ReactNode;
  sidebarFooter?: ReactNode;
  serviceLabel?: string;
};

export function AppShell({
  user,
  navSections,
  activeItem,
  onNavigate,
  onSignOut,
  contextLabel,
  pageTitle,
  children,
  topbarActions,
  sidebarFooter,
  serviceLabel = "Secure session",
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const activeLabel =
    navSections.flatMap((section) => section.items).find((item) => item.id === activeItem)?.label ??
    pageTitle ??
    contextLabel;
  const name = displayName(user);

  useEffect(() => {
    if (!mobileOpen) return;
    lockBodyScroll();
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 40);

    function closeNav(returnFocus: boolean) {
      setMobileOpen(false);
      if (returnFocus) {
        window.requestAnimationFrame(() => triggerRef.current?.focus());
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeNav(true);
        return;
      }
      if (event.key !== "Tab") return;
      const root = sidebarRef.current;
      if (!root) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((element) => element.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    const desktop = window.matchMedia("(min-width: 1024px)");
    const handleBreakpoint = () => {
      if (desktop.matches) setMobileOpen(false);
    };

    document.addEventListener("keydown", handleKeyDown, true);
    desktop.addEventListener("change", handleBreakpoint);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      desktop.removeEventListener("change", handleBreakpoint);
      unlockBodyScroll();
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  function handleNavigate(id: string) {
    onNavigate(id);
    if (mobileOpen) {
      setMobileOpen(false);
      window.requestAnimationFrame(() => {
        document.getElementById("main-content")?.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }

  function handleSignOut() {
    setMenuOpen(false);
    onSignOut();
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div className="app-frame">
        <aside
          className={cn("sidebar", mobileOpen && "is-open")}
          id="app-sidebar"
          ref={sidebarRef}
          aria-label={`${roleLabel(user.role)} navigation`}
          tabIndex={-1}
        >
          <div className="sidebar__brand">
            <Brand inverse />
            <button
              className="sidebar__close"
              ref={closeButtonRef}
              type="button"
              onClick={() => {
                setMobileOpen(false);
                triggerRef.current?.focus();
              }}
              aria-label="Close navigation"
            >
              <XIcon size={16} />
            </button>
          </div>
          <nav className="sidebar__nav" aria-label="Workspace sections">
            {navSections.map((section, index) => (
              <div className="sidebar__section" key={section.label ?? `section-${index}`}>
                {section.label ? <p className="sidebar__section-label">{section.label}</p> : null}
                {section.items.map((item) => {
                  const active = item.id === activeItem;
                  return (
                    <button
                      key={item.id}
                      className={cn("nav-item", active && "is-active")}
                      type="button"
                      aria-current={active ? "page" : undefined}
                      onClick={() => handleNavigate(item.id)}
                    >
                      <span className="nav-item__icon">{item.icon}</span>
                      <span className="nav-item__label">{item.label}</span>
                      {typeof item.count === "number" && item.count > 0 ? (
                        <span className="nav-item__meta">{item.count}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className="sidebar__footer">
            {sidebarFooter}
            <div className="sidebar-user">
              <Avatar name={name} size="sm" tone="inverse" />
              <div className="sidebar-user__meta">
                <span className="sidebar-user__name">{name}</span>
                <span className="sidebar-user__role">{roleLabel(user.role)}</span>
              </div>
              <button
                className="sidebar-user__action"
                type="button"
                onClick={onSignOut}
                aria-label="Sign out"
                title="Sign out"
              >
                <LogOutIcon size={15} />
              </button>
            </div>
          </div>
        </aside>

        {mobileOpen ? (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => {
              setMobileOpen(false);
              triggerRef.current?.focus();
            }}
          />
        ) : null}

        <div className="app-main">
          <header className="topbar">
            <div className="topbar__inner">
              <div className="topbar__left">
                <button
                  className="mobile-nav-trigger"
                  ref={triggerRef}
                  type="button"
                  aria-label="Open navigation"
                  aria-expanded={mobileOpen}
                  aria-controls="app-sidebar"
                  onClick={() => setMobileOpen(true)}
                >
                  <MenuIcon size={18} />
                </button>
                <div className="topbar__context">
                  <span className="topbar__crumb">{contextLabel}</span>
                  <span className="topbar__title">{activeLabel}</span>
                </div>
              </div>
              <div className="topbar__actions">
                {topbarActions}
                <span className="service-indicator" title="Your connection to the support system is secured">
                  <LockIcon size={11} />
                  {serviceLabel}
                </span>
                <div className="user-menu" ref={menuRef}>
                  <button
                    className="user-menu__trigger"
                    ref={menuButtonRef}
                    type="button"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={`Account menu for ${name}`}
                    onClick={() => setMenuOpen((open) => !open)}
                  >
                    <Avatar name={name} size="sm" />
                    <span className="user-menu__meta">
                      <span className="user-menu__name">{name}</span>
                      <span className="user-menu__role">{roleLabel(user.role)}</span>
                    </span>
                    <ChevronDownIcon className="user-menu__chevron" size={14} />
                  </button>
                  {menuOpen ? (
                    <div className="popover" role="menu" aria-label="Account">
                      <div className="user-menu__header">
                        <p className="user-menu__header-name">{name}</p>
                        <p className="user-menu__header-email">
                          {user.username} · {roleLabel(user.role)}
                        </p>
                      </div>
                      <div className="menu">
                        <button
                          className="menu__item menu__item--danger"
                          type="button"
                          role="menuitem"
                          onClick={handleSignOut}
                        >
                          <LogOutIcon size={15} />
                          Sign out
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>
          <main className="app-content" id="main-content" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
