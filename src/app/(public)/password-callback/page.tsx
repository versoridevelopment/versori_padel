"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

const PasswordCallbackPage = () => {
  const searchParams = useSearchParams();

  useEffect(() => {
    const sub = searchParams.get("sub");

    const url = new URL(window.location.href);
    const protocol = url.protocol;   // https:
    const hostname = url.hostname;   // versorisports.com o localhost

    // ✅ Mantener hash por si viene (flujo implícito)
    const hash = window.location.hash || "";

    // ✅ Mantener querystring completo, pero SIN el sub (sub solo sirve para rutear)
    const params = new URLSearchParams(url.search);
    params.delete("sub");
    const qs = params.toString() ? `?${params.toString()}` : "";

    let target: string;

    if (sub) {
      if (hostname === "localhost") {
        // local: http://sub.localhost:3000
        target = `${protocol}//${sub}.localhost:3000/reset-password${qs}${hash}`;
      } else {
        // prod: https://sub.versorisports.com
        const parts = hostname.split(".");
        const baseDomain = parts.length > 2 ? parts.slice(-2).join(".") : hostname;

        target = `${protocol}//${sub}.${baseDomain}/reset-password${qs}${hash}`;
      }
    } else {
      // fallback si no vino sub
      target = `${url.origin}/reset-password${qs}${hash}`;
    }

    window.location.replace(target);
  }, [searchParams]);

  return null;
};

export default PasswordCallbackPage;
