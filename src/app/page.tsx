"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import KpiCard from "@/components/ui/KpiCard";
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  DEFAULT_ROLE,
  getRoleLabel,
  isAppRole,
  type AppRole,
} from "@/lib/auth/permissions";

type ModuleCard = {
  title: string;
  description: string;
  href: string;
  badge: string;
  allowedRoles?: AppRole[];
};

const moduleCards: ModuleCard[] = [
  {
    title: "Cargar datos",
    description:
      "Importa sesiones GPS, neuromusculares y tests físicos desde archivos CSV.",
    href: "/cargar",
    badge: "Carga",
    allowedRoles: ["admin", "staff"],
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
    title: "Perfil F-R",
    description:
      "Analiza la relación entre RSI modificado, VMP y perfil neuromuscular del jugador.",
    href: "/perfil-fr",
    badge: "Perfil",
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
    allowedRoles: ["admin"],
  },
];

const roleDescriptions: Record<AppRole, string> = {
  admin:
    "Tienes acceso completo: consulta, carga de datos, administración y gestión de usuarios.",
  staff:
    "Puedes consultar todos los módulos deportivos y cargar datos, pero no acceder a administración.",
  viewer:
    "Puedes consultar información, dashboards, informes y análisis, sin modificar datos.",
};

const workflowItems = [
  {
    title: "1. Cargar",
    description:
      "Importa GPS, controles neuromusculares o tests físicos desde sus módulos específicos.",
  },
  {
    title: "2. Revisar",
    description:
      "Comprueba registros, jugadores vinculados, métricas detectadas y posibles datos incompletos.",
  },
  {
    title: "3. Analizar",
    description:
      "Consulta equipo, jugador, GPS, neuromuscular, tests, perfil F-R, comparador e informes.",
  },
];

function canSeeModule(module: ModuleCard, role: AppRole) {
  if (!module.allowedRoles) return true;

  return module.allowedRoles.includes(role);
}

function getRoleClass(role: AppRole) {
  if (role === "admin") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (role === "staff") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-800";
}

function ModuleLinkCard({ module }: { module: ModuleCard }) {
  return (
    <Link
      href={module.href}
      className="group rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:bg-white hover:shadow-md"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="break-words text-lg font-black text-slate-950">
            {module.title}
          </p>

          <p className="mt-2 break-words text-sm leading-6 text-slate-600">
            {module.description}
          </p>
        </div>

        <span className="w-fit shrink-0 rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">
          {module.badge}
        </span>
      </div>

      <p className="mt-4 text-sm font-black text-blue-600 group-hover:text-blue-700">
        Entrar →
      </p>
    </Link>
  );
}

export default function Home() {
  const [role, setRole] = useState<AppRole>(DEFAULT_ROLE);
  const [email, setEmail] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);

  useEffect(() => {
    async function loadRole() {
      try {
        setLoadingRole(true);

        const supabase = getSupabaseClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        setEmail(user?.email ?? "");

        if (!user) {
          setRole(DEFAULT_ROLE);
          return;
        }

        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        const userRole = data?.role;

        setRole(isAppRole(userRole) ? userRole : DEFAULT_ROLE);
      } finally {
        setLoadingRole(false);
      }
    }

    loadRole();
  }, []);

  const visibleModuleCards = useMemo(() => {
    return moduleCards.filter((module) => canSeeModule(module, role));
  }, [role]);

  const canUploadData = useMemo(() => {
    return role === "admin" || role === "staff";
  }, [role]);

  const canManageSystem = useMemo(() => {
    return role === "admin";
  }, [role]);

  return (
    <AppShell
      title="Rendimiento · Tests · GPS"
      subtitle="Panel principal de la plataforma profesional para monitorizar estado neuromuscular, tests físicos y carga externa GPS en fútbol."
      actions={
        <div className="flex flex-col gap-3 sm:flex-row">
          {canUploadData && (
            <Link
              href="/cargar"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950 shadow transition hover:bg-slate-100"
            >
              Cargar datos
            </Link>
          )}

          <Link
            href="/equipo"
            className="rounded-xl border border-white/20 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
          >
            Ver equipo
          </Link>
        </div>
      }
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
            title="Usuario"
            value={loadingRole ? "Cargando" : getRoleLabel(role)}
            subtitle={
              email
                ? `Sesión iniciada como ${email}.`
                : isSupabaseConfigured
                  ? "Sesión activa en la plataforma."
                  : "Supabase pendiente de configurar."
            }
            badge="Rol"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                  Acceso rápido
                </p>

                <h2 className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">
                  Módulos disponibles para tu rol
                </h2>

                <p className="mt-3 max-w-4xl break-words text-sm leading-6 text-slate-600">
                  Esta pantalla muestra únicamente los módulos disponibles para
                  el rol actual. Los usuarios de solo lectura no ven carga de
                  datos ni administración; el staff puede cargar datos; el
                  administrador ve toda la plataforma.
                </p>
              </div>

              <div
                className={`w-fit rounded-full border px-4 py-2 text-xs font-black ${getRoleClass(
                  role,
                )}`}
              >
                {loadingRole ? "Cargando rol..." : getRoleLabel(role)}
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {visibleModuleCards.map((module) => (
                <ModuleLinkCard key={module.href} module={module} />
              ))}
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-300 sm:tracking-[0.35em]">
                Rol actual
              </p>

              <h2 className="mt-2 text-xl font-black">
                {loadingRole ? "Cargando..." : getRoleLabel(role)}
              </h2>

              <p className="mt-3 break-words text-sm leading-6 text-slate-300">
                {roleDescriptions[role]}
              </p>

              {email && (
                <p className="mt-4 break-all rounded-xl border border-white/10 bg-white/5 p-3 text-xs font-bold text-slate-300">
                  {email}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
                Permisos
              </p>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="text-sm font-bold text-slate-700">
                    Consultar datos
                  </span>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Sí
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="text-sm font-bold text-slate-700">
                    Cargar datos
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      canUploadData
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {canUploadData ? "Sí" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="text-sm font-bold text-slate-700">
                    Administración
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      canManageSystem
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {canManageSystem ? "Sí" : "No"}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
              Estado actual
            </p>

            <h2 className="mt-2 text-xl font-black text-slate-950">
              Aplicación en fase funcional y protegida
            </h2>

            <p className="mt-3 break-words text-sm leading-6 text-slate-600">
              La plataforma ya cuenta con login obligatorio, roles de usuario,
              RLS activo en Supabase, carga de datos GPS, carga neuromuscular,
              carga de tests, dashboards de jugador y equipo, informes
              descargables, comparador, Lupa IA y administración.
            </p>

            <p className="mt-3 break-words text-sm leading-6 text-slate-600">
              La navegación y los accesos se adaptan al rol del usuario:
              administrador, staff o solo lectura.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-blue-600 sm:tracking-[0.35em]">
              Flujo recomendado
            </p>

            <div className="mt-4 space-y-3">
              {workflowItems.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                >
                  <p className="text-sm font-black text-slate-950">
                    {item.title}
                  </p>

                  <p className="mt-2 break-words text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}