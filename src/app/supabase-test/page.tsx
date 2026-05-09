import { isSupabaseConfigured, supabase } from "@/lib/supabase/client";

export default async function SupabaseTestPage() {
  if (!isSupabaseConfigured || !supabase) {
    return (
      <main className="min-h-screen bg-slate-100 p-10">
        <section className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-600">
            Test Supabase
          </p>

          <h1 className="mt-3 text-3xl font-black text-slate-950">
            Supabase no está configurado
          </h1>

          <p className="mt-4 text-slate-700">
            Revisa el archivo <strong>.env.local</strong> y comprueba que tienes
            estas dos variables:
          </p>

          <pre className="mt-4 rounded-xl bg-slate-950 p-4 text-sm text-white">
{`NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_ANON_KEY`}
          </pre>

          <p className="mt-4 text-sm text-slate-500">
            Después de editar .env.local, debes parar el servidor y volver a ejecutar npm run dev.
          </p>
        </section>
      </main>
    );
  }

  const { data, error } = await supabase
    .from("app_connection_test")
    .select("*")
    .order("id", { ascending: false })
    .limit(5);

  return (
    <main className="min-h-screen bg-slate-100 p-10">
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-8 shadow">
        <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
          Test Supabase
        </p>

        <h1 className="mt-3 text-3xl font-black text-slate-950">
          Comprobación de conexión
        </h1>

        {error ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
            <h2 className="font-bold text-red-700">Error de conexión</h2>
            <p className="mt-2 text-sm text-red-700">{error.message}</p>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4">
            <h2 className="font-bold text-green-700">
              Conexión correcta con Supabase
            </h2>
            <p className="mt-2 text-sm text-green-700">
              La app ha podido leer datos desde la tabla app_connection_test.
            </p>
          </div>
        )}

        <div className="mt-6 rounded-xl bg-slate-950 p-4 text-sm text-white">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </section>
    </main>
  );
}