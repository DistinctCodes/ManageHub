'use client';

import React from 'react';
import { useGetMembershipPlans, useSubscribeToPlan } from '@/lib/react-query/hooks/membership/useMembershipPlans';
import { Check, Loader2, Sparkles } from 'lucide-react';

export default function PublicPricingPage() {
  const { data: plans = [], isLoading } = useGetMembershipPlans(false);
  const subscribeMutation = useSubscribeToPlan();

  // Sort plans by displayOrder
  const sortedPlans = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleSubscribe = (planId: string) => {
    subscribeMutation.mutate(planId, {
      onSuccess: (data) => {
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        } else {
          alert('Subscribed successfully!');
        }
      },
      onError: (err: any) => {
        alert(err?.response?.data?.message || 'Failed to initiate subscription');
      },
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-16 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Flexible Membership Plans
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose the perfect plan for your workflow and join our hub community.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {sortedPlans.map((plan, index) => {
              const isPopular = index === 1; // Highlight middle plan
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col justify-between p-8 bg-white dark:bg-gray-900 rounded-3xl border ${
                    isPopular
                      ? 'border-blue-600 ring-2 ring-blue-600 shadow-2xl scale-105 z-10'
                      : 'border-gray-200 dark:border-gray-800 shadow-sm'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-md">
                      <Sparkles className="h-3.5 w-3.5" /> Most Popular
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {plan.name}
                      </h2>
                      <p className="text-gray-500 text-sm mt-2">{plan.description}</p>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                        ₦{(plan.priceKobo / 100).toLocaleString()}
                      </span>
                      <span className="text-gray-500 font-medium">
                        / {plan.billingCycle.toLowerCase()}
                      </span>
                    </div>

                    <ul className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                      {plan.bookingHoursIncluded > 0 ? (
                        <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span>{plan.bookingHoursIncluded} hrs included bookings</span>
                        </li>
                      ) : (
                        <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span>Unlimited room bookings</span>
                        </li>
                      )}

                      {plan.guestPassesPerMonth > 0 && (
                        <li className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span>{plan.guestPassesPerMonth} guest passes / month</span>
                        </li>
                      )}

                      {plan.features?.map((feature, i) => (
                        <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <Check className="h-4 w-4 text-blue-600" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    disabled={subscribeMutation.isPending}
                    onClick={() => handleSubscribe(plan.id)}
                    className={`mt-8 w-full py-4 rounded-xl font-bold transition-all text-center flex items-center justify-center gap-2 ${
                      isPopular
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
                        : 'bg-gray-900 hover:bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                    }`}
                  >
                    {subscribeMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    Subscribe Now
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}