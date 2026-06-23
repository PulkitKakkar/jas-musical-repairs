import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = {
  name: string;
  value: string;
  options: CookieOptions;
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies: CookieToSet[]) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookies.forEach(({ name, value, options }) => {
            response.cookies.set({ name, value, ...options });
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isReportsRoute = request.nextUrl.pathname.startsWith("/admin/reports");
  const reportMasterEmails = (process.env.REPORT_MASTER_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  const userEmail = user?.email?.toLowerCase();
  const isReportMaster = Boolean(userEmail && reportMasterEmails.includes(userEmail));

  if (isAdminRoute && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (isAdminRoute && isReportMaster && !isReportsRoute) {
    return NextResponse.redirect(new URL("/admin/reports", request.url));
  }
  if (request.nextUrl.pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }
  if (request.nextUrl.pathname === "/reports-login" && isReportMaster) {
    return NextResponse.redirect(new URL("/admin/reports", request.url));
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/reports-login"],
};
