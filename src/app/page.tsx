import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import KpiCard from "@/components/ui/KpiCard";
import { isSupabaseConfigured } from "@/lib/supabase/client";

const moduleCards = [
  {
    title: "Cargar datos",
    description:
      "Importa sesiones GPS, neuromusculares y tests físicos desde archivos CSV.",
    href: "/cargar",
    badge: "Carga",
  },
  {
    title: "GPS",
    description:
      "Analiza carga externa, rankings, objetivos de microciclo y carga semanal.",
    href: "/gps",
    badge: "Carga externa",
  },
  {
    title: "Rendimiento neuromuscular",
    description:
      "Consulta CMJ, RSI modificado, VMP, RPE, cambios PRE-POST y evolución individual.",
    href: "/neuromuscular",
    badge: "Fatiga",
  },
  {
    title: "Tests físicos",
    description:
      "Visualiza puntuaciones por capacidad, clasificaciones, rankings y variables físicas.",
    href: "/tests",
    badge: "Valoración",
  },
  {
    title: "Equipo",
    description:
      "Revisa el estado global de la plantilla, carga acumulada y tendencias generales.",
    href: "/equipo",
    badge: "Dashboard",
  },
  {
    title: "Jugador",
    description:
      "Analiza el perfil individual de cada futbolista integrando GPS, tests y neuromuscular.",
    href: "/jugador",
    badge: "Individual",
  },
  {
    title: "Comparador",
    description:
      "Compara jugadores, variables, fechas y perfiles de rendimiento.",
    href: "/comparador",
    badge: "Análisis",
  },
  {
    title: "Informes",
    description:
      "Genera informes HTML y CSV para cuerpo técnico, jugadores y seguimiento semanal.",
    href: "/informes",
    badge: "Reportes",
  },
  {
    title: "Lupa IA",
    description:
      "Obtén lecturas automáticas, alertas y conclusiones rápidas sobre los datos cargados.",
    href: "/lupa-ia",
    badge: "IA",
  },
  {
    title: "Administración",
    description:
      "Controla equipos, jugadores, sesiones cargadas e integridad de los datos.",
    href: "/admin",
    badge: "Sistema",
  },
];

export default function Home() {
  return (
    <AppShell
      title="Rendimiento · Tests · GPS"
      subtitle="Panel principal de la plataforma profesional para monitorizar estado neuromuscular, tests físicos y carga externa GPS en fútbol."
    >
      <div className="space-y-8">
        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            title="Módulo neuromuscular"
            value="Activo"
            subtitle="CMJ, RSI modificado, VMP, RPE, PRE-POST y evolución."
            badge="Fatiga"
          />

          <KpiCard
            title="Módulo tests"
            value="Activo"
            subtitle="Valoración física, puntuaciones, capacidades y rankings."
            badge="Tests"
          />

          <KpiCard
            title="Módulo GPS"
            value="Activo"
            subtitle="Carga externa, objetivos semanales y referencia de partido."
            badge="GPS"
          />

          <KpiCard
            title="Supabase"
            value={isSupabaseConfigured ? "OK" : "Pendiente"}
            subtitle={
              isSupabaseConfigured
                ? "La conexión con la base de datos está configurada."
                : "Falta configurar las variables de entorno."
            }
            badge="Base de datos"
          />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Acceso rápido
            </p>

            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Módulos principales de la plataforma
            </h2>

            <p className="mt-3 max-w-4xl text-sm leading-6 text-slate-600">
              Desde este panel puedes acceder a las áreas principales de la
              aplicación: carga de datos, análisis GPS, rendimiento
              neuromuscular, tests físicos, informes, comparadores y control de
              administración.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {moduleCards.map((module) => (
              <Link
                key={module.href}
                href={module.href}
                className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-slate-950">
                      {module.title}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {module.description}
                    </p>
                  </div>

                  <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                    {module.badge}
                  </span>
                </div>

                <p className="mt-4 text-sm font-black text-blue-600 group-hover:text-blue-700">
                  Entrar →
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
              Estado actual
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Aplicación en fase funcional
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              La plataforma ya cuenta con estructura principal, conexión con
              Supabase, carga de datos GPS, carga neuromuscular, carga de tests,
              dashboards de jugador y equipo, informes descargables,
              comparador, Lupa IA y administración.
            </p>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              El siguiente objetivo será perfeccionar la experiencia visual,
              mejorar los informes, añadir gráficos más avanzados y preparar la
              aplicación para un uso real estable durante la temporada.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
              Próximo bloque
            </p>

            <h2 className="mt-2 text-xl font-black">
              Pulido final de la plataforma
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-300">
              A partir de ahora conviene trabajar en estética general, iconos,
              coherencia visual, navegación, exportaciones, validaciones y
              preparación para despliegue.
            </p>
          </div>
        </section>
      </div>
    </AppShell>
  );
}