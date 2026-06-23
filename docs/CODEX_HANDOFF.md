# CODEX_HANDOFF.md — Traspaso desde ChatGPT a Codex app

## Proyecto

Plataforma de rendimiento para UD Sanse.

Repo:
`alexroma2004/plataforma-rendimiento-next`

Stack:

* Next.js 16.2.6
* React 19.2.4
* TypeScript
* Tailwind CSS
* Supabase
* Vercel

## Estructura general

* `src/app`: rutas principales con App Router.
* `src/components/layout`: layout general y shell de navegación.
* `src/components/ui`: componentes reutilizables de interfaz.
* `src/lib/supabase`: clientes y helpers de Supabase.
* `src/lib/analytics`: lógica de insights y análisis.
* `src/proxy.ts`: protección/routing de acceso. No tocar salvo petición expresa.

## Rutas principales

* `/equipo`: dashboard global de equipo.
* `/jugador`: perfil individual de jugador.
* `/gps`: análisis de carga GPS.
* `/neuromuscular`: análisis CMJ, RSI mod, VMP, RPE.
* `/tests`: análisis de tests físicos.
* `/perfil-fr`: perfil fuerza-rendimiento.
* `/comparador`: comparación entre jugadores.
* `/informes`: generación HTML/CSV.
* `/lupa-ia`: insights automáticos.
* `/admin`: auditoría e integridad de datos.
* `/admin/usuarios`: gestión de roles.
* `/cargar`: hub de carga.
* `/cargar-gps`: importación GPS.
* `/cargar-neuromuscular`: importación neuromuscular.
* `/cargar-tests`: importación tests físicos.

## Componentes UI creados

### StatusMessage

Archivo:
`src/components/ui/StatusMessage.tsx`

Uso:

* errores
* carga
* éxito
* avisos funcionales
* mensajes informativos

### EmptyState

Archivo:
`src/components/ui/EmptyState.tsx`

Uso:

* sin datos
* sin resultados
* sin registros
* sin jugadores
* sin sesiones
* estados vacíos reales

## Bloques completados

### Bloque 3.1 — Responsive global

Se revisaron y adaptaron las rutas principales para móvil/tablet/escritorio.

### Bloque 3.2 — StatusMessage global

Se sustituyeron mensajes sueltos por `StatusMessage` en rutas principales.

### Bloque 3.3 — EmptyState global

Se aplicó `EmptyState` reutilizable en:

* `/equipo`
* `/jugador`
* `/gps`
* `/neuromuscular`
* `/tests`
* `/perfil-fr`
* `/comparador`
* `/informes`
* `/lupa-ia`
* `/admin`
* `/admin/usuarios`
* `/cargar`
* `/cargar-gps`
* `/cargar-neuromuscular`
* `/cargar-tests`

## Estado funcional

Ya funcionan:

* login obligatorio
* roles
* `/admin/usuarios`
* sidebar por rol
* rutas principales
* carga GPS
* carga neuromuscular
* carga tests
* dashboards
* informes
* comparador
* Lupa IA

## Reglas de trabajo

No hacer grandes refactors.
No tocar Supabase RLS, Auth, roles ni `src/proxy.ts`.
No cambiar estructura de base de datos.
No añadir dependencias sin confirmación.
No tocar lógica de guardado en Supabase salvo petición explícita.
No romper responsive.
Trabajar por bloques pequeños.

## Siguiente bloque

### Bloque 3.4 — Pulir análisis principales

Primera tarea recomendada:

```txt
Bloque 3.4.1 — Mejorar lectura e interpretación en /equipo
```

Archivo:
`src/app/equipo/page.tsx`

Objetivo:

* Añadir lectura rápida del estado del equipo.
* Interpretar carga GPS.
* Interpretar estado neuromuscular.
* Detectar señales simples de alerta.
* Añadir recomendaciones breves para cuerpo técnico.
* Mantener cálculos, filtros, gráficos y tablas.
* No tocar Supabase ni permisos.

## Validación esperada

Después de cambios:

```bash
npm run build
```

Opcional:

```bash
npm run lint
```

Revisar:

```bash
git status
```

No hacer commit ni push salvo instrucción explícita del usuario.
