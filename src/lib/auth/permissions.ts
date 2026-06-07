export type AppRole = "admin" | "staff" | "viewer";

export const DEFAULT_ROLE: AppRole = "viewer";

export function isAppRole(value: unknown): value is AppRole {
  return value === "admin" || value === "staff" || value === "viewer";
}

export function canAccessRoute(role: AppRole, pathname: string) {
  if (role === "admin") {
    return true;
  }

  const adminOnlyRoutes = ["/admin", "/supabase-test"];

  const staffAndAdminRoutes = [
    "/cargar",
    "/cargar-gps",
    "/cargar-neuromuscular",
    "/cargar-tests",
  ];

  if (
    adminOnlyRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    return false;
  }

  if (
    staffAndAdminRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`),
    )
  ) {
    return role === "staff";
  }

  return true;
}

export function getRoleLabel(role: AppRole) {
  if (role === "admin") return "Administrador";
  if (role === "staff") return "Staff";
  return "Solo lectura";
}