'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import { apiClient } from '@/lib/apiClient';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, Clock3, Loader2, Minus, Plus, Sparkles, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { Resource, ResourceAvailability, ResourceBookingPayload, ResourceBookingResponse } from '@/lib/types/resource';

declare global {
  interface Window {
    PaystackPop: {
      setup: (opts: {
        key: string;
        email: string;
        amount: number;
        ref: string;
        onClose: () => void;
        callback: (response: { reference: string }) => void;
      }) => { openIframe: () => void };
    };
  }
}

function formatPrice(price?: number) {
  if (!price || price <= 0) return 'Free';
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(price);
}

export default function ResourceDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const resourceId = params?.id as string;

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [quantity, setQuantity] = useState(1);
  const [availability, setAvailability] = useState<ResourceAvailability | null>(null);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['resource', resourceId],
    queryFn: async () => {
      const response = await apiClient.get<{ success: boolean; data: Resource }>('/resources/' + resourceId);
      return response;
    },
    enabled: Boolean(resourceId),
  });

  const resource = data?.data;
  const price = resource?.pricePerHour ?? resource?.hourlyPrice ?? resource?.price ?? 0;
  const isPaid = Boolean(price && price > 0);
  const images = useMemo(() => {
    const base = resource?.images?.filter(Boolean) ?? [];
    if (resource?.imageUrl) base.unshift(resource.imageUrl);
    if (resource?.thumbnail) base.unshift(resource.thumbnail);
    if (resource?.coverImage) base.unshift(resource.coverImage);
    return Array.from(new Set(base));
  }, [resource]);

  useEffect(() => {
    if (!resourceId || !date) return;
    const controller = new AbortController();
    const run = async () => {
      setIsCheckingAvailability(true);
      try {
        const response = await apiClient.get<ResourceAvailability>(`/resources/${resourceId}/availability?date=${date}`);
        setAvailability(response);
      } catch {
        setAvailability(null);
      } finally {
        setIsCheckingAvailability(false);
      }
    };

    void run();
    return () => controller.abort();
  }, [resourceId, date]);

  useEffect(() => {
    if (!date) {
      setAvailability(null);
    }
  }, [date]);

  useEffect(() => {
    if (document.getElementById('paystack-script')) return;
    const script = document.createElement('script');
    script.id = 'paystack-script';
    script.src = 'https://js.paystack.co/v1/inline.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const bookResource = useMutation({
    mutationFn: async (payload: ResourceBookingPayload) => {
      const response = await apiClient.post<ResourceBookingResponse>(`/resources/${resourceId}/book`, {
        ...payload,
        quantity,
      });
      return response;
    },
  });

  const handleBook = async () => {
    if (!resourceId || !date || !startTime || !endTime) {
      toast.error('Please complete the availability details first.');
      return;
    }

    try {
      setIsBooking(true);
      const response = await bookResource.mutateAsync({
        date,
        startTime,
        endTime,
        quantity,
      });

      if (isPaid && response?.data?.requiresPayment !== false && response?.data?.paymentRequired !== false) {
        const bookingId = response.data?.id ?? response.data?.bookingId ?? response.data?.booking?.id;
        const amount = response.data?.totalAmount ?? response.data?.amount ?? Math.round((price || 0) * quantity * 100);

        if (!bookingId) {
          toast.success('Booking created. Please complete payment.');
          router.push('/bookings');
          return;
        }

        const reference = `${bookingId}-${Date.now()}`;
        const initResponse = await apiClient.post<{ success: boolean; data: { authorizationUrl?: string; accessCode?: string; reference?: string } }>('/payments/initialize', { bookingId });
        const authUrl = initResponse?.data?.authorizationUrl;
        const accessCode = initResponse?.data?.accessCode;
        const paystackRef = initResponse?.data?.reference ?? reference;

        if (!window.PaystackPop) {
          if (authUrl) window.location.href = authUrl;
          else toast.success('Booking created. Please continue to payment.');
          return;
        }

        const handler = window.PaystackPop.setup({
          key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
          email: '',
          amount,
          ref: paystackRef,
          onClose: () => toast.info('Payment window closed.'),
          callback: () => {
            toast.success('Payment submitted. Your booking will be confirmed shortly.');
            router.push('/bookings');
          },
        });
        void accessCode;
        handler.openIframe();
        return;
      }

      toast.success(response?.message || 'Booking confirmed successfully.');
      router.push('/bookings');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete booking.');
    } finally {
      setIsBooking(false);
    }
  };

  const isUnavailable = Boolean(date && availability && availability.available === false);
  const disableBooking = isBooking || isCheckingAvailability || !date || !startTime || !endTime || quantity <= 0 || isUnavailable;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-gray-500">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin" />
          <p>Loading resource details...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !resource) {
    return (
      <DashboardLayout>
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
          <p className="font-medium">This resource could not be found.</p>
          <Link href="/resources" className="mt-4 inline-flex items-center text-sm font-medium text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to resources
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Link href="/resources" className="mb-6 inline-flex items-center text-sm font-medium text-gray-700 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to resources
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {images.slice(0, 4).map((image, index) => (
                <img key={`${image}-${index}`} src={image} alt={`${resource.name} ${index + 1}`} className="h-48 w-full rounded-2xl object-cover" />
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">{resource.type || 'Resource'}</p>
                <h1 className="mt-1 text-3xl font-semibold text-gray-900">{resource.name}</h1>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
                {formatPrice(price)} / hour
              </div>
            </div>
            <p className="mt-4 text-sm leading-6 text-gray-600">{resource.description || 'This resource is ready for your next booking.'}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5">
                <Sparkles className="h-4 w-4" />
                {resource.capacity ? `${resource.capacity} seats` : 'Flexible use'}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1.5">
                <Clock3 className="h-4 w-4" />
                Hourly booking available
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CalendarDays className="h-5 w-5" /> Availability picker
          </div>
          <p className="mt-1 text-sm text-gray-500">Select a date and time to check availability before booking.</p>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">End time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Quantity</label>
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-full p-1 text-gray-500 hover:bg-gray-50">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold text-gray-900">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} className="rounded-full p-1 text-gray-500 hover:bg-gray-50">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 text-sm text-gray-600">
              {isCheckingAvailability ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking availability...
                </div>
              ) : availability ? (
                <div className="space-y-1">
                  <p className="font-medium text-gray-900">{availability.available === false ? 'Unavailable' : 'Available'}</p>
                  <p>{availability.message || (availability.available === false ? 'This slot is already booked.' : 'This slot is open for booking.')}</p>
                </div>
              ) : (
                <p>Select a date to check the slot status.</p>
              )}
            </div>

            <button
              type="button"
              onClick={handleBook}
              disabled={disableBooking}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isBooking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              {isPaid ? 'Book now & pay' : 'Book now'}
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
