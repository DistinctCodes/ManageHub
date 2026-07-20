"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface CloudinaryUploadWidgetProps {
  onUpload: (url: string) => void;
  folder?: string;
  className?: string;
  resourceType?: "image" | "video" | "auto";
}

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

declare global {
  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (error: unknown, result: { event: string; info: { secure_url: string } }) => void
      ) => { open: () => void };
    };
  }
}

function loadCloudinaryScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || window.cloudinary) {
      resolve();
      return;
    }
    const existing = document.getElementById("cloudinary-widget-script");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      return;
    }
    const script = document.createElement("script");
    script.id = "cloudinary-widget-script";
    script.src = "https://upload-widget.cloudinary.com/global/all.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Cloudinary widget"));
    document.body.appendChild(script);
  });
}

export function CloudinaryUploadWidget({
  onUpload,
  folder,
  className,
  resourceType = "image",
}: CloudinaryUploadWidgetProps) {
  const widgetRef = useRef<{ open: () => void } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;
    setLoading(true);

    loadCloudinaryScript()
      .then(() => {
        if (cancelled || !window.cloudinary) return;
        widgetRef.current = window.cloudinary.createUploadWidget(
          {
            cloudName: CLOUD_NAME,
            uploadPreset: UPLOAD_PRESET,
            resourceType,
            folder,
            sources: ["local", "url", "camera"],
            multiple: false,
            maxFiles: 1,
          },
          (_err, result) => {
            if (result.event === "success") {
              onUpload(result.info.secure_url);
            }
          }
        );
        setLoading(false);
      })
      .catch(() => {
        setError("Upload widget unavailable");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [configured, folder, resourceType, onUpload]);

  if (!configured) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        Cloudinary is not configured. Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and
        NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET to enable uploads.
      </div>
    );
  }

  if (error) {
    return <div className={cn("text-sm text-destructive", className)}>{error}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => widgetRef.current?.open()}
      disabled={loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md border border-dashed border-input px-4 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <UploadCloud className="h-4 w-4" />
      )}
      Upload image
    </button>
  );
}

export default CloudinaryUploadWidget;
