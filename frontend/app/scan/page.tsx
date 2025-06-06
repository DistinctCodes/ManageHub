"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { AssetScanner } from "@/components/assets/asset-scanner"

export default function ScanPage() {
  const router = useRouter()
  const [isScanning, setIsScanning] = useState(true)

  const handleAssetFound = (assetId: string) => {
    setIsScanning(false)
    // The scanner component will handle navigation
  }

  const handleClose = () => {
    router.back()
  }

  return (
    <div className="container max-w-md py-6 space-y-6">
      <div className="flex items-center">
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold ml-2">Scan Asset</h1>
      </div>

      <AssetScanner onAssetFound={handleAssetFound} onClose={handleClose} autoNavigate={true} />

      <div className="text-center text-sm text-muted-foreground">
        <p>Point your camera at an asset QR code to scan it</p>
        <p>Make sure the QR code is well-lit and clearly visible</p>
      </div>
    </div>
  )
}
