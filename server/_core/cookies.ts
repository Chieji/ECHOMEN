import type { CookieOptions, Request } from "express";

// Reserved for future use - domain-based cookie configuration
// const _LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);
// function _isIpAddress(_host: string) { ... }

function isSecureRequest(req: Request): boolean {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some(proto => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(
  req: Request
): Pick<CookieOptions, "domain" | "httpOnly" | "path" | "sameSite" | "secure"> {
  const isLocalhost = req.hostname === "localhost" || req.hostname === "127.0.0.1" || req.hostname === "::1";
  
  return {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: isSecureRequest(req),
    domain: isLocalhost ? undefined : ".echomen.app",
  };
}
