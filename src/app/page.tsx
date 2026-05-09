import Sidebar from "@/components/layout/Sidebar";
import KpiCard from "@/components/ui/KpiCard";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export default function Home() {
  return (
    <main className="flex min-h-screen bg-slate-100">
      <Sidebar />

      <section className="flex-1 px-8 py-8">
        <div className="rounded-3xl bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-blue-300">
            Plataforma de rendimiento
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight">
            Rendimiento · Tests · GPS
          </h1>

          <p className="mt-4 max-w-3xl text-lg text-slate-300">
            Base inicial de la aplicación profesional para monitorizar estado
            neuromuscular, tests físicos y carga externa GPS en fútbol.
          </p>

          <div className="mt-6 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            Supabase: {isSupabaseConfigured ? "configurado" : "pendiente"}
          </div>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Módulo neuromuscular"
            value="V1"
            subtitle="CMJ, RSI modificado, VMP, baseline, readiness y fatiga."
            badge="Base"
          />

          <KpiCard
            title="Módulo tests"
            value="V1"
            subtitle="Valoración física, radar de capacidades y referencias élite."
            badge="Base"
          />

          <KpiCard
            title="Módulo GPS"
            value="V1"
            subtitle="Carga externa, objetivos semanales y partido de referencia."
            badge="Base"
          />

          <KpiCard
            title="Despliegue"
            value="Vercel"
            subtitle="Proyecto preparado para conectar con Supabase y subir a producción."
            badge="Next.js"
          />
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Estado actual del proyecto
          </h2>

          <p className="mt-3 text-slate-600">
            La estructura base ya está preparada. El siguiente paso será crear
            las rutas principales de la aplicación: neuromuscular, tests, GPS,
            jugadores, informes y administración.
          </p>
        </div>
      </section>
    </main>
  );
}