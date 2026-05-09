import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function EquipoPage() {
  return (
    <AppShell
      title="Equipo"
      subtitle="Vista colectiva del estado del grupo: fatiga, readiness, cumplimiento GPS, alertas y lectura integrada para el staff."
    >
      <ModulePlaceholder
        title="Estado del equipo"
        description="Aquí se integrará la lectura colectiva de rendimiento neuromuscular, tests y GPS."
        items={[
          "KPIs generales del equipo",
          "Heatmap jugador × variable",
          "Objective loss score por jugador",
          "Readiness medio del grupo",
          "Resumen semanal GPS",
          "Sesión concreta con objetivos diarios del microciclo",
          "Alertas principales para el staff",
          "Matriz integrada de decisión",
        ]}
      />
    </AppShell>
  );
}