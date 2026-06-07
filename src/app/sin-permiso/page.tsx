import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

export default function SinPermisoPage() {
  return (
    <AppShell
      title="Acceso no permitido"
      subtitle="Tu usuario no tiene permisos suficientes para acceder a este apartado."
    >
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-800 shadow-sm">
        <p className="text-sm font-bold leading-6">
          Si crees que deberías tener acceso a esta sección, revisa tu rol en
          Supabase o contacta con el administrador de la plataforma.
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/"
            className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow hover:bg-slate-800"
          >
            Volver al dashboard
          </Link>

          <Link
            href="/jugador"
            className="rounded-xl border border-amber-300 bg-white px-5 py-3 text-sm font-black text-amber-800 shadow hover:bg-amber-100"
          >
            Ir a jugador
          </Link>
        </div>
      </section>
    </AppShell>
  );
}