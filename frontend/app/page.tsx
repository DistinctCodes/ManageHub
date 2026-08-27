import Link from "next/link";

export const metadata = {
  title: "ManageHub - Smart Hub & Workspace Management",
  description:
    "Simplify how you manage workspaces, teams, and resources. ManageHub brings everything together in one place.",
};

export default function Home() {
  return (
    <main>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ManageHub
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/wallet"
            className="rounded-md border border-gray-300 dark:border-gray-700 px-4 py-2 font-medium"
          >
            Wallet
          </Link>
          <Link
            href="/login"
            className="rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-2 font-medium"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-32 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Simplify how you manage workspaces, teams, and resources.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400">
          ManageHub brings everything together in one place — streamline
          operations, manage resources, and boost productivity with our
          comprehensive management platform.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="rounded-md bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-6 py-3 font-medium"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-gray-300 dark:border-gray-700 px-6 py-3 font-medium"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          {
            title: "Workspace management",
            description:
              "Organize teams, spaces, and daily operations from a single dashboard.",
          },
          {
            title: "Resources & productivity",
            description:
              "Track and allocate resources so your team can focus on what matters.",
          },
          {
            title: "Smart hub operations",
            description:
              "Comprehensive oversight for modern hubs and workspaces.",
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-lg border border-gray-200 dark:border-gray-800 p-6"
          >
            <h2 className="text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </section>
    </main>
  );
}
