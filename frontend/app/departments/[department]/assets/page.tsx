"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Package, Calendar, Tag, User, ArrowRightLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { assetApi } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

export default function DepartmentAssetsPage({ params }: { params: { department: string } }) {
  const router = useRouter()
  const [assets, setAssets] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const department = decodeURIComponent(params.department)

  useEffect(() => {
    const fetchAssets = async () => {
      setIsLoading(true)
      try {
        const response = await assetApi.getAssetsByDepartment(department)
        setAssets(response.data)
      } catch (error) {
        console.error("Error fetching assets:", error)
        toast({
          title: "Error",
          description: "Failed to load department assets. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAssets()
  }, [department])

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800"
      case "assigned":
        return "bg-blue-100 text-blue-800"
      case "maintenance":
        return "bg-yellow-100 text-yellow-800"
      case "retired":
        return "bg-gray-100 text-gray-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  // Get condition badge color
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-100 text-green-800"
      case "good":
        return "bg-blue-100 text-blue-800"
      case "fair":
        return "bg-yellow-100 text-yellow-800"
      case "poor":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center gap-2 mb-6">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Group assets by assignment status
  const assignedAssets = assets.filter((asset) => asset.assignedToId)
  const unassignedAssets = assets.filter((asset) => !asset.assignedToId)

  return (
    <div className="container mx-auto py-8">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{department} Department Assets</h1>
      </div>

      {/* Department Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assignedAssets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{unassignedAssets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">In Maintenance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{assets.filter((a) => a.status === "maintenance").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Assets Grid */}
      {assets.length > 0 ? (
        <div className="space-y-6">
          {/* Assigned Assets */}
          {assignedAssets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Assigned Assets ({assignedAssets.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {assignedAssets.map((asset) => (
                  <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{asset.name}</h3>
                          <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
                        </div>
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(asset.status)}>
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </Badge>
                          <Badge className={getConditionColor(asset.condition)}>
                            {asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1)}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span>{asset.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <Link
                              href={`/users/${asset.assignedTo.id}/assets`}
                              className="text-blue-600 hover:underline"
                            >
                              {asset.assignedTo.name}
                            </Link>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>Assigned: {formatDate(new Date(asset.assignedAt))}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/assets/${asset.id}`}>View Details</Link>
                          </Button>
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/assets/${asset.id}/transfer`}>
                              <ArrowRightLeft className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned Assets */}
          {unassignedAssets.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Available Assets ({unassignedAssets.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {unassignedAssets.map((asset) => (
                  <Card key={asset.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-lg">{asset.name}</h3>
                          <p className="text-sm text-muted-foreground">{asset.assetTag}</p>
                        </div>
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Badge className={getStatusColor(asset.status)}>
                            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
                          </Badge>
                          <Badge className={getConditionColor(asset.condition)}>
                            {asset.condition.charAt(0).toUpperCase() + asset.condition.slice(1)}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-muted-foreground" />
                            <span>{asset.type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Not assigned</span>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={`/assets/${asset.id}`}>View Details</Link>
                          </Button>
                          <Button size="sm" asChild>
                            <Link href={`/assets/${asset.id}/transfer`}>Assign</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assets found in {department} department</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
