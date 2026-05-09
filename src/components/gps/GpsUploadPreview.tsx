"use client";

import Papa from "papaparse";
import { useState } from "react";
import { getGpsSummary, parseGpsRows, type GpsParsedRow } from "@/lib/parsers/gps";

export default function GpsUploadPreview() {
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<GpsParsedRow[]>([]);
  const [error, setError] = useState<string>("");

  const summary = getGpsSummary(rows);

  function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    setError("");
    setRows([]);
    setFileName("");

    if (!file) return;

    setFileName(file.name);

    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      skipEmptyLines: true,
      delimiter: ";",
      complete: (result) => {
        try {
          const parsedRows = parseGpsRows(result.data);

          if (parsedRows.length === 0) {
            setError(
              "El archivo se ha leído, pero no se han encontrado jugadores válidos. Revisa si las columnas del CSV coinciden con el formato esperado."
            );
            return;
          }

          setRows(parsedRows);
        } catch (err) {
          console.error(err);
          setError("Ha ocurrido un error al interpretar el archivo GPS.");
        }
      },
      error: () => {
        setError("No se ha podido leer el archivo CSV.");
      },
    });
  }

  return (
    <section className="mt-8 rounded-2xl bg-white p-6 shadow">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-blue-600">
            GPS
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Carga y previsualización de archivo GPS
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Sube un archivo CSV exportado del sistema GPS. La aplicación leerá
            los registros, detectará las filas de Total si existen y mostrará
            una previsualización antes de guardar los datos.
          </p>
        </div>

        <label className="cursor-pointer rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow transition hover:bg-slate-800">
          Seleccionar CSV GPS
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {fileName && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-bold">Archivo seleccionado:</span> {fileName}
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Jugadores detectados
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {summary.players}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Distancia media
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {summary.averageDistanceM.toLocaleString("es-ES")} m
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                HSR total
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {summary.totalHsrM.toLocaleString("es-ES")} m
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">
                Sprint total
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {summary.totalSprintDistanceM.toLocaleString("es-ES")} m
              </p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Jugador</th>
                    <th className="px-4 py-3">Posición</th>
                    <th className="px-4 py-3">Sesión</th>
                    <th className="px-4 py-3">Tarea</th>
                    <th className="px-4 py-3">MD</th>
                    <th className="px-4 py-3">Distancia</th>
                    <th className="px-4 py-3">HSR</th>
                    <th className="px-4 py-3">Sprint</th>
                    <th className="px-4 py-3">Sprints</th>
                    <th className="px-4 py-3">Acc</th>
                    <th className="px-4 py-3">Dec</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {rows.map((row, index) => (
                    <tr key={`${row.player}-${index}`} className="bg-white">
                      <td className="px-4 py-3 font-bold text-slate-950">
                        {row.player}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.position || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.session || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.task || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.microcycleDay}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.totalDistanceM.toLocaleString("es-ES")} m
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.hsrM.toLocaleString("es-ES")} m
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.sprintDistanceM.toLocaleString("es-ES")} m
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.sprints}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.accelerations}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.decelerations}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Archivo GPS leído correctamente. En el siguiente paso añadiremos el
            guardado de esta sesión en Supabase.
          </div>
        </>
      )}
    </section>
  );
}