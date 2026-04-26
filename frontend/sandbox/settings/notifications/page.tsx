"use client";

import { useState, useCallback } from "react";
import { Bell } from "lucide-react";

type Pref = { email: boolean; inApp: boolean };
type Prefs = Record<string, Pref>;

const ITEMS = [
  "Booking confirmations",
  "Check-in reminders",
  "Payment receipts",
  "Newsletter",
  "New feature announcements",
];

const defaultPrefs = (): Prefs =>
  Object.fromEntries(ITEMS.map((k) => [k, { email: true, inApp: true }]));

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-gray-900" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [saving, setSaving] = useState(false);

  const toggle = useCallback((item: string, channel: "email" | "inApp") => {
    setPrefs((p) => {
      const next = { ...p, [item]: { ...p[item], [channel]: !p[item][channel] } };
      setSaving(true);
      // debounced mock save
      setTimeout(() => setSaving(false), 800);
      return next;
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="w-5 h-5 text-gray-500" />
        <h1 className="text-xl font-bold text-gray-900">Notification Preferences</h1>
        {saving && <span className="ml-auto text-xs text-gray-400">Saving...</span>}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        <div className="grid grid-cols-[1fr_80px_80px] px-5 py-2 text-xs font-medium text-gray-400">
          <span />
          <span className="text-center">Email</span>
          <span className="text-center">In-app</span>
        </div>
        {ITEMS.map((item) => (
          <div key={item} className="grid grid-cols-[1fr_80px_80px] items-center px-5 py-4">
            <span className="text-sm text-gray-800">{item}</span>
            <div className="flex justify-center">
              <Toggle checked={prefs[item].email} onChange={() => toggle(item, "email")} />
            </div>
            <div className="flex justify-center">
              <Toggle checked={prefs[item].inApp} onChange={() => toggle(item, "inApp")} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
