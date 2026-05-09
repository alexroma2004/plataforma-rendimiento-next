import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";

type AppShellProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  children: ReactNode;
};

export default function AppShell({
  title,
  subtitle,
  eyebrow = "Plataforma de rendimiento",
  children,
}: AppShellProps) {
  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <section className="flex-1 px-8 py-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
            {eyebrow}
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight">{title}</h1>

          <p className="mt-4 max-w-4xl text-lg text-slate-300">{subtitle}</p>
        </div>

        <div className="mt-8">{children}</div>
      </section>
    </main>
  );
}