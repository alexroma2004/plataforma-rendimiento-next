import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function ComparadorPage() {
  return (
    <AppShell
      title="Comparador"
      subtitle="Comparación entre jugadores, fechas, microciclos y variables para analizar diferencias individuales y evolución temporal."
    >
      <ModulePlaceholder
        title="Comparador de jugadores"
        description="Esta sección permitirá comparar futbolistas de forma visual y objetiva."
        items={[
          "Jugador A vs Jugador B",
          "Comparación por variable",
          "Comparación contra baseline",
          "Comparación por microciclo",
          "Evolución temporal",
          "Radar comparativo",
          "Diferencias absolutas y porcentuales",
          "Tabla resumen",
        ]}
      />
    </AppShell>
  );
}