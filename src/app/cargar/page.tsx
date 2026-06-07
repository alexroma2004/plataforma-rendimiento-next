import Link from "next/link";
import AppShell from "@/components/layout/AppShell";

const uploadSections = [
  {
    title: "Cargar GPS",
    subtitle: "Carga externa",
    description:
      "Importa archivos CSV de GPS, revisa la previsualización y guarda sesiones de entrenamiento o partido en Supabase.",
    href: "/cargar-gps",
    tag: "GPS",
  },
  {
    title: "Cargar neuromuscular",
    subtitle: "Control de fatiga",
    description:
      "Importa sesiones de CMJ, RSI modificado, VMP, carga de sentadilla y RPE para el control neuromuscular del equipo.",
    href: "/cargar-neuromuscular",
    tag: "Neuromuscular",
  },
  {
    title: "Cargar tests físicos",
    subtitle: "Valoración física",
    description:
      "Importa resultados de tests físicos, clasificaciones, puntuaciones y variables de rendimiento individual.",
    href: "/cargar-tests",
    tag: "Tests",
  },
];

const workflowSteps = [
  {
    title: "1. Importar",
    description:
      "Cargar archivos GPS, neuromusculares o de tests desde sus páginas específicas.",
  },
  {
    title: "2. Revisar",
    description:
      "Comprobar jugadores detectados, variables leídas y posibles registros incompletos antes de guardar.",
  },
  {
    title: "3. Guardar",
    description:
      "Insertar la sesión en Supabase para que después pueda analizarse desde los módulos de rendimiento.",
  },
];

export default function CargarDatosPage() {
  return (
    <AppShell
      title="Cargar datos"
      subtitle="Selecciona el tipo de información que quieres importar a la plataforma. Cada bloque tiene su propio flujo de carga, previsualización y guardado en Supabase."
    >
      <div className="space-y-8">
        <section className="grid gap-6 lg:grid-cols-3">
          {uploadSections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.3em]">
                    {section.subtitle}
                  </p>

                  <h2 className="mt-3 break-words text-xl font-black text-slate-950 sm:text-2xl">
                    {section.title}
                  </h2>
                </div>

                <span className="w-fit shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                  {section.tag}
                </span>
              </div>

              <p className="mt-4 break-words text-sm leading-6 text-slate-600">
                {section.description}
              </p>

              <div className="mt-6 inline-flex w-full justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition group-hover:bg-blue-700 sm:w-auto">
                Entrar
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
            Flujo recomendado
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            Orden de trabajo dentro de la plataforma
          </h2>

          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
            Este flujo ayuda a evitar errores antes de guardar datos en la base
            de datos y facilita que los módulos de análisis trabajen con
            información limpia.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {workflowSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4"
              >
                <p className="text-sm font-black text-slate-950">
                  {step.title}
                </p>

                <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}