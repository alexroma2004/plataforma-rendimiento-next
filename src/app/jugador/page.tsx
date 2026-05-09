import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function JugadorPage() {
  return (
    <AppShell
      title="Jugador"
      subtitle="Análisis individual: evolución neuromuscular, baseline, PRE/POST, cumplimiento GPS semanal y objetivos pendientes."
    >
      <ModulePlaceholder
        title="Análisis individual"
        description="Aquí se concentrará la lectura específica de cada futbolista."
        items={[
          "Selección de jugador y semana",
          "Readiness individual",
          "Pérdida respecto a baseline",
          "Radar actual vs baseline",
          "PRE vs POST sesión",
          "Timeline neuromuscular",
          "Cumplimiento GPS semanal",
          "Qué le falta por hacer esta semana",
        ]}
      />
    </AppShell>
  );
}