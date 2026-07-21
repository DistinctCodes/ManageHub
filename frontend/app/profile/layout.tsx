import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Profile",
  description:
    "View and edit your ManageHub profile, update your personal information, and manage your account.",
  noindex: true,
});

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
