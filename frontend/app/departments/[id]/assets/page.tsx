import { Suspense } from "react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Plus, Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// This would be a server component in a real app
async function getDepartmentAssets(departmentId: string) {
  // In a real app, this would fetch from your API
  return {
    department: {
      id: departmentId,
      name: "Engineering",
      manager: "Jane Smith",
      location: "Building A, Floor 3",
      assetCount: 42,
    },
    assets: [
      {
        id: "1",
        name: "MacBook Pro",
        assetTag: "LT-2023-001",
        serialNumber: "C02ZW1ZXLVDL",
        status: "active",
        assignedTo: "John Doe",
        assignmentId: "assign-001",
        assignmentType: "permanent",
        assignmentDate: "2023-01-15T00:00:00.000Z",
      },
      {
        id: "2",
        name: "iPhone 13",
        assetTag: "PH-2023-042",
        serialNumber: "DNQPX1A2LLVM",
        status: "active",
        assignedTo: "Alice Johnson",
        assignmentId: "assign-002",
        assignmentType: "temporary",
        assignmentDate: "2023-02-10T00:00:00.000Z",
        dueDate: "2023-08-10T00:00:00.000Z",
      },
      {
        id: "3",
        name: "Dell XPS 15",
        assetTag: "LT-2023-015",
        serialNumber: "CN0H8CJK2942",
        status: "active",
        assignedTo: null,
        assignmentId: null,
        assignmentType: null,
        assignmentDate: null,
      },
    ],
    statistics: {
      totalAssets: 42,
      assignedAssets: 38,
      unassignedAssets: 4,
      temporaryAssignments: 12,
      overdueAssets: 2,
      assetsByCategory: [
        { category: "Laptops", count: 18 },
        { category: "Phones", count: 12 },
        { category: "Monitors", count: 8 },
        { category: "Accessories", count: 4 },
      ],
      assetsByStatus: [
        { status: "active", count: 38 },
        { status: "maintenance", count: 3 },
        { status: "decommissioned", count: 1 },
      ],
    },
  }
}

export default function DepartmentAssetsPage({ params }: { params: { id: string } }) {
  const { id } = params

  if (!id) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/departments">Departments</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href={`/departments/${id}`}>Department Details</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Department Assets</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Department Assets</h1>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href={`/departments/${id}/assets/report`}>
              <Download className="mr-2 h-4 w-4" /> Export Report
            </Link>
          </Button>
          <Button asChild>
            <Link href={`/assets/batch-assign?assigneeType=department&assigneeId=${id}`}>
              <Plus className="mr-2 h-4 w-4" /> Assign Assets
            </Link>
          </Button>
        </div>
      </div>

      <Suspense fallback={<DepartmentAssetsSkeleton />}>
        <DepartmentAssetsContent departmentId={id} />
      </Suspense>
    </div>
  )
}

function DepartmentAssetsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-24 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

async function DepartmentAssetsContent({ departmentId }: { departmentId: string }) {
  const data = await getDepartmentAssets(departmentId)

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{data.department.name}</CardTitle>
          <CardDescription>Department Information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Manager</p>
              <p>{data.department.manager}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Location</p>
              <p>{data.department.location}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
              <p>{data.department.assetCount}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Asset Allocation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Assigned</span>
                <span className="font-medium">{data.statistics.assignedAssets}</span>
              </div>
              <div className="flex justify-between">
                <span>Unassigned</span>
                <span className="font-medium">{data.statistics.unassignedAssets}</span>
              </div>
              <div className="flex justify-between">
                <span>Temporary</span>
                <span className="font-medium">{data.statistics.temporaryAssignments}</span>
              </div>
              <div className="flex justify-between">
                <span>Overdue</span>
                <span className="font-medium text-red-500">{data.statistics.overdueAssets}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Assets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.statistics.assetsByCategory.map((item) => (
                <div key={item.category} className="flex justify-between">
                  <span>{item.category}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Assets by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.statistics.assetsByStatus.map((item) => (
                <div key={item.status} className="flex justify-between">
                  <span className="capitalize">{item.status}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Assets</TabsTrigger>
          <TabsTrigger value="assigned">Assigned</TabsTrigger>
          <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted">
                    <tr>
                      <th scope="col" className="px-6 py-3">
                        Asset Name
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Asset Tag
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Assigned To
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Assignment Type
                      </th>
                      <th scope="col" className="px-6 py-3">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.assets.map((asset) => (
                      <tr key={asset.id} className="bg-card border-b">
                        <td className="px-6 py-4 font-medium">{asset.name}</td>
                        <td className="px-6 py-4">{asset.assetTag}</td>
                        <td className="px-6 py-4 capitalize">{asset.status}</td>
                        <td className="px-6 py-4">{asset.assignedTo || "Unassigned"}</td>
                        <td className="px-6 py-4 capitalize">{asset.assignmentType || "N/A"}</td>
                        <td className="px-6 py-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/assets/${asset.id}`}>View</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assigned">{/* Similar table but filtered for assigned assets */}</TabsContent>

        <TabsContent value="unassigned">{/* Similar table but filtered for unassigned assets */}</TabsContent>

        <TabsContent value="overdue">{/* Similar table but filtered for overdue assets */}</TabsContent>
      </Tabs>
    </>
  )
}
