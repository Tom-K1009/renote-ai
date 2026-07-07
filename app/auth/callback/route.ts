import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

function createAuthErrorRedirect(
  redirectOrigin: string,
  message = "auth"
) {
  const redirectUrl = new URL("/login", redirectOrigin);
  redirectUrl.searchParams.set("error", "auth");
  redirectUrl.searchParams.set("message", message);
  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const oauthError = requestUrl.searchParams.get("error");
  const oauthErrorCode = requestUrl.searchParams.get("error_code");
  const oauthErrorDescription = requestUrl.searchParams.get("error_description");
  const next = requestUrl.searchParams.get("next") ?? "/app";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? requestUrl.origin;
  const redirectOrigin = new URL(siteUrl).origin;
  const safeNext = next.startsWith("/") ? next : "/app";
  const successUrl = new URL(safeNext, redirectOrigin);

  if (oauthError) {
    console.error("[auth/callback] OAuth provider returned error", {
      error: oauthError,
      error_code: oauthErrorCode,
      error_description: oauthErrorDescription
    });
    return createAuthErrorRedirect(
      redirectOrigin,
      oauthErrorDescription || oauthErrorCode || oauthError
    );
  }

  if (!code) {
    console.error("[auth/callback] Missing code parameter", {
      callbackUrl: requestUrl.origin + requestUrl.pathname
    });
    return createAuthErrorRedirect(redirectOrigin, "missing_code");
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[auth/callback] Missing Supabase environment variables", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasSupabaseAnonKey: Boolean(supabaseAnonKey)
    });
    return createAuthErrorRedirect(redirectOrigin, "missing_supabase_env");
  }

  const response = NextResponse.redirect(successUrl);
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: Parameters<typeof response.cookies.set>[2];
          }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] exchangeCodeForSession failed", {
      message: error.message,
      name: error.name,
      status: error.status
    });
    return createAuthErrorRedirect(
      redirectOrigin,
      error.message || "exchange_failed"
    );
  }

  return response;
}
