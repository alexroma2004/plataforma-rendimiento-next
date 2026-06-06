import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";

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
  return (
    <main className="flex min-h-screen bg-slate-100 text-slate-950">
      <Sidebar />

      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
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