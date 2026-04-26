import { DarkModeToggle } from "../components/DarkModeToggle";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-lg">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Settings</h1>

        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Dark Mode</p>
              <p className="text-xs text-gray-500">Toggle between light and dark theme</p>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </div>
  );
}
