import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ComponentsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12 text-gray-950 dark:bg-gray-950 dark:text-gray-50">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wider text-gray-500">
            ManageHub UI
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Component catalog
          </h1>
          <p className="max-w-2xl text-gray-600 dark:text-gray-400">
            A route for reviewing shared components in isolation before they are
            used in a product workflow.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2" aria-label="Shared components">
          <Card>
            <CardHeader>
              <CardTitle>Buttons</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button>Primary action</Button>
              <Button variant="outline">Secondary action</Button>
              <Button variant="destructive">Destructive action</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm font-medium" htmlFor="catalog-input">
                Workspace name
              </label>
              <Input id="catalog-input" placeholder="Acme workspace" />
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  );
}