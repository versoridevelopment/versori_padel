"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const PasswordCallbackPage = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sub = searchParams.get("sub");
    const hash = window.location.hash || ""; // incluye #access_token=...

    const url = new URL(window.location.href);
    const protocol = url.protocol;   // http: o https:
    const hostname = url.hostname;   // localhost o app.versori.com

    let target: string;

    if (sub) {
      if (hostname === "localhost") {
        // Entorno local: sub.localhost:3000
        target = `${protocol}//${sub}.localhost:3000/reset-password${hash}`;
      } else {
        // Producción: tomamos el dominio base (ej: app.versori.com -> versori.com)
        const parts = hostname.split(".");
        const baseDomain =
          parts.length > 2 ? parts.slice(-2).join(".") : hostname;

        target = `${protocol}//${sub}.${baseDomain}/reset-password${hash}`;
      }
    } else {
      // Fallback: si no vino sub, te quedás en el dominio central
      target = `${url.origin}/reset-password${hash}`;
    }

    window.location.replace(target);
  }, [searchParams]);

  // No necesitamos UI, es solo redirección
  return null;
};

export default PasswordCallbackPage;
