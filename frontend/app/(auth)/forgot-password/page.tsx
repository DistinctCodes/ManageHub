import { buildMetadata } from "@/lib/seo";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata = buildMetadata({
  title: "Forgot Password",
  description:
    "Reset your ManageHub account password. Enter your email and we'll send you a recovery link.",
});

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
