import Link from "next/link";

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

export default function CargarDatosPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-8 text-slate-950">
      <section className="rounded-2xl bg-slate-950 p-8 text-white shadow">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-300">
          Plataforma de rendimiento
        </p>

        <h1 className="mt-3 text-4xl font-black">Cargar datos</h1>

        <p className="mt-4 max-w-4xl text-sm leading-6 text-slate-200">
          Selecciona el tipo de información que quieres importar a la
          plataforma. Cada bloque tiene su propio flujo de carga,
          previsualización y guardado en Supabase.
        </p>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-3">
        {uploadSections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.3em] text-blue-600">
                  {section.subtitle}
                </p>

                <h2 className="mt-3 text-2xl font-black text-slate-950">
                  {section.title}
                </h2>
              </div>

              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
                {section.tag}
              </span>
            </div>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {section.description}
            </p>

            <div className="mt-6 inline-flex rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition group-hover:bg-blue-700">
              Entrar
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-blue-600">
          Flujo recomendado
        </p>

        <h2 className="mt-2 text-xl font-black text-slate-950">
          Orden de trabajo dentro de la plataforma
        </h2>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">1. Importar</p>
            <p className="mt-2 text-sm text-slate-600">
              Cargar archivos GPS, neuromusculares o de tests desde sus páginas
              específicas.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">2. Revisar</p>
            <p className="mt-2 text-sm text-slate-600">
              Comprobar jugadores detectados, variables leídas y posibles
              registros incompletos antes de guardar.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-black text-slate-950">3. Guardar</p>
            <p className="mt-2 text-sm text-slate-600">
              Insertar la sesión en Supabase para que después pueda analizarse
              desde los módulos de rendimiento.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}