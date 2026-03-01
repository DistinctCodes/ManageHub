import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Settings",
  description:
    "Manage your ManageHub account settings, security preferences, notifications, and appearance.",
  noindex: true,
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
