"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import StatusMessage from "@/components/ui/StatusMessage";
import {
  DOMINANT_FEET,
  PLAYER_POSITIONS,
  type DominantFoot,
  type PlayerPosition,
} from "@/lib/domain/performance";
import {
  PLAYER_PHOTO_MAX_SIZE_BYTES,
  PLAYER_PHOTO_MIME_TYPES,
  getAdminPlayerPhotoSignedUrl,
  getAdminPlayersFromSupabase,
  saveAdminPlayerToSupabase,
  uploadAdminPlayerPhotoToSupabase,
  type AdminPlayerProfileRow,
} from "@/lib/supabase/players-admin";

type PlayerFormState = {
  first_name: string;
  last_name: string;
  birth_date: string;
  dominant_foot: string;
  primary_position: string;
  secondary_position: string;
  shirt_number: string;
  active: boolean;
  notes: string;
};

const emptyForm: PlayerFormState = {
  first_name: "",
  last_name: "",
  birth_date: "",
  dominant_foot: "",
  primary_position: "",
  secondary_position: "",
  shirt_number: "",
  active: true,
  notes: "",
};

function isDominantFoot(value: string): value is DominantFoot {
  return DOMINANT_FEET.includes(value as DominantFoot);
}

function isPlayerPosition(value: string): value is PlayerPosition {
  return PLAYER_POSITIONS.includes(value as PlayerPosition);
}

function getDisplayName(player: AdminPlayerProfileRow) {
  const fullName = [player.first_name, player.last_name]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean)
    .join(" ");

  return fullName || player.name || "Jugador sin nombre";
}

function formatBirthDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("es-ES");
}

function buildFormFromPlayer(player: AdminPlayerProfileRow): PlayerFormState {
  return {
    first_name: player.first_name ?? player.name ?? "",
    last_name: player.last_name ?? "",
    birth_date: player.birth_date ?? "",
    dominant_foot: player.dominant_foot ?? "",
    primary_position: player.primary_position ?? player.position ?? "",
    secondary_position: player.secondary_position ?? "",
    shirt_number:
      player.shirt_number === null || player.shirt_number === undefined
        ? ""
        : String(player.shirt_number),
    active: player.active ?? true,
    notes: player.notes ?? "",
  };
}

function getPhotoHelpText() {
  return `JPG, PNG o WEBP. Máximo ${Math.round(
    PLAYER_PHOTO_MAX_SIZE_BYTES / 1024 / 1024,
  )} MB.`;
}

export default function AdminJugadoresPage() {
  const [players, setPlayers] = useState<AdminPlayerProfileRow[]>([]);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [form, setForm] = useState<PlayerFormState>(emptyForm);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [editingPhotoUrl, setEditingPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadPlayers() {
    try {
      setLoading(true);
      setError(null);

      const data = await getAdminPlayersFromSupabase();

      setPlayers(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Error desconocido al cargar jugadores.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadPlayers();
    });
  }, []);

  const editingPlayer = useMemo(() => {
    return players.find((player) => player.id === editingPlayerId) ?? null;
  }, [players, editingPlayerId]);

  const localPhotoPreviewUrl = useMemo(() => {
    if (!photoFile) return null;

    return URL.createObjectURL(photoFile);
  }, [photoFile]);

  useEffect(() => {
    return () => {
      if (localPhotoPreviewUrl) {
        URL.revokeObjectURL(localPhotoPreviewUrl);
      }
    };
  }, [localPhotoPreviewUrl]);

  const photoPreviewUrl = localPhotoPreviewUrl ?? editingPhotoUrl;

  const summary = useMemo(() => {
    return {
      total: players.length,
      active: players.filter((player) => player.active).length,
      inactive: players.filter((player) => player.active === false).length,
    };
  }, [players]);

  function resetForm() {
    setEditingPlayerId(null);
    setForm(emptyForm);
    setPhotoFile(null);
    setEditingPhotoUrl(null);
    setPhotoError(null);
    setPhotoInputKey((current) => current + 1);
    setMessage(null);
    setError(null);
  }

  async function handleEdit(player: AdminPlayerProfileRow) {
    setEditingPlayerId(player.id);
    setForm(buildFormFromPlayer(player));
    setPhotoFile(null);
    setEditingPhotoUrl(null);
    setPhotoError(null);
    setPhotoInputKey((current) => current + 1);
    setMessage(null);
    setError(null);

    if (!player.photo_path) return;

    try {
      const signedUrl = await getAdminPlayerPhotoSignedUrl(player.photo_path);

      setEditingPhotoUrl(signedUrl);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No se ha podido cargar la vista previa de la foto.";

      setPhotoError(errorMessage);
    }
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setPhotoError(null);

    if (!file) {
      setPhotoFile(null);
      return;
    }

    if (!PLAYER_PHOTO_MIME_TYPES.includes(file.type as (typeof PLAYER_PHOTO_MIME_TYPES)[number])) {
      setPhotoFile(null);
      setPhotoError("La foto debe estar en formato JPG, PNG o WEBP.");
      event.target.value = "";
      return;
    }

    if (file.size > PLAYER_PHOTO_MAX_SIZE_BYTES) {
      setPhotoFile(null);
      setPhotoError("La foto no puede superar los 5 MB.");
      event.target.value = "";
      return;
    }

    setPhotoFile(file);
  }

  function buildSaveInput(photoPath?: string) {
    return {
      id: editingPlayerId ?? undefined,
      first_name: form.first_name,
      last_name: form.last_name,
      birth_date: form.birth_date || null,
      dominant_foot: isDominantFoot(form.dominant_foot)
        ? form.dominant_foot
        : null,
      primary_position: isPlayerPosition(form.primary_position)
        ? form.primary_position
        : null,
      secondary_position: isPlayerPosition(form.secondary_position)
        ? form.secondary_position
        : null,
      shirt_number: form.shirt_number ? Number(form.shirt_number) : null,
      active: form.active,
      notes: form.notes,
      ...(photoPath ? { photo_path: photoPath } : {}),
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError(null);
      setMessage(null);

      let uploadedPhotoPath: string | undefined;

      if (photoFile && editingPlayerId) {
        uploadedPhotoPath = await uploadAdminPlayerPhotoToSupabase({
          playerId: editingPlayerId,
          teamId: editingPlayer?.team_id ?? null,
          file: photoFile,
        });
      }

      let savedPlayer = await saveAdminPlayerToSupabase(
        buildSaveInput(uploadedPhotoPath),
      );

      if (photoFile && !editingPlayerId) {
        uploadedPhotoPath = await uploadAdminPlayerPhotoToSupabase({
          playerId: savedPlayer.id,
          teamId: savedPlayer.team_id,
          file: photoFile,
        });

        savedPlayer = await saveAdminPlayerToSupabase({
          ...buildSaveInput(uploadedPhotoPath),
          id: savedPlayer.id,
        });
      }

      setMessage(
        editingPlayerId
          ? `Jugador actualizado: ${getDisplayName(savedPlayer)}.`
          : `Jugador creado: ${getDisplayName(savedPlayer)}.`,
      );

      setForm(emptyForm);
      setEditingPlayerId(null);
      setPhotoFile(null);
      setEditingPhotoUrl(null);
      setPhotoError(null);
      setPhotoInputKey((current) => current + 1);

      await loadPlayers();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "No se ha podido guardar el jugador.";

      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="Gestión de jugadores"
      subtitle="Alta y edición básica de jugadores. Mantiene compatibilidad con el modelo actual de nombre, posición y equipo."
    >
      <div className="space-y-8">
        <section className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Jugadores
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              {summary.total}
            </p>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
              Activos
            </p>
            <p className="mt-2 text-2xl font-black text-emerald-800 sm:text-3xl">
              {summary.active}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm sm:p-5">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Inactivos
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950 sm:text-3xl">
              {summary.inactive}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Plantilla
              </p>

              <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                {editingPlayer ? "Editar jugador" : "Añadir jugador"}
              </h2>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Al guardar se actualizan también los campos compatibles: name,
                normalized_name, position e is_goalkeeper.
              </p>
            </div>

            {editingPlayer && (
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
              Nombre
              <input
                type="text"
                value={form.first_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    first_name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Nombre"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Apellidos
              <input
                type="text"
                value={form.last_name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    last_name: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Apellidos"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Fecha de nacimiento
              <input
                type="date"
                value={form.birth_date}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    birth_date: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <label className="text-sm font-bold text-slate-700">
              Pie dominante
              <select
                value={form.dominant_foot}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    dominant_foot: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin definir</option>
                {DOMINANT_FEET.map((foot) => (
                  <option key={foot} value={foot}>
                    {foot}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Posición principal
              <select
                value={form.primary_position}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    primary_position: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin definir</option>
                {PLAYER_POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Posición secundaria
              <select
                value={form.secondary_position}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    secondary_position: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Sin definir</option>
                {PLAYER_POSITIONS.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-bold text-slate-700">
              Dorsal
              <input
                type="number"
                min="0"
                value={form.shirt_number}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    shirt_number: event.target.value,
                  }))
                }
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                placeholder="Dorsal"
              />
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    active: event.target.checked,
                  }))
                }
                className="h-4 w-4 rounded border-slate-300"
              />
              Jugador activo
            </label>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 bg-cover bg-center text-xs font-black uppercase tracking-wide text-slate-500"
                  style={
                    photoPreviewUrl
                      ? { backgroundImage: `url(${photoPreviewUrl})` }
                      : undefined
                  }
                  aria-label="Vista previa de la foto del jugador"
                >
                  {!photoPreviewUrl && "Sin foto"}
                </div>

                <label className="w-full text-sm font-bold text-slate-700">
                  Foto del jugador
                  <input
                    key={photoInputKey}
                    type="file"
                    accept={PLAYER_PHOTO_MIME_TYPES.join(",")}
                    onChange={handlePhotoChange}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm outline-none file:mr-4 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-xs file:font-black file:text-white focus:border-blue-500"
                  />
                  <span className="mt-2 block text-xs font-bold text-slate-500">
                    {getPhotoHelpText()}
                    {editingPlayer?.photo_path && !photoFile
                      ? " Hay una foto guardada; selecciona otra para reemplazarla."
                      : ""}
                  </span>
                </label>
              </div>

              {photoError && (
                <div className="mt-4">
                  <StatusMessage variant="warning" title="Revisa la foto">
                    {photoError}
                  </StatusMessage>
                </div>
              )}
            </div>

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
                placeholder="Notas internas del jugador"
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
                  : editingPlayer
                    ? "Guardar cambios"
                    : "Crear jugador"}
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
              <StatusMessage variant="success" title="Jugador guardado">
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
              Jugadores
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Plantilla registrada
            </h2>

            <p className="mt-1 text-sm font-bold text-slate-500">
              {players.length} jugadores en la base de datos.
            </p>
          </div>

          {loading ? (
            <div className="p-6">
              <StatusMessage variant="info" title="Cargando jugadores">
                Cargando la plantilla registrada.
              </StatusMessage>
            </div>
          ) : players.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="Sin jugadores"
                description="Todavía no hay jugadores registrados. Usa el formulario superior para añadir el primero."
              />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {players.map((player) => (
                <article
                  key={player.id}
                  className="grid gap-4 p-5 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-center"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-950">
                      {getDisplayName(player)}
                    </p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {player.normalized_name}
                    </p>
                  </div>

                  <div className="text-sm font-bold text-slate-600">
                    <p>{player.primary_position ?? player.position ?? "Sin posición"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Secundaria: {player.secondary_position ?? "—"}
                    </p>
                  </div>

                  <div className="text-sm font-bold text-slate-600">
                    <p>
                      Dorsal:{" "}
                      {player.shirt_number === null ||
                      player.shirt_number === undefined
                        ? "—"
                        : player.shirt_number}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Nacimiento: {formatBirthDate(player.birth_date)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Foto: {player.photo_path ? "registrada" : "sin foto"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                    <span
                      className={`w-fit rounded-full border px-3 py-1 text-xs font-black ${
                        player.active
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-600"
                      }`}
                    >
                      {player.active ? "Activo" : "Inactivo"}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        void handleEdit(player);
                      }}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-700 transition hover:bg-slate-100"
                    >
                      Editar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
