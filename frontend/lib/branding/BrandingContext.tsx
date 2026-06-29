"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface BrandingConfig {
  hubName: string;
  logoUrl: string | null;
  primaryColorHex: string | null;
  faviconUrl: string | null;
}

const DEFAULTS: BrandingConfig = {
  hubName: "ManageHub",
  logoUrl: null,
  primaryColorHex: null,
  faviconUrl: null,
};

const BrandingContext = createContext<BrandingConfig>(DEFAULTS);

export function useBranding() {
  return useContext(BrandingContext);
}

async function fetchBranding(): Promise<BrandingConfig> {
  const base =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";
  const res = await fetch(`${base}/hub-settings/branding`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error("branding fetch failed");
  const json = await res.json();
  return json as BrandingConfig;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULTS);

  useEffect(() => {
    fetchBranding()
      .then((cfg) => {
        setBranding(cfg);
        if (cfg.primaryColorHex) {
          document.documentElement.style.setProperty(
            "--color-primary",
            cfg.primaryColorHex
          );
        }
        if (cfg.faviconUrl) {
          const link =
            (document.querySelector("link[rel='icon']") as HTMLLinkElement) ||
            Object.assign(document.createElement("link"), { rel: "icon" });
          link.href = cfg.faviconUrl;
          document.head.appendChild(link);
        }
      })
      .catch(() => {
        // fall back silently to ManageHub defaults
      });
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
