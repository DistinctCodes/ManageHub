import { NewsletterConfirm } from "@/components/ui/NewsLetterConfirm";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

export default function NewsletterConfirmPage({ searchParams }: PageProps) {
  const tokenParam = searchParams?.token;
  const token =
    typeof tokenParam === "string" ? tokenParam : Array.isArray(tokenParam) ? tokenParam[0] : null;

  return <NewsletterConfirm token={token} />;
}
