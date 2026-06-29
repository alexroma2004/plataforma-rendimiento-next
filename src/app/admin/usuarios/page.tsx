"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  getUserRolesFromSupabase,
  upsertUserRoleByEmail,
  type UserRoleRow,
} from "@/lib/supabase/user-roles";
import { getRoleLabel, type AppRole } from "@/lib/auth/permissions";

const roleOptions: AppRole[] = ["admin", "staff", "viewer"];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("es-ES", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function getRoleClass(role: AppRole) {
  if (role === "admin") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (role === "staff") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

export default function AdminUsuariosPage() {
  const [rows, setRows] = useState<UserRoleRow[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("viewer");

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadRoles() {
    try {
      setLoading(true);
      setError(null);

      const data = await getUserRolesFromSupabase();

      setRows(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar usuarios.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadRoles();
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      if (!email.trim()) {
        throw new Error("Introduce un email.");
      }

      await upsertUserRoleByEmail(email.trim(), role);

      setMessage(`Rol actualizado correctamente para ${email.trim()}.`);
      setEmail("");
      setRole("viewer");

      await loadRoles();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "No se ha podido actualizar el rol.";

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) return rows;

    return rows.filter((row) => {
      return (
        row.email.toLowerCase().includes(normalizedSearch) ||
        row.role.toLowerCase().includes(normalizedSearch)
      );
    });
  }, [rows, search]);

  const summary = useMemo(() => {
    return {
      total: rows.length,
      admin: rows.filter((row) => row.role === "admin").length,
      staff: rows.filter((row) => row.role === "staff").length,
      viewer: rows.filter((row) => row.role === "viewer").length,
    };
  }, [rows]);

  const emptyUsersTitle = search.trim()
    ? "Sin resultados para esta búsqueda"
    : "Sin usuarios registrados";

  const emptyUsersMessage = search.trim()
    ? "No hay usuarios que coincidan con el email o rol introducido. Prueba con otra búsqueda."
    : "Todavía no hay usuarios con rol registrado. Añade un email existente en Supabase Auth y asígnale un rol desde el formulario superior.";

  return (
    <AppShell
      title="Gestión de usuarios"
      subtitle="Administra los roles de acceso de la plataforma: administrador, staff y solo lectura."
    >
      <div className="space-y-8">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Usuarios
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-red-700">
              Admin
            </p>
            <p className="mt-2 text-2xl font-black text-red-800 sm:text-3xl">
              {summary.admin}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Staff
            </p>
            <p className="mt-2 text-2xl font-black text-blue-800 sm:text-3xl">
              {summary.staff}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Viewer
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-800 sm:text-3xl">
              {summary.viewer}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
              Asignar rol
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
              Añadir o actualizar usuario
            </h2>

            <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
              El usuario debe existir previamente en Supabase Auth. Desde aquí
              solo se asigna su rol dentro de la plataforma.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px_auto]"
          >
            <label className="text-sm font-bold text-slate-700">
              Email del usuario
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="usuario@email.com"
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Rol
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AppRole)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                {roleOptions.map((option) => (
                  <option key={option} value={option}>
                    {getRoleLabel(option)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 lg:w-auto"
              >
                {saving ? "Guardando..." : "Guardar rol"}
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-5">
              <StatusMessage variant="success" title="Rol actualizado">
                {message}
              </StatusMessage>
            </div>
          )}

          {error && (
            <div className="mt-5">
              <StatusMessage variant="error" title="No se ha podido completar la acción">
                {error}
              </StatusMessage>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 p-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Usuarios
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950">
                Roles registrados
              </h2>

              <p className="mt-1 text-sm font-bold text-slate-500">
                {filteredRows.length} de {rows.length} usuarios visibles
              </p>
            </div>

            <label className="w-full text-sm font-bold text-slate-700 md:w-[320px]">
              Buscar
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Email o rol..."
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </label>
          </div>

          {loading ? (
            <div className="p-6">
              <StatusMessage variant="info" title="Cargando usuarios">
                Cargando usuarios y roles registrados.
              </StatusMessage>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100 md:hidden">
                {filteredRows.map((row) => (
                  <article key={row.id} className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Email
                        </p>
                        <p className="mt-1 break-all text-sm font-black text-slate-950">
                          {row.email}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-black ${getRoleClass(
                          row.role,
                        )}`}
                      >
                        {getRoleLabel(row.role)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl bg-slate-50 p-4">
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Creado
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {formatDate(row.created_at)}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">
                          Actualizado
                        </p>
                        <p className="mt-1 text-sm font-bold text-slate-700">
                          {formatDate(row.updated_at)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}

                {filteredRows.length === 0 && (
                  <div className="p-5">
                    <EmptyState title={emptyUsersTitle} description={emptyUsersMessage} />
                  </div>
                )}
              </div>

              <div className="hidden max-h-[620px] overflow-auto md:block">
                <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                  <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Rol</th>
                      <th className="px-4 py-3">Creado</th>
                      <th className="px-4 py-3">Actualizado</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 font-black text-slate-950">
                          {row.email}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-black ${getRoleClass(
                              row.role,
                            )}`}
                          >
                            {getRoleLabel(row.role)}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(row.created_at)}
                        </td>

                        <td className="px-4 py-3">
                          {formatDate(row.updated_at)}
                        </td>
                      </tr>
                    ))}

                    {filteredRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-6">
                          <EmptyState
                            title={emptyUsersTitle}
                            description={emptyUsersMessage}
                          />
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      </div>
    </AppShell>
  );
}
