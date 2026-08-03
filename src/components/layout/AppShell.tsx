"use client";

import { useEffect, useState, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";

const MOBILE_NAVIGATION_ID = "app-mobile-navigation";

type AppShellProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  actions?: ReactNode;
  children: ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  eyebrow = "Plataforma de rendimiento",
  actions,
  children,
}: AppShellProps) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    const desktopMediaQuery = window.matchMedia("(min-width: 1024px)");

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileSidebarOpen(false);
    }

    function handleDesktopViewportChange(event: MediaQueryListEvent) {
      if (event.matches) setMobileSidebarOpen(false);
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    desktopMediaQuery.addEventListener("change", handleDesktopViewportChange);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      desktopMediaQuery.removeEventListener("change", handleDesktopViewportChange);
    };
  }, [mobileSidebarOpen]);

  function openMobileSidebar() {
    setMobileSidebarOpen(true);
  }

  function closeMobileSidebar() {
    setMobileSidebarOpen(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950 lg:flex">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {mobileSidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          onClick={closeMobileSidebar}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {mobileSidebarOpen && (
        <aside
          id={MOBILE_NAVIGATION_ID}
          aria-label="Navegación principal"
          className="fixed inset-y-0 left-0 z-50 w-72 lg:hidden"
        >
          <Sidebar onClose={closeMobileSidebar} onNavigate={closeMobileSidebar} />
        </aside>
      )}

      <section className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
          <button
            type="button"
            onClick={openMobileSidebar}
            aria-controls={MOBILE_NAVIGATION_ID}
            aria-expanded={mobileSidebarOpen}
            aria-label="Abrir navegación"
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
          >
            Menú
          </button>

          <div className="min-w-0 text-right">
            <p className="truncate text-xs font-black uppercase tracking-[0.22em] text-slate-500">
              Plataforma
            </p>
            <p className="truncate text-sm font-black text-slate-950">
              Rendimiento
            </p>
          </div>
        </div>

        <div className="rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
                {eyebrow}
              </p>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {title}
              </h1>

              <p className="mt-4 max-w-5xl text-sm leading-6 text-slate-300 sm:text-base">
                {subtitle}
              </p>
            </div>

            {actions && <div className="shrink-0">{actions}</div>}
          </div>
        </div>

        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}
