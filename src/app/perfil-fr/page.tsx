import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function PerfilFRPage() {
  return (
    <AppShell
      title="Perfil F-R"
      subtitle="Clasificación del perfil fuerza-reactividad del futbolista usando RSI modificado, VMP, 1RM estimada, 1RM relativa y peso corporal."
    >
      <ModulePlaceholder
        title="Perfil fuerza-reactividad"
        description="Esta sección permitirá detectar perfiles reactivos, perfiles de fuerza, perfiles mixtos y jugadores por desarrollar."
        items={[
          "RSI modificado",
          "VMP en sentadilla",
          "Carga utilizada",
          "Peso corporal",
          "1RM estimada",
          "1RM relativa",
          "Scatter por cuadrantes",
          "Ranking por perfil",
        ]}
      />
    </AppShell>
  );
}