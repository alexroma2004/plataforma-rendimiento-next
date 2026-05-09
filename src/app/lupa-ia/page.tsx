import AppShell from "@/components/layout/AppShell";
import ModulePlaceholder from "@/components/dashboard/ModulePlaceholder";

export default function LupaIAPage() {
  return (
    <AppShell
      title="Lupa IA"
      subtitle="Asistente interno basado en los datos reales de la plataforma para responder preguntas del staff sobre fatiga, GPS, jugadores y semanas."
    >
      <ModulePlaceholder
        title="Lupa IA basada en datos"
        description="No será un chatbot genérico: responderá únicamente con la información cargada en la aplicación."
        items={[
          "Estado del equipo esta semana",
          "Jugadores con más riesgo",
          "Métricas GPS pendientes",
          "Jugadores fuera de rango",
          "Comparación entre líneas",
          "Lectura integrada fatiga + GPS",
          "Alertas para el staff",
          "Resumen operativo",
        ]}
      />
    </AppShell>
  );
}