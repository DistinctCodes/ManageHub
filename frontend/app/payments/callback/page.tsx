import { buildMetadata } from "@/lib/seo";
import PaymentCallbackContent from "./PaymentCallbackContent";

export const metadata = buildMetadata({
  title: "Payment Status",
  description: "View your payment status and confirmation details",
});

export default function PaymentCallbackPage() {
  return <PaymentCallbackContent />;
}
