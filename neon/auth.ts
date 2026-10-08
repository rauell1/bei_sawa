import { jwtVerify, type JWTVerifyGetKey } from "jose";
import { HttpError } from "./service";

export function authenticateWith(jwks: JWTVerifyGetKey, issuer: string) {
  return async (request: Request): Promise<string> => {
    const header = request.headers.get("authorization") || "";
    if (!header.startsWith("Bearer ")) throw new HttpError(401, "Sign in required");
    try {
      const { payload } = await jwtVerify(header.slice(7), jwks, {
        issuer, algorithms: ["EdDSA"], requiredClaims: ["sub", "exp", "iat"],
      });
      if (!payload.sub || ["anonymous", "anon"].includes(payload.sub) || payload.is_anonymous === true || payload.isAnonymous === true || payload.role === "anonymous") throw new Error();
      return payload.sub;
    } catch { throw new HttpError(401, "Session expired or invalid; sign in again"); }
  };
}
