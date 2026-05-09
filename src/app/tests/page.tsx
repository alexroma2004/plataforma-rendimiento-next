import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function TestsPage() {
  return (
    <AppShell
      title="Tests"
      subtitle="Módulo de valoración física: salto, fuerza, aceleración, velocidad, RSA, 30-15 IFT, rankings y referencias élite."
    >
      <ModulePlaceholder
        title="Tests físicos"
        description="Aquí se desarrollará el módulo de pretemporada y seguimiento físico."
        items={[
          "Crear sesión de tests",
          "Introducir resultados",
          "Radar de capacidades",
          "Referencias élite",
          "Rankings por capacidad",
          "Plantilla Excel/CSV",
          "Puntuaciones 1-10",
          "Evolución entre sesiones",
        ]}
      />
    </AppShell>
  );
}