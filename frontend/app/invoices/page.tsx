'use client'

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Download, 
  FileText, 
  Calendar, 
  User, 
  Mail, 
  Receipt, 
  AlertCircle, 
  Loader2,
  Printer
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

// TypeScript interfaces for safety type assertions
interface LineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  total: number
}

interface InvoiceDetailData {
  id: string
  invoiceNumber: string
  issueDate: string
  dueDate: string
  status: 'PAID' | 'UNPAID' | 'OVERDUE'
  memberName: string
  memberEmail: string
  lineItems: LineItem[]
  subtotal: number
  tax: number
  grandTotal: number
}

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string

  const [invoice, setInvoice] = React.useState<InvoiceDetailData | null>(null)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const [downloading, setDownloading] = React.useState<boolean>(false)

  // Fetch invoice details from API endpoint
  React.useEffect(() => {
    if (!id) return

    async function fetchInvoiceDetails() {
      try {
        setLoading(true)
        setError(null)
        
        // --- API ROUTE HOOK ---
        // Once your live backend routes are ready, un-comment the lines below:
        // const res = await fetch(`/api/invoices/${id}`)
        // if (!res.ok) throw new Error(res.status === 404 ? "Invoice not found" : "Failed to load invoice")
        // const data = await res.json()
        // setInvoice(data)

        // Mocking the data temporarily for validation matching INV-00001 specs
        await new Promise((resolve) => setTimeout(resolve, 800))
        
        if (id === "404") {
          throw new Error("Invoice not found")
        }

        setInvoice({
          id,
          invoiceNumber: `INV-${id.padStart(5, '0')}`,
          issueDate: "2026-06-01",
          dueDate: "2026-06-30",
          status: "UNPAID",
          memberName: "Muhammad A. Yahaya",
          memberEmail: "m-yahaya@lac-kadit.gov.ng",
          lineItems: [
            { id: "1", description: "Smart Contract Core Architecture Audit", quantity: 1, unitPrice: 1500.00, total: 1500.00 },
            { id: "2", description: "Monorepo Build Engineering & Turbo Config", quantity: 2, unitPrice: 450.00, total: 900.00 },
            { id: "3", description: "UI Component WCAG Optimization Modules", quantity: 5, unitPrice: 80.00, total: 400.00 },
          ],
          subtotal: 2800.00,
          tax: 140.00,
          grandTotal: 2940.00
        })
      } catch (err: any) {
        setError(err.message || "An error occurred while fetching invoice specifications.")
      } finally {
        setLoading(false)
      }
    }

    fetchInvoiceDetails()
  }, [id])

  // Triggers PDF generation and binary blob streaming download via API endpoint
  const handleDownloadPDF = async () => {
    if (!invoice) return
    try {
      setDownloading(true)
      
      // Triggering backend file stream endpoint
      const response = await fetch(`/api/invoices/${id}/pdf`, {
        method: 'GET',
      })

      if (!response.ok) throw new Error("Could not fetch document stream")

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.setAttribute('download', `Invoice-${invoice.invoiceNumber}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode?.removeChild(link)
    } catch (err) {
      console.error("PDF engine fallback activation triggered:", err)
      // Fallback window navigation if direct stream capture encounters an issue
      window.open(`/api/invoices/${id}/pdf`, '_blank')
    } finally {
      setDownloading(false)
    }
  }

  const getStatusBadge = (status: InvoiceDetailData['status']) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-1">Paid</Badge>
      case 'UNPAID':
        return <Badge variant="secondary" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold px-3 py-1">Unpaid</Badge>
      case 'OVERDUE':
        return <Badge variant="destructive" className="font-semibold px-3 py-1">Overdue</Badge>
    }
  }

  // Acceptance Criteria: Loading Skeleton block layout
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="flex justify-between items-center">
          <div className="space-y-2">
            <div className="h-8 w-48 bg-slate-200 rounded" />
            <div className="h-4 w-24 bg-slate-200 rounded" />
          </div>
          <div className="h-10 w-36 bg-slate-200 rounded" />
        </div>
        <Card className="border-slate-200">
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4"><div className="h-20 bg-slate-100 rounded" /><div className="h-20 bg-slate-100 rounded" /></div>
            <div className="h-40 bg-slate-100 rounded" />
            <div className="h-20 w-1/3 ml-auto bg-slate-100 rounded" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Acceptance Criteria: Clean Error state display block
  if (error || !invoice) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 text-center space-y-4">
        <div className="flex justify-center"><AlertCircle className="h-12 w-12 text-rose-500" /></div>
        <h2 className="text-xl font-bold text-slate-900">Document Retrieval Alert</h2>
        <p className="text-sm text-muted-foreground">{error || "The requested bill summary could not be found."}</p>
        <Button asChild className="w-full">
          <Link href="/invoices"><ArrowLeft className="mr-2 h-4 w-4" /> Return to Invoices</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Navigation and Controller Bar Layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Button variant="ghost" asChild className="w-fit pl-0 hover:bg-transparent text-muted-foreground hover:text-slate-900">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Invoices
          </Link>
        </Button>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="hidden sm:inline-flex">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
          <Button onClick={handleDownloadPDF} disabled={downloading} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
            {downloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Main Print/Screenshot-Optimized Invoice Sheet Panel */}
      <Card className="border-slate-200 shadow-sm bg-white overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="p-8 bg-slate-50/50 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 rounded-lg text-white"><FileText className="h-5 w-5" /></div>
                <CardTitle className="text-2xl font-black text-slate-900">{invoice.invoiceNumber}</CardTitle>
              </div>
              <p className="text-xs font-semibold text-indigo-600 tracking-wider uppercase">Billing Specification Matrix</p>
            </div>
            <div className="sm:text-right space-y-2">
              <div>{getStatusBadge(invoice.status)}</div>
              <div className="text-xs font-mono text-muted-foreground">ID: {invoice.id}</div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 space-y-8">
          {/* Metadata Section (Dates & Recipient Information) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/40 p-4 rounded-xl border border-slate-100">
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Billed To
              </h4>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-800">{invoice.memberName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Mail className="h-3 w-3" /> {invoice.memberEmail}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t md:border-t-0 md:border-l border-slate-200/60 pt-4 md:pt-0 md:pl-6">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Issue Date
                </span>
                <p className="text-xs font-semibold text-slate-700">{invoice.issueDate}</p>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due Date
                </span>
                <p className="text-xs font-bold text-rose-600">{invoice.dueDate}</p>
              </div>
            </div>
          </div>

          {/* Line Items Inventory Grid Table */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5" /> Breakdown Ledger
            </h4>
            <div className="rounded-lg border border-slate-100 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="text-xs font-bold text-slate-600">Description</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-600 w-[80px]">Qty</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-600 w-[120px]">Unit Price</TableHead>
                    <TableHead className="text-right text-xs font-bold text-slate-600 w-[120px]">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.lineItems.map((item) => (
                    <TableRow key={item.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm font-medium text-slate-800">{item.description}</TableCell>
                      <TableCell className="text-right text-sm text-slate-600 font-mono">{item.quantity}</TableCell>
                      <TableCell className="text-right text-sm text-slate-600 font-mono">${item.unitPrice.toFixed(2)}</TableCell>
                      <TableCell className="text-right text-sm font-semibold text-slate-800 font-mono">${item.total.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Ledger Financial Aggregates Section */}
          <div className="w-full sm:w-[320px] ml-auto space-y-3 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Subtotal</span>
              <span className="font-mono">${invoice.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500">
              <span>Tax (5%)</span>
              <span className="font-mono">${invoice.tax.toFixed(2)}</span>
            </div>
            <Separator className="bg-slate-200" />
            <div className="flex justify-between text-sm font-bold text-slate-900 pt-1">
              <span>Grand Total</span>
              <span className="text-indigo-600 font-mono text-base">${invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}