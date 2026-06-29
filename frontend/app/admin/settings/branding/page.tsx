"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useGetBranding } from "@/lib/react-query/hooks/branding/useGetBranding";
import { useUpdateBranding } from "@/lib/react-query/hooks/branding/useUpdateBranding";
import {
  useUploadLogo,
  useUploadFavicon,
} from "@/lib/react-query/hooks/branding/useUploadBrandAsset";
import { Upload, RefreshCw } from "lucide-react";

export default function BrandingSettingsPage() {
  const { data: current, isLoading } = useGetBranding();

  const [hubName, setHubName] = useState("");
  const [primaryColorHex, setPrimaryColorHex] = useState("#111827");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  // Populate form from fetched branding
  useEffect(() => {
    if (!current) return;
    setHubName(current.hubName ?? "");
    setPrimaryColorHex(current.primaryColorHex ?? "#111827");
    setLogoUrl(current.logoUrl ?? null);
    setFaviconUrl(current.faviconUrl ?? null);
  }, [current]);

  const { mutate: saveBranding, isPending: saving } = useUpdateBranding();
  const { mutate: uploadLogo, isPending: uploadingLogo } = useUploadLogo(
    (url) => setLogoUrl(url)
  );
  const { mutate: uploadFavicon, isPending: uploadingFavicon } =
    useUploadFavicon((url) => setFaviconUrl(url));

  function handleSave() {
    saveBranding({
      hubName: hubName.trim() || undefined,
      primaryColorHex: primaryColorHex || undefined,
      logoUrl: logoUrl ?? undefined,
      faviconUrl: faviconUrl ?? undefined,
    });
    // Live-preview the colour
    document.documentElement.style.setProperty(
      "--color-primary",
      primaryColorHex
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Branding</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Customise how your hub appears to members.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="max-w-xl space-y-6">
          {/* Hub name */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Hub name
            </label>
            <input
              type="text"
              value={hubName}
              onChange={(e) => setHubName(e.target.value)}
              placeholder="ManageHub"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
          </div>

          {/* Primary colour */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Primary colour
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={primaryColorHex}
                onChange={(e) => setPrimaryColorHex(e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={primaryColorHex}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setPrimaryColorHex(v);
                }}
                maxLength={7}
                className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-gray-200"
              />
              <span className="text-xs text-gray-400">
                Used for active nav items, buttons, and accents.
              </span>
            </div>
          </div>

          {/* Logo */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Logo
            </label>
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <Image
                  src={logoUrl}
                  alt="Hub logo"
                  width={64}
                  height={64}
                  className="rounded-lg object-contain border border-gray-100"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  No logo
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploadingLogo ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingLogo ? "Uploading…" : "Upload logo"}
                </button>
                <p className="text-xs text-gray-400 mt-1.5">
                  PNG, SVG or JPG — recommended 200×200 px
                </p>
              </div>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadLogo(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Favicon */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Favicon
            </label>
            <div className="flex items-center gap-4">
              {faviconUrl ? (
                <Image
                  src={faviconUrl}
                  alt="Favicon"
                  width={32}
                  height={32}
                  className="rounded border border-gray-100 object-contain"
                />
              ) : (
                <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs">
                  —
                </div>
              )}
              <div>
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploadingFavicon}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {uploadingFavicon ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploadingFavicon ? "Uploading…" : "Upload favicon"}
                </button>
                <p className="text-xs text-gray-400 mt-1.5">
                  ICO, PNG or SVG — 32×32 px
                </p>
              </div>
            </div>
            <input
              ref={faviconInputRef}
              type="file"
              accept="image/*,.ico"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadFavicon(file);
                e.target.value = "";
              }}
            />
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save branding"}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
