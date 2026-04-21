import { NewsletterConfirm } from "@/components/ui/NewsLetterConfirm";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewsletterConfirmPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tokenParam = params?.token;
  const token =
    typeof tokenParam === "string"
      ? tokenParam
      : Array.isArray(tokenParam)
      ? tokenParam[0]
      : null;

  return <NewsletterConfirm token={token} />;
}
