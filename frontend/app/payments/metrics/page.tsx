import { redirect } from "next/navigation";

export default function LegacyPaymentMetricsPage() {
  redirect("/admin/payments/metrics");
}
