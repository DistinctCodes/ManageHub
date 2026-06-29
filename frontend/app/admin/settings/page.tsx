"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuthState } from "@/lib/store/authStore";
import { useGetHubSettings } from "@/lib/react-query/hooks/admin/hub-settings/useGetHubSettings";
import { useUpdateHubSettings } from "@/lib/react-query/hooks/admin/hub-settings/useUpdateHubSettings";

const DAYS: { key: string; label: string }[] = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Nairobi",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "Africa/Accra",
  "UTC",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

type DayHours = { open: string; close: string; isOpen: boolean };
type BusinessHours = Record<string, DayHours>;

const DEFAULT_DAY = (): DayHours => ({
  open: "08:00",
  close: "20:00",
  isOpen: true,
});

function normalizeBusinessHours(input: unknown): BusinessHours {
  const out: BusinessHours = {};
  for (const d of DAYS) {
    const v = (input as Record<string, DayHours> | null | undefined)?.[d.key];
    out[d.key] =
      v && typeof v === "object"
        ? {
            open: v.open ?? "08:00",
            close: v.close ?? "20:00",
            isOpen: v.isOpen !== false,
          }
        : DEFAULT_DAY();
  }
  return out;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { user } = useAuthState();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";

  useEffect(() => {
    if (user && !isAdmin) router.replace("/dashboard");
  }, [user, isAdmin, router]);

  const { data, isLoading } = useGetHubSettings();
  const update = useUpdateHubSettings();
  const settings: any = (data as any)?.data ?? data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [address, setAddress] = useState("");
  const [taxRate, setTaxRate] = useState("0");
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [hours, setHours] = useState<BusinessHours>(
    Object.fromEntries(DAYS.map((d) => [d.key, DEFAULT_DAY()])),
  );

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!settings || hydrated) return;
    setName(settings.hubName ?? "");
    setDescription(settings.description ?? "");
    setContactEmail(settings.contactEmail ?? "");
    setContactPhone(settings.contactPhone ?? "");
    setLogoUrl(settings.logoUrl ?? "");
    setAddress(settings.address ?? "");
    setTaxRate(String(settings.taxRate ?? 0));
    setTimezone(settings.timezone ?? "Africa/Lagos");
    setHours(normalizeBusinessHours(settings.businessHours));
    setHydrated(true);
  }, [settings, hydrated]);

  if (!user || !isAdmin) return null;
  if (isLoading || !hydrated) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      </DashboardLayout>
    );
  }

  const setDay = (key: string, patch: Partial<DayHours>) => {
    setHours((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  };

  const handleSave = async () => {
    try {
      await update.mutateAsync({
        hubName: name,
        description,
        contactEmail,
        contactPhone,
        logoUrl,
        address,
        taxRate: Number(taxRate) || 0,
        timezone,
        businessHours: hours,
      });
      toast.success("Hub settings saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save hub settings");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Hub Settings</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Configure the basic details, opening hours, tax and timezone for
            this hub.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={update.isPending}
          className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {update.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save all
        </button>
      </div>

      {/* Basic Info */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Basic Info</h2>
        <p className="text-xs text-gray-400 mb-5">
          Shown on the hub page, invoices and member receipts.
        </p>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Hub Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contact Phone
              </label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Logo URL
            </label>
            <input
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://cdn.example.com/logo.png"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Public URL of the hub logo. A direct upload widget is planned for
              a follow-up PR.
            </p>
            {logoUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-10 w-10 rounded object-cover border border-gray-200"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
                />
                <span className="text-xs text-gray-400">Preview</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">Address</h2>
        <p className="text-xs text-gray-400 mb-5">
          Displayed on invoices and the hub public page.
        </p>
        <textarea
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          rows={2}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
        />
      </section>

      {/* Business Hours */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Business Hours
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Set the typical open and close times for each day. Closed days are
          not surfaced in the booking wizard.
        </p>
        <div className="space-y-3">
          {DAYS.map(({ key, label }) => {
            const d = hours[key] ?? DEFAULT_DAY();
            return (
              <div
                key={key}
                className="flex items-center flex-wrap gap-4 py-2 border-b border-gray-50 last:border-0"
              >
                <div className="w-28 text-sm font-medium text-gray-700">
                  {label}
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={d.isOpen}
                    onChange={(e) =>
                      setDay(key, { isOpen: e.target.checked })
                    }
                    className="rounded border-gray-300"
                  />
                  {d.isOpen ? "Open" : "Closed"}
                </label>
                <input
                  type="time"
                  value={d.open}
                  disabled={!d.isOpen}
                  onChange={(e) => setDay(key, { open: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm disabled:opacity-40"
                />
                <span className="text-gray-400 text-xs">to</span>
                <input
                  type="time"
                  value={d.close}
                  disabled={!d.isOpen}
                  onChange={(e) => setDay(key, { close: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm disabled:opacity-40"
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Tax + Currency + Timezone */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-900 mb-1">
          Tax, Currency & Timezone
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          Used when computing booking totals and invoices.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tax Rate (%)
            </label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Currency
            </label>
            <input
              value="NGN"
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Timezone
            </label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-200"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={update.isPending}
          className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {update.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save settings
        </button>
      </div>
    </DashboardLayout>
  );
}
