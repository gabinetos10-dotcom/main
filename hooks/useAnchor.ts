"use client";

import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { useLenisApi } from "@/components/providers/AppContext";

/**
 * Navigation par ancres : sur la home, on intercepte les liens `/#section`
 * pour un défilement Lenis fluide ; ailleurs, la navigation native reprend.
 */
export function useAnchor() {
  const pathname = usePathname();
  const { scrollTo } = useLenisApi();

  return useCallback(
    (href: string) => (e: React.MouseEvent) => {
      const hash = href.startsWith("/#") ? href.slice(1) : href.startsWith("#") ? href : null;
      if (hash && pathname === "/") {
        e.preventDefault();
        scrollTo(hash === "#top" ? 0 : hash);
        history.replaceState(null, "", href.startsWith("/") ? href : `/${href}`);
      }
    },
    [pathname, scrollTo]
  );
}
