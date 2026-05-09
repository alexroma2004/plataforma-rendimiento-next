import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function InformesPage() {
  return (
    <AppShell
      title="Informes"
      subtitle="Generación de informes individuales, informes de sesión, informes semanales y reportes globales para cuerpo técnico."
    >
      <ModulePlaceholder
        title="Informes descargables"
        description="Aquí se generarán informes visuales en HTML/PDF."
        items={[
          "Informe individual anual",
          "Informe individual por sesión",
          "Informe semanal integrado del jugador",
          "Informe entrenador sesión",
          "Informe semanal global",
          "Gráficos y tablas",
          "Conclusiones automáticas",
          "Exportación HTML/PDF",
        ]}
      />
    </AppShell>
  );
}