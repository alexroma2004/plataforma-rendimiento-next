import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessRoute,
  DEFAULT_ROLE,
  isAppRole,
  type AppRole,
} from "@/lib/auth/permissions";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const publicRoutes = ["/login"];

function isPublicRoute(pathname: string) {
  return publicRoutes.some((route) => {
    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

async function getUserRole(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<AppRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return DEFAULT_ROLE;
  }

  const role = data?.role;

  return isAppRole(role) ? role : DEFAULT_ROLE;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = Boolean(user);
  const isLoginPage = pathname === "/login";
  const isPublic = isPublicRoute(pathname);

  if (!isLoggedIn && !isPublic) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);

    return NextResponse.redirect(redirectUrl);
  }

  if (isLoggedIn && isLoginPage) {
    const redirectUrl = request.nextUrl.clone();

    redirectUrl.pathname = "/";
    redirectUrl.search = "";

    return NextResponse.redirect(redirectUrl);
  }

  if (isLoggedIn && user && pathname !== "/sin-permiso") {
    const role = await getUserRole(supabase, user.id);
    const hasAccess = canAccessRoute(role, pathname);

    if (!hasAccess) {
      const redirectUrl = request.nextUrl.clone();

      redirectUrl.pathname = "/sin-permiso";
      redirectUrl.searchParams.set("from", pathname);

      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)",
  ],
};