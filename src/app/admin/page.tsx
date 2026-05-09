import { getTableStatus } from "@/lib/supabase/admin";

export default async function AdminPage() {
  let tableStatus;

  try {
    tableStatus = await getTableStatus();
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido conectando con Supabase.";

    return (
      <main className="min-h-screen bg-slate-100 p-10">
        <section className="mx-auto max-w-6xl rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-600">
            Administración
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-950">
            Error de conexión
          </h1>

          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
            {message}
          </div>

          <p className="mt-5 text-sm text-slate-600">
            Revisa que el archivo <strong>.env.local</strong> existe, que las
            variables están bien escritas y que el servidor se ha reiniciado
            después de crear o modificar las variables.
          </p>
        </section>
      </main>
    );
  }

  const totalTables = tableStatus.length;
  const okTables = tableStatus.filter((item) => item.ok).length;
  const errorTables = tableStatus.filter((item) => !item.ok).length;
  const totalRecords = tableStatus.reduce((acc, item) => {
    return acc + (item.count ?? 0);
  }, 0);

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <section className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-2xl bg-slate-950 p-8 text-white shadow">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-300">
            Plataforma de rendimiento
          </p>

          <h1 className="mt-3 text-4xl font-black">Administración</h1>

          <p className="mt-4 max-w-3xl text-lg text-slate-200">
            Estado general de la base de datos, tablas principales y conexión
            con Supabase.
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 md:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Tablas revisadas</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {totalTables}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Tablas correctas</p>
            <p className="mt-2 text-3xl font-black text-emerald-700">
              {okTables}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Tablas con error</p>
            <p className="mt-2 text-3xl font-black text-red-700">
              {errorTables}
            </p>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow">
            <p className="text-sm text-slate-500">Registros totales</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {totalRecords}
            </p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
                Supabase
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Estado de tablas
              </h2>
            </div>

            <div
              className={`rounded-full px-4 py-2 text-sm font-bold ${
                errorTables === 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {errorTables === 0
                ? "Base preparada"
                : "Revisar algunas tablas"}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Módulo
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Tabla
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Estado
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Registros
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3">
                    Error
                  </th>
                </tr>
              </thead>

              <tbody>
                {tableStatus.map((item) => (
                  <tr key={item.table} className="bg-white">
                    <td className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-900">
                      {item.label}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 font-mono text-xs text-slate-700">
                      {item.table}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          item.ok
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {item.ok ? "OK" : "ERROR"}
                      </span>
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 text-slate-800">
                      {item.count ?? "—"}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-3 text-xs text-red-700">
                      {item.error ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-5 text-sm text-slate-600">
            Si alguna tabla aparece con error, normalmente significa que el SQL
            no se ha ejecutado completo en Supabase o que falta alguna política
            RLS.
          </p>
        </section>
      </section>
    </main>
  );
}