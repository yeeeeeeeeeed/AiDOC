import { NextRequest, NextResponse } from "next/server";

const BASE = "/aidoc";
const SSO_PORTAL = "http://swpsso.posco.net/idms/U61/jsp/redirect.jsp";

export function middleware(request: NextRequest) {
  // Next.js는 middleware의 pathname에서 basePath를 제거한다.
  // /aidoc       → pathname = "/"
  // /aidoc/home  → pathname = "/home"
  // 단, 환경에 따라 포함될 수도 있으므로 양쪽 모두 처리
  const { pathname } = request.nextUrl;

  // 루트 경로 → /aidoc/home 리다이렉트
  if (pathname === "/" || pathname === BASE || pathname === `${BASE}/`) {
    return NextResponse.redirect(new URL(`${BASE}/home`, request.url));
  }

  // API, 정적 파일은 통과 (basePath 포함/미포함 양쪽 처리)
  const bare = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  if (
    bare.startsWith("/api/") ||
    bare.startsWith("/_next/") ||
    bare.includes(".")
  ) {
    return NextResponse.next();
  }

  // DEV 바이패스
  if (process.env.NEXT_PUBLIC_DEV_BYPASS === "true") {
    const res = NextResponse.next();
    if (!request.cookies.get("AXI-USER-ID")) {
      res.cookies.set("AXI-USER-ID", "162264", { path: "/", maxAge: 86400 });
      res.cookies.set("AXI-USER-NAME", "개발자", { path: "/", maxAge: 86400 });
      res.cookies.set("AXI-SSO-TOKEN", "DEV_TOKEN", {
        path: "/",
        maxAge: 86400,
        httpOnly: true,
      });
    }
    return res;
  }

  // SSO 토큰 확인
  const ssoToken = request.cookies.get("AXI-SSO-TOKEN")?.value;
  if (!ssoToken) {
    // nginx가 전달하는 실제 도메인으로 callbackUrl 구성
    const proto = request.headers.get("x-forwarded-proto") || "https";
    const host = request.headers.get("host") || request.nextUrl.host;
    const origin = `${proto}://${host}`;
    const callbackUrl = `${origin}${BASE}/api/auth/sso/callback`;

    // returnTo: basePath 포함한 전체 경로
    const fullPath = pathname.startsWith(BASE) ? pathname : `${BASE}${pathname}`;
    const returnTo = fullPath === BASE ? `${BASE}/home` : fullPath;

    const res = NextResponse.redirect(
      `${SSO_PORTAL}?redir_url=${encodeURIComponent(callbackUrl)}`
    );
    res.cookies.set("AXI-RETURN-TO", returnTo, {
      path: "/",
      maxAge: 300,
      httpOnly: true,
    });
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon\\.ico).*)"],
};
