import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Create Account",
  description:
    "Sign up for ManageHub and start managing your workspace, team, and resources in one place.",
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
