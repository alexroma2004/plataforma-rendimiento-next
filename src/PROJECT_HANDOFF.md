# PROJECT_HANDOFF.md

## Proyecto

Este documento resume el estado actual del proyecto `plataforma-rendimiento-next` para poder retomarlo en otra conversación, con Codex o con cualquier asistente técnico sin perder contexto.

Este proyecto forma parte del trabajo conocido como **APP EN VERCEL**. La conversación original de desarrollo se llamaba **CREAR APP VERCEL**, pero se volvió demasiado larga y difícil de abrir. Este archivo sirve como traspaso técnico.

---

## Datos básicos

**Nombre local del proyecto:**
`plataforma-rendimiento-next`

**Ruta local habitual:**
`C:\Users\Usuario\Desktop\plataforma-rendimiento-next`

**Repositorio GitHub:**
`https://github.com/alexroma2004/plataforma-rendimiento-next.git`

**Rama principal:**
`main`

**URL de producción en Vercel:**
`https://plataforma-rendimiento-next.vercel.app/`

**Stack:**

* Next.js 16.2.6
* React 19.2.4
* TypeScript
* Tailwind CSS
* Supabase
* Supabase Auth
* Supabase RLS
* Vercel
* Recharts
* Papaparse
* XLSX

---

## Dependencias relevantes

Versiones importantes según `package.json`:

```json
{
  "@supabase/ssr": "^0.10.3",
  "@supabase/supabase-js": "^2.105.4",
  "next": "16.2.6",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "recharts": "^3.8.1",
  "papaparse": "^5.5.3",
  "xlsx": "^0.18.5"
}
```

---

## Estado actual

La app está funcional en:

* local,
* GitHub,
* Vercel.

Estado confirmado:

* La app funciona en local.
* La app funciona en Vercel.
* La app está subida a GitHub.
* La versión con login, roles, RLS y `/admin/usuarios` está en GitHub y desplegada en Vercel.
* El usuario principal del propietario está asignado como `admin` en `public.user_roles`.
* El login obligatorio funciona.
* Los roles `admin`, `staff` y `viewer` funcionan.
* RLS por rol está aplicado y probado.
* La gestión de usuarios en `/admin/usuarios` funciona.
* El dashboard principal respeta roles.
* El sidebar respeta roles.
* Supabase funciona en producción.
* Vercel despliega correctamente tras `git push`.

---

## Rutas actuales

Rutas existentes y funcionales:

```txt
/
 /login
 /sin-permiso
 /cargar
 /cargar-gps
 /cargar-neuromuscular
 /cargar-tests
 /gps
 /neuromuscular
 /tests
 /equipo
 /jugador
 /perfil-fr
 /comparador
 /informes
 /lupa-ia
 /admin
 /admin/usuarios
```

Descripción:

* `/` — Dashboard principal adaptado a roles.
* `/login` — Login obligatorio con Supabase Auth.
* `/sin-permiso` — Página de acceso denegado.
* `/cargar` — Carga general de datos.
* `/cargar-gps` — Carga específica GPS.
* `/cargar-neuromuscular` — Carga específica neuromuscular.
* `/cargar-tests` — Carga específica tests.
* `/gps` — Módulo GPS.
* `/neuromuscular` — Módulo neuromuscular.
* `/tests` — Módulo tests físicos.
* `/equipo` — Dashboard de equipo.
* `/jugador` — Dashboard individual.
* `/perfil-fr` — Perfil F-R.
* `/comparador` — Comparador.
* `/informes` — Informes HTML/CSV.
* `/lupa-ia` — Insights automáticos.
* `/admin` — Administración.
* `/admin/usuarios` — Gestión de usuarios y roles.

---

## Módulos operativos

Módulos ya funcionales:

* Carga GPS.
* Carga neuromuscular.
* Carga tests.
* Dashboard equipo.
* Dashboard jugador.
* GPS.
* Tests.
* Neuromuscular.
* Perfil F-R.
* Comparador.
* Informes HTML/CSV.
* Lupa IA.
* Administración.
* Gestión de usuarios y roles.

---

## Tablas de Supabase

Tablas existentes:

```txt
app_connection_test
elite_references
gps_records
gps_sessions
neuromuscular_records
neuromuscular_sessions
player_profiles
players
teams
test_results
test_scores
test_sessions
user_roles
```

Tablas principales de la aplicación:

```txt
teams
players
player_profiles
gps_sessions
gps_records
neuromuscular_sessions
neuromuscular_records
test_sessions
test_results
test_scores
elite_references
user_roles
```

`app_connection_test` existe, pero no es central para los módulos principales.

---

## Autenticación

La app tiene login obligatorio mediante Supabase Auth.

Variables de entorno usadas:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Estas variables están configuradas en:

* `.env.local` para local;
* Vercel Environment Variables para producción.

No guardar ni compartir claves en este archivo.
No usar `service_role` en frontend.

---

## Protección de rutas en Next.js 16

Este proyecto usa Next.js 16.2.6 y estructura `src/app`.

Archivo correcto de protección:

```txt
src/proxy.ts
```

No usar:

```txt
middleware.ts
```

Tampoco usar:

```txt
proxy.ts
```

en la raíz del proyecto.

Problema ya resuelto:
Al principio el login no redirigía porque se intentó usar `middleware.ts` o `proxy.ts` en la raíz. La solución correcta fue mover la lógica a `src/proxy.ts`.

---

## Roles

Roles actuales:

```txt
admin
staff
viewer
```

Tabla de roles:

```txt
public.user_roles
```

Tipo enum:

```txt
public.app_role
```

Permisos conceptuales:

### admin

* Ve todo.
* Puede cargar datos.
* Puede administrar.
* Puede gestionar usuarios.
* Puede borrar.
* En RLS: `select`, `insert`, `update`, `delete`.

### staff

* Ve módulos de análisis.
* Puede cargar datos.
* No puede entrar en administración.
* No puede entrar en `/admin/usuarios`.
* No puede borrar.
* En RLS: `select`, `insert`, `update`.

### viewer

* Solo consulta.
* No ve carga de datos.
* No ve administración.
* No ve usuarios.
* No puede escribir.
* En RLS: `select`.

La interfaz respeta roles:

* Sidebar adaptado a rol.
* Dashboard principal adaptado a rol.
* `/admin` y `/admin/usuarios` solo admin.
* Rutas de carga solo admin/staff.
* Viewer no accede a carga ni administración.

La base de datos también respeta roles mediante RLS por rol.

---

## Funciones SQL importantes

Funciones ya creadas:

```sql
public.get_my_role()
public.is_admin()
public.current_app_role()
public.can_read_data()
public.can_write_data()
public.can_delete_data()
public.apply_role_policies(target_table text)
public.upsert_user_role_by_email(target_email text, target_role public.app_role)
```

`upsert_user_role_by_email` permite que un admin asigne rol desde la app a un usuario ya existente en Supabase Auth.

Flujo seguro para usuarios:

1. Crear usuario en Supabase Dashboard → Authentication → Users.
2. Entrar en la app como admin.
3. Ir a `/admin/usuarios`.
4. Asignar rol por email.

No crear usuarios Auth desde frontend porque requeriría `service_role`.

---

## Archivos relevantes

### `src/proxy.ts`

Protege rutas privadas.
Redirige a `/login` si no hay sesión.
Redirige a `/sin-permiso` si el rol no tiene acceso.
Redirige de `/login` a `/` si ya hay sesión activa.

### `src/app/login/page.tsx`

Página de login con email y contraseña usando Supabase Auth.

### `src/app/sin-permiso/page.tsx`

Página de acceso denegado.

### `src/lib/auth/permissions.ts`

Define:

```ts
AppRole = "admin" | "staff" | "viewer"
DEFAULT_ROLE = "viewer"
isAppRole()
canAccessRoute()
getRoleLabel()
```

### `src/components/layout/Sidebar.tsx`

Sidebar con:

* lectura de usuario actual;
* lectura de rol desde `user_roles`;
* navegación visible según rol;
* botón cerrar sesión;
* muestra email y rol del usuario.

### `src/app/page.tsx`

Dashboard principal adaptado a roles.

### `src/lib/supabase/client.ts`

Cliente Supabase para navegador/cliente.
Usa `createBrowserClient` de `@supabase/ssr` en navegador y `createClient` normal en servidor/build.

### `src/lib/supabase/server.ts`

Cliente server con cookies usando `@supabase/ssr` y `next/headers`.

### `src/lib/supabase/user-roles.ts`

Funciones:

```ts
getUserRolesFromSupabase()
upsertUserRoleByEmail()
```

### `src/app/admin/usuarios/page.tsx`

Gestión de usuarios y roles. Solo admin.

---

## Flujo de trabajo recomendado

Todo cambio debe seguir este flujo:

```bash
npm run build
npm run dev
```

Probar en:

```txt
http://localhost:3000
```

Probar con roles si afecta a permisos:

* admin;
* staff;
* viewer.

Si todo funciona:

```bash
git status
git add .
git commit -m "mensaje claro"
git push
```

Después esperar deploy automático de Vercel y probar:

```txt
https://plataforma-rendimiento-next.vercel.app/
```

Recordatorio:

* `localhost:3000` muestra cambios locales.
* Vercel muestra la última versión subida a GitHub y desplegada.
* Si algo funciona localmente pero no en Vercel, probablemente falta `git push` o esperar el deploy.

---

## Problemas ya resueltos

### Login no redirigía

Solución: usar `src/proxy.ts`.

### `Invalid login credentials`

Solución: crear correctamente el usuario en Supabase Auth y usar la contraseña de ese usuario.

### Sidebar no mostraba rol en Vercel

Causa: Vercel no se actualiza hasta hacer `git push`.

### Error SQL con email

El email debe ir entre comillas simples:

```sql
lower('email@dominio.com')
```

### RLS

RLS ya está aplicado por rol y funciona. No modificarlo sin necesidad.

### `service_role`

No usar en frontend.

---

## Último paso pendiente

El bloque responsive móvil/tablet NO se ha realizado.

No se han sustituido todavía:

```txt
src/components/layout/AppShell.tsx
src/components/layout/Sidebar.tsx
```

por versiones responsive.

El siguiente paso exacto pendiente es:

1. Adaptar `AppShell` y `Sidebar` a móvil/tablet.
2. En escritorio debe verse igual que ahora.
3. En móvil/tablet:

   * sidebar oculto por defecto;
   * botón “Menú”;
   * sidebar lateral desplegable;
   * overlay para cerrar;
   * cierre al tocar fuera;
   * cierre al navegar.
4. Después mejorar tablas y tarjetas en móvil.

Antes de aplicar responsive, pedir o revisar el contenido actual de:

```txt
src/components/layout/AppShell.tsx
src/components/layout/Sidebar.tsx
```

---

## Hoja de ruta próxima

Orden deseado:

1. Responsive móvil/tablet: `AppShell` + `Sidebar`.
2. Mejorar tablas en móvil.
3. Pulido visual general.
4. Mejorar informes HTML/CSV.
5. Mejorar Lupa IA.
6. Añadir edición/borrado controlado de datos.
7. Crear backups/exportaciones.
8. Preparar uso real de temporada.

---

## Instrucciones para futuros asistentes

No hacer refactors grandes ni cambios masivos.

Trabajar por bloques pequeños, claros y verificables.

Dar código completo del archivo a sustituir siempre que sea posible.

Si se necesita tocar un archivo y no se conoce su estado actual, pedir primero su contenido.

No tocar RLS ni seguridad sin probar localmente.

No pedir claves, contraseñas ni valores de `.env.local`.

No meter `service_role` en frontend.

El siguiente bloque de trabajo recomendado es:

```txt
Responsive móvil/tablet empezando por AppShell + Sidebar.
```
