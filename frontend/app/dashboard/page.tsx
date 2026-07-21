import { buildMetadata } from "@/lib/seo";
import DashboardContent from "./DashboardContent";

export const metadata = buildMetadata({
  title: "Dashboard",
  description:
    "Manage your workspace, projects, and team collaboration efficiently",
  keywords: [
    "dashboard",
    "workspace",
    "projects",
    "management",
    "team",
    "collaboration",
  ],
});

export default function DashboardPage() {
  return <DashboardContent />;
}
