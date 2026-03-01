import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Sign In",
  description:
    "Sign in to your ManageHub account to access your workspace dashboard, team management, and resources.",
});

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
