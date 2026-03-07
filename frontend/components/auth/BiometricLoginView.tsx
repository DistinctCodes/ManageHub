"use client";

import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface BiometricLoginViewProps {
  onStartScan: () => void;
  onSwitchToEmail: () => void;
  className?: string;
  isScanning?: boolean;
}

export function BiometricLoginView({
  onStartScan,
  onSwitchToEmail,
  className,
  isScanning = false,
}: BiometricLoginViewProps) {
  return (
    <div className={cn("flex flex-col items-center space-y-8 py-8", className)}>
      {/* Scanner Icon */}
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-100">
          <Fingerprint className="h-10 w-10 text-[#0D9488]" />
        </div>
        {/* Scanning animation corners */}
        <div className="absolute -inset-2 rounded-full border-2 border-transparent">
          <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-[#0D9488] rounded-tl-full" />
          <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-[#0D9488] rounded-tr-full" />
          <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-[#0D9488] rounded-bl-full" />
          <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-[#0D9488] rounded-br-full" />
        </div>
      </div>

      {/* Content */}
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">
          Biometric Authentication
        </h3>
        <p className="text-gray-600 max-w-sm">
          Place your finger on the scanner or look at the camera to sign in
        </p>
      </div>

      {/* Start Scan Button */}
      <Button
        variant="default"
        size="lg"
        onClick={onStartScan}
        disabled={isScanning}
        className="px-8"
      >
        {isScanning ? "Scanning..." : "Start Scan"}
      </Button>

      {/* Fallback Link */}
      <button
        onClick={onSwitchToEmail}
        className="text-sm text-gray-900 hover:text-gray-700 focus:outline-none focus:underline"
      >
        Having trouble? Use email login
      </button>
    </div>
  );
}
