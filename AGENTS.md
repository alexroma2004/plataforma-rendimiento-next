# AGENTS.md — Plataforma de rendimiento 

## Contexto del proyecto

Este repositorio contiene una plataforma de rendimiento para fútbol semiprofesional.

* Nombre local: plataforma-rendimiento-next
* Repo: alexroma2004/plataforma-rendimiento-next
* Framework: Next.js 16.2.6 + React 19.2.4
* Lenguaje: TypeScript
* Estilos: Tailwind CSS
* Backend/datos: Supabase
* Deploy: Vercel
* App Router en `src/app`
* Componentes en `src/components`
* Helpers Supabase en `src/lib/supabase`

La app sirve para monitorizar rendimiento de jugadores de fútbol: GPS, control neuromuscular, tests físicos, perfil F-R, comparador, informes, Lupa IA y administración.

## Forma de trabajar

Trabaja siempre por bloques pequeños, concretos y verificables.

Antes de modificar archivos:

1. Lee los archivos implicados.
2. Explica brevemente qué vas a tocar.
3. No hagas refactors grandes salvo petición explícita.
4. No cambies estructuras globales sin necesidad.
5. Mantén la lógica existente salvo que el usuario pida cambiarla.

Cuando modifiques una página o componente:

1. Haz cambios mínimos.
2. Mantén nombres de rutas, tablas, columnas, imports y funciones.
3. No elimines lógica de cálculo o guardado.
4. Respeta el diseño responsive.
5. Usa componentes reutilizables ya existentes.

## Restricciones importantes

No tocar salvo petición explícita:

* Supabase RLS
* Auth
* roles
* `src/proxy.ts`
* políticas de seguridad
* migraciones SQL
* estructura de base de datos
* variables de entorno
* configuración de Vercel
* dependencias nuevas
* configuración global de Next.js

No añadir dependencias nuevas sin pedir confirmación.

No borrar ni reescribir lógica existente de:

* carga GPS
* carga neuromuscular
* carga de tests
* cálculos de dashboards
* filtros
* rankings
* gráficos
* exportaciones HTML/CSV
* permisos admin/staff/viewer
* guardado en Supabase

## Componentes UI existentes

Usa estos componentes cuando proceda:

```tsx
import StatusMessage from "@/components/ui/StatusMessage";
import EmptyState from "@/components/ui/EmptyState";
```

Uso esperado:

* `StatusMessage`: carga, error, éxito, advertencias funcionales o mensajes informativos.
* `EmptyState`: estados vacíos reales, sin datos, sin resultados, sin registros, sin jugadores o sin sesiones.

## Rutas principales

Rutas trabajadas:

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

## Estado actual

Ya se completó:

### Bloque 3.1

Responsive global.

### Bloque 3.2

Uso de `StatusMessage`.

### Bloque 3.3

Uso de `EmptyState` reutilizable global en rutas principales.

## Siguiente bloque sugerido

### Bloque 3.4 — Pulir análisis principales

Primera tarea:

```txt
Bloque 3.4.1 — Mejorar lectura e interpretación en /equipo
```

Archivo probable:

```txt
src/app/equipo/page.tsx
```

Objetivo:

* Mejorar lectura rápida del dashboard de equipo.
* Añadir interpretación de carga GPS.
* Añadir interpretación neuromuscular.
* Añadir señales simples de alerta.
* Añadir recomendaciones breves para cuerpo técnico.
* No tocar cálculos, Supabase, filtros, gráficos ni tablas salvo necesidad mínima.

## Comandos de validación

Después de cambios relevantes, ejecutar:

```bash
npm run build
```

Si existe lint configurado:

```bash
npm run lint
```

Antes de terminar, revisar:

```bash
git status
```

## Forma de entrega

Al terminar una tarea:

1. Resume archivos tocados.
2. Explica qué ha cambiado.
3. Explica qué NO se ha tocado.
4. Indica comandos ejecutados y resultado.
5. Si no se pudo ejecutar algo, dilo claramente.
6. No hagas commit ni push salvo que el usuario lo pida expresamente.
