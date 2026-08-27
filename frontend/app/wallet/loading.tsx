export default function WalletLoading() {
  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <div className="h-8 w-24 mb-6 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
      <div
        className="rounded-lg border border-gray-200 dark:border-gray-800 p-6 space-y-4"
        aria-hidden="true"
      >
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-8 w-40 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800 animate-pulse" />
      </div>
    </main>
  );
}
