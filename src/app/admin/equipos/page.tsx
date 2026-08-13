"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import StatusMessage from "@/components/ui/StatusMessage";
import { deleteTeamAction } from "./actions";
import {
  getAdminTeamsFromSupabase,
  saveAdminTeamToSupabase,
  type AdminTeamRow,
} from "@/lib/supabase/teams-admin";

type TeamFormState = {
  name: string;
  category: string;
  season: string;
  notes: string;
};

const emptyForm: TeamFormState = {
  name: "",
  category: "",
  season: "",
  notes: "",
};

function buildFormFromTeam(team: AdminTeamRow): TeamFormState {
  return {
    name: team.name ?? "",
    category: team.category ?? "",
    season: team.season ?? "",
    notes: team.notes ?? "",
  };
}

function getTeamSubtitle(team: AdminTeamRow) {
  const details = [team.category, team.season]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" · ");

  return details || "Sin categoría ni temporada";
}

export default function AdminEquiposPage() {
  const [teams, setTeams] = useState<AdminTeamRow[]>([]);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [form, setForm] = useState<TeamFormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeamForDeletion, setSelectedTeamForDeletion] =
    useState<AdminTeamRow | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function loadTeams() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAdminTeamsFromSupabase();

      setTeams(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar equipos.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadTeams();
    });
  }, []);

  const editingTeam = useMemo(() => {
    return teams.find((team) => team.id === editingTeamId) ?? null;
  }, [teams, editingTeamId]);

  const summary = useMemo(() => {
    return {
      total: teams.length,
      withCategory: teams.filter((team) => team.category).length,
      withSeason: teams.filter((team) => team.season).length,
    };
  }, [teams]);

  function resetForm() {
    setEditingTeamId(null);
    setForm(emptyForm);
    setMessage(null);
    setError(null);
  }

  function handleEdit(team: AdminTeamRow) {
    setEditingTeamId(team.id);
    setForm(buildFormFromTeam(team));
    setMessage(null);
    setError(null);
  }

  function openDeleteConfirmation(team: AdminTeamRow) {
    setSelectedTeamForDeletion(team);
    setConfirmationInput("");
    setDeleteError(null);
  }

  function closeDeleteConfirmation() {
    if (deleting) return;

    setSelectedTeamForDeletion(null);
    setConfirmationInput("");
    setDeleteError(null);
  }

  async function handleDeleteTeam() {
    if (!selectedTeamForDeletion || deleting) return;

    if (
      confirmationInput.trim() !== selectedTeamForDeletion.name.trim()
    ) {
      return;
    }

    try {
      setDeleting(true);
      setDeleteError(null);

      const result = await deleteTeamAction({
        teamId: selectedTeamForDeletion.id,
        confirmationName: confirmationInput,
      });

      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }

      if (editingTeamId === result.deletedTeamId) {
        setEditingTeamId(null);
        setForm(emptyForm);
      }

      setSelectedTeamForDeletion(null);
      setConfirmationInput("");
      setDeleteError(null);
      setMessage(result.message);
      await loadTeams();
    } catch {
      setDeleteError("No se pudo completar la eliminación del equipo.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      const savedTeam = await saveAdminTeamToSupabase({
        id: editingTeamId ?? undefined,
        name: form.name,
        category: form.category || null,
        season: form.season || null,
        notes: form.notes || null,
      });

      setMessage(
        editingTeamId
          ? `Equipo actualizado: ${savedTeam.name}.`
          : `Equipo creado: ${savedTeam.name}.`,
      );

      setEditingTeamId(null);
      setForm(emptyForm);

      await loadTeams();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No se ha podido guardar el equipo.";

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Gestión de equipos"
      subtitle="Alta y edición básica de equipos usando la tabla teams existente."
    >
      <div className="space-y-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Equipos
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-blue-700">
              Con categoría
            </p>
            <p className="mt-2 text-2xl font-black text-blue-800 sm:text-3xl">
              {summary.withCategory}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Con temporada
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              {summary.withSeason}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Administración
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                {editingTeam ? "Editar equipo" : "Crear equipo"}
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Se guardan solo campos ya usados por la app: nombre, categoría,
                temporada y notas.
              </p>
            </div>

            {editingTeam && (
              <button
                type="button"
                onClick={resetForm}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 md:w-auto"
              >
                Crear nuevo
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Nombre del equipo
              <input
                type="text"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Equipo principal"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Categoría
              <input
                type="text"
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Senior, Juvenil, Cadete..."
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Temporada
              <input
                type="text"
                value={form.season}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    season: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="2026/27"
              />
            </label>

            <label className="text-sm font-bold text-slate-700 lg:col-span-2">
              Notas
              <textarea
                value={form.notes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.target.value,
                  }))
                }
                className="mt-2 min-h-28 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Notas internas del equipo"
              />
            </label>

            <div className="flex flex-col gap-3 lg:col-span-2 sm:flex-row">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Guardando..."
                  : editingTeam
                    ? "Guardar cambios"
                    : "Crear equipo"}
              </button>

              <button
                type="button"
                onClick={resetForm}
                disabled={saving}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Limpiar formulario
              </button>
            </div>
          </form>

          {message && (
            <div className="mt-5">
              <StatusMessage variant="success" title="Equipo guardado">
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
          <div className="border-b border-slate-200 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
              Equipos
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Equipos registrados
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {teams.length} equipos en la base de datos.
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <StatusMessage variant="info" title="Cargando equipos">
                Cargando los equipos registrados.
              </StatusMessage>
            </div>
          ) : teams.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Sin equipos"
                description="Todavía no hay equipos registrados. Usa el formulario superior para crear el primero."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {teams.map((team) => (
                <article
                  key={team.id}
                  className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">
                      {team.name}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {getTeamSubtitle(team)}
                    </p>
                  </div>

                  <div className="text-sm font-bold text-slate-600">
                    <p>Categoría: {team.category ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Temporada: {team.season ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Notas: {team.notes ?? "Sin notas"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        handleEdit(team);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirmation(team)}
                      className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-700 transition hover:bg-red-50"
                    >
                      Eliminar equipo
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {selectedTeamForDeletion && (
          <section
            aria-labelledby="delete-team-title"
            className="rounded-2xl border border-red-300 bg-red-50 p-5 shadow-sm sm:p-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.25em] text-red-700">
              Confirmación necesaria
            </p>
            <h2
              id="delete-team-title"
              className="mt-2 text-xl font-black text-red-950 sm:text-2xl"
            >
              Eliminar equipo definitivamente
            </h2>
            <p className="mt-2 text-sm leading-6 text-red-900">
              Vas a eliminar definitivamente <strong>{selectedTeamForDeletion.name}</strong>.
              Esta acción no se puede deshacer.
            </p>

            <div className="mt-4 rounded-xl border border-red-200 bg-white p-4 text-sm text-slate-700">
              <p className="font-black text-slate-950">Se eliminarán definitivamente:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Jugadores y perfiles.</li>
                <li>Sesiones y registros GPS.</li>
                <li>Sesiones y registros neuromusculares.</li>
                <li>Historial de configuración de baseline.</li>
                <li>Sesiones y resultados de tests.</li>
              </ul>
              <p className="mt-3 font-bold text-slate-900">
                Los usuarios y roles de la aplicación no se eliminarán.
              </p>
            </div>

            <label className="mt-4 block text-sm font-bold text-red-950">
              Escribe {selectedTeamForDeletion.name} para confirmar
              <input
                type="text"
                value={confirmationInput}
                onChange={(event) => setConfirmationInput(event.target.value)}
                disabled={deleting}
                className="mt-2 w-full rounded-xl border border-red-300 bg-white px-3 py-3 text-sm text-slate-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                aria-describedby={deleteError ? "delete-team-error" : undefined}
              />
            </label>

            {deleteError && (
              <div id="delete-team-error" className="mt-4" role="alert">
                <StatusMessage variant="error" title="No se ha podido eliminar el equipo">
                  {deleteError}
                </StatusMessage>
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={handleDeleteTeam}
                disabled={
                  deleting ||
                  confirmationInput.trim() !== selectedTeamForDeletion.name.trim()
                }
                className="rounded-xl border border-red-700 bg-red-700 px-5 py-3 text-sm font-black text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting ? "Eliminando..." : "Eliminar equipo definitivamente"}
              </button>
              <button
                type="button"
                onClick={closeDeleteConfirmation}
                disabled={deleting}
                className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar
              </button>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
