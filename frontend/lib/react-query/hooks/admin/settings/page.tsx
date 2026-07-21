'use client';

import React, { useState, useEffect } from 'react';
import { useGetHubSettings, BusinessHour } from '@/lib/react-query/hooks/admin/settings/useGetHubSettings';
import { useUpdateHubSettings } from '@/lib/react-query/hooks/admin/settings/useUpdateHubSettings';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';
import { Loader2, Upload, Building, Clock, Calendar, Landmark, Palette } from 'lucide-react';

const TIME_INTERVALS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2).toString().padStart(2, '0');
  const minutes = i % 2 === 0 ? '00' : '30';
  return `${hours}:${minutes}`;
});

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function AdminSettingsPage() {
  const { data: settings, isLoading, isError } = useGetHubSettings();
  const { mutate: updateSettings, isPending } = useUpdateHubSettings();

  // Local Form States
  const [general, setGeneral] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    contactEmail: '',
    contactPhone: '',
  });

  const [bookingRules, setBookingRules] = useState({
    leadTimeHours: 0,
    maxDaysAhead: 0,
    cancellationPolicyHours: 0,
  });

  const [businessHours, setBusinessHours] = useState<BusinessHour[]>(
    DAYS_OF_WEEK.map((day) => ({ day, isOpen: true, openTime: '08:00', closeTime: '17:00' }))
  );

  const [financial, setFinancial] = useState({
    vatRatePercent: 0,
    currency: 'NGN',
  });

  const [branding, setBranding] = useState({
    logoUrl: '',
    faviconUrl: '',
    primaryColorHex: '#000000',
  });

  // Populate state on load
  useEffect(() => {
    if (settings) {
      setGeneral({
        name: settings.name || '',
        address: settings.address || '',
        city: settings.city || '',
        country: settings.country || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
      });
      setBookingRules({
        leadTimeHours: settings.leadTimeHours || 0,
        maxDaysAhead: settings.maxDaysAhead || 0,
        cancellationPolicyHours: settings.cancellationPolicyHours || 0,
      });
      if (settings.businessHours?.length) {
        setBusinessHours(settings.businessHours);
      }
      setFinancial({
        vatRatePercent: settings.vatRatePercent || 0,
        currency: settings.currency || 'NGN',
      });
      setBranding({
        logoUrl: settings.logoUrl || '',
        faviconUrl: settings.faviconUrl || '',
        primaryColorHex: settings.primaryColorHex || '#000000',
      });
    }
  }, [settings]);

  const handleSave = (sectionName: string, payload: Record<string, any>) => {
    updateSettings(payload, {
      onSuccess: () => {
        toast({
          title: 'Settings updated',
          description: `${sectionName} settings saved successfully.`,
        });
      },
      onError: (error: any) => {
        toast({
          title: 'Failed to update settings',
          description: error?.response?.data?.message || 'An unexpected error occurred.',
          variant: 'destructive',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-center text-red-500">
        Failed to load hub settings. Please refresh or try again later.
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hub Settings</h1>
        <p className="text-muted-foreground">Manage operational rules, business hours, and branding.</p>
      </div>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building className="h-4 w-4" /> General
          </TabsTrigger>
          <TabsTrigger value="booking" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Booking Rules
          </TabsTrigger>
          <TabsTrigger value="hours" className="flex items-center gap-2">
            <Clock className="h-4 w-4" /> Hours
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <Landmark className="h-4 w-4" /> Financial
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" /> Branding
          </TabsTrigger>
        </TabsList>

        {/* GENERAL TAB */}
        <TabsContent value="general" className="space-y-4 rounded-lg border p-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="hub-name">Hub Name</Label>
              <Input
                id="hub-name"
                value={general.name}
                onChange={(e) => setGeneral({ ...general, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={general.address}
                onChange={(e) => setGeneral({ ...general, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={general.city}
                onChange={(e) => setGeneral({ ...general, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={general.country}
                onChange={(e) => setGeneral({ ...general, country: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={general.contactEmail}
                onChange={(e) => setGeneral({ ...general, contactEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPhone">Contact Phone</Label>
              <Input
                id="contactPhone"
                value={general.contactPhone}
                onChange={(e) => setGeneral({ ...general, contactPhone: e.target.value })}
              />
            </div>
          </div>
          <Button disabled={isPending} onClick={() => handleSave('General', general)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </TabsContent>

        {/* BOOKING RULES TAB */}
        <TabsContent value="booking" className="space-y-4 rounded-lg border p-6 mt-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadTime">Lead Time (Hours)</Label>
              <Input
                id="leadTime"
                type="number"
                value={bookingRules.leadTimeHours}
                onChange={(e) => setBookingRules({ ...bookingRules, leadTimeHours: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxDays">Max Days Ahead</Label>
              <Input
                id="maxDays"
                type="number"
                value={bookingRules.maxDaysAhead}
                onChange={(e) => setBookingRules({ ...bookingRules, maxDaysAhead: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cancelHours">Cancellation Policy (Hours)</Label>
              <Input
                id="cancelHours"
                type="number"
                value={bookingRules.cancellationPolicyHours}
                onChange={(e) => setBookingRules({ ...bookingRules, cancellationPolicyHours: Number(e.target.value) })}
              />
            </div>
          </div>
          <Button disabled={isPending} onClick={() => handleSave('Booking Rules', bookingRules)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </TabsContent>

        {/* BUSINESS HOURS TAB */}
        <TabsContent value="hours" className="space-y-4 rounded-lg border p-6 mt-4">
          <div className="space-y-3">
            {businessHours.map((item, index) => (
              <div key={item.day} className="flex items-center gap-6 p-3 rounded-md border">
                <span className="w-12 font-semibold">{item.day}</span>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={item.isOpen}
                    onCheckedChange={(checked) => {
                      const updated = [...businessHours];
                      updated[index].isOpen = checked;
                      setBusinessHours(updated);
                    }}
                  />
                  <span className="text-sm text-muted-foreground">{item.isOpen ? 'Open' : 'Closed'}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <select
                    disabled={!item.isOpen}
                    value={item.openTime}
                    onChange={(e) => {
                      const updated = [...businessHours];
                      updated[index].openTime = e.target.value;
                      setBusinessHours(updated);
                    }}
                    className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                  >
                    {TIME_INTERVALS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <span>to</span>
                  <select
                    disabled={!item.isOpen}
                    value={item.closeTime}
                    onChange={(e) => {
                      const updated = [...businessHours];
                      updated[index].closeTime = e.target.value;
                      setBusinessHours(updated);
                    }}
                    className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                  >
                    {TIME_INTERVALS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
          <Button disabled={isPending} onClick={() => handleSave('Business Hours', { businessHours })}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </TabsContent>

        {/* FINANCIAL TAB */}
        <TabsContent value="financial" className="space-y-4 rounded-lg border p-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vat">VAT Rate (%)</Label>
              <Input
                id="vat"
                type="number"
                step="0.1"
                value={financial.vatRatePercent}
                onChange={(e) => setFinancial({ ...financial, vatRatePercent: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={financial.currency} readOnly disabled className="bg-muted" />
            </div>
          </div>
          <Button disabled={isPending} onClick={() => handleSave('Financial', { vatRatePercent: financial.vatRatePercent })}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </TabsContent>

        {/* BRANDING TAB */}
        <TabsContent value="branding" className="space-y-4 rounded-lg border p-6 mt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Colour</Label>
              <div className="flex gap-3 items-center">
                <Input
                  id="primaryColor"
                  type="color"
                  className="w-16 h-10 p-1 cursor-pointer"
                  value={branding.primaryColorHex}
                  onChange={(e) => setBranding({ ...branding, primaryColorHex: e.target.value })}
                />
                <Input
                  type="text"
                  className="w-32"
                  value={branding.primaryColorHex}
                  onChange={(e) => setBranding({ ...branding, primaryColorHex: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input
                placeholder="https://res.cloudinary.com/..."
                value={branding.logoUrl}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Favicon URL</Label>
              <Input
                placeholder="https://res.cloudinary.com/..."
                value={branding.faviconUrl}
                onChange={(e) => setBranding({ ...branding, faviconUrl: e.target.value })}
              />
            </div>
          </div>
          <Button disabled={isPending} onClick={() => handleSave('Branding', branding)}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}