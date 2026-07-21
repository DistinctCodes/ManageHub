'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  useGetMembershipPlans,
  useCreatePlan,
  useUpdatePlan,
  MembershipPlan,
  PlanFormPayload,
} from '@/lib/react-query/hooks/membership/useMembershipPlans';
import { Plus, Edit2, Archive, Loader2, X, Users } from 'lucide-react';

export default function AdminPlansPage() {
  const { data: plans = [], isLoading } = useGetMembershipPlans(true);
  const createPlanMutation = useCreatePlan();
  const updatePlanMutation = useUpdatePlan();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceNgn, setPriceNgn] = useState<number | ''>('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'QUARTERLY' | 'YEARLY'>('MONTHLY');
  const [features, setFeatures] = useState<string[]>([]);
  const [featureInput, setFeatureInput] = useState('');
  const [bookingHours, setBookingHours] = useState<number>(0);
  const [guestPasses, setGuestPasses] = useState<number>(0);
  const [displayOrder, setDisplayOrder] = useState<number>(1);
  const [isActive, setIsActive] = useState(true);

  const openCreateModal = () => {
    setEditingPlan(null);
    setName('');
    setDescription('');
    setPriceNgn('');
    setBillingCycle('MONTHLY');
    setFeatures([]);
    setFeatureInput('');
    setBookingHours(0);
    setGuestPasses(0);
    setDisplayOrder(plans.length + 1);
    setIsActive(true);
    setIsModalOpen(true);
  };

  const openEditModal = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setDescription(plan.description);
    setPriceNgn(plan.priceKobo / 100);
    setBillingCycle(plan.billingCycle);
    setFeatures(plan.features || []);
    setFeatureInput('');
    setBookingHours(plan.bookingHoursIncluded || 0);
    setGuestPasses(plan.guestPassesPerMonth || 0);
    setDisplayOrder(plan.displayOrder || 1);
    setIsActive(plan.isActive);
    setIsModalOpen(true);
  };

  const handleAddFeature = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = featureInput.trim();
      if (trimmed && !features.includes(trimmed)) {
        setFeatures([...features, trimmed]);
      }
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: PlanFormPayload = {
      name,
      description,
      priceNgn: Number(priceNgn),
      billingCycle,
      features,
      bookingHoursIncluded: bookingHours,
      guestPassesPerMonth: guestPasses,
      displayOrder,
      isActive,
    };

    if (editingPlan) {
      updatePlanMutation.mutate(
        { id: editingPlan.id, payload },
        { onSuccess: () => setIsModalOpen(false) }
      );
    } else {
      createPlanMutation.mutate(payload, { onSuccess: () => setIsModalOpen(false) });
    }
  };

  const handleArchive = (plan: MembershipPlan) => {
    // Safely check subscriber count with fallback
    const subscriberCount = plan.activeSubscribersCount ?? 0;
    if (subscriberCount > 0) return;
    updatePlanMutation.mutate({ id: plan.id, payload: { isActive: false } });
  };

  return (
    <div className="container max-w-6xl py-8 space-y-6 mx-auto px-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
            Membership Plans
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create and manage pricing tiers for hub members.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus className="h-4 w-4" /> Create Plan
        </button>
      </div>

      {/* Plans Table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-white dark:bg-gray-900 shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-semibold">
            <tr>
              <th className="px-6 py-3.5">Display Order</th>
              <th className="px-6 py-3.5">Name</th>
              <th className="px-6 py-3.5">Price (NGN)</th>
              <th className="px-6 py-3.5">Billing Cycle</th>
              <th className="px-6 py-3.5">Features</th>
              <th className="px-6 py-3.5">Subscribers</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
                </td>
              </tr>
            ) : plans.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  No membership plans found. Click "Create Plan" to add one.
                </td>
              </tr>
            ) : (
              plans.map((plan) => {
                const subCount = plan.activeSubscribersCount ?? 0;

                return (
                  <tr key={plan.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4 font-mono font-medium">{plan.displayOrder}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">
                      {plan.name}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      ₦{(plan.priceKobo / 100).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 capitalize text-gray-600 dark:text-gray-400">
                      {plan.billingCycle.toLowerCase()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {plan.features?.length || 0} features
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/members?plan=${plan.id}`}
                        className="inline-flex items-center gap-1.5 text-blue-600 hover:underline font-medium"
                      >
                        <Users className="h-3.5 w-3.5" />
                        {subCount}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          plan.isActive
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {plan.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(plan)}
                        className="p-1.5 text-gray-600 hover:text-blue-600 rounded-md hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      {subCount === 0 && plan.isActive && (
                        <button
                          onClick={() => handleArchive(plan)}
                          title="Archive Plan"
                          className="p-1.5 text-gray-600 hover:text-red-600 rounded-md hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Plan Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-xl p-6 space-y-5 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-200 dark:border-gray-800 pb-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {editingPlan ? 'Edit Membership Plan' : 'Create Membership Plan'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Plan Name
                </label>
                <input
                  required
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Description
                </label>
                <textarea
                  rows={2}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Price (NGN)
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    value={priceNgn}
                    onChange={(e) => setPriceNgn(e.target.value === '' ? '' : Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Billing Cycle
                  </label>
                  <select
                    value={billingCycle}
                    onChange={(e) =>
                      setBillingCycle(e.target.value as 'MONTHLY' | 'QUARTERLY' | 'YEARLY')
                    }
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>

              {/* Feature Chips */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                  Features (Press Enter to Add)
                </label>
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={handleAddFeature}
                  placeholder="e.g. 24/7 Access, Free Coffee"
                  className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                />
                <div className="flex flex-wrap gap-2 pt-2">
                  {features.map((feat, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full border border-blue-200 dark:border-blue-800"
                    >
                      {feat}
                      <button type="button" onClick={() => handleRemoveFeature(idx)}>
                        <X className="h-3 w-3 hover:text-red-600" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Booking Hours (0=Unlimited)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    value={bookingHours}
                    onChange={(e) => setBookingHours(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Guest Passes / Mo
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    value={guestPasses}
                    onChange={(e) => setGuestPasses(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min="1"
                    className="w-full h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    value={displayOrder}
                    onChange={(e) => setDisplayOrder(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activeToggle"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="activeToggle"
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  Active (Visible on public pricing page)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPlanMutation.isPending || updatePlanMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {(createPlanMutation.isPending || updatePlanMutation.isPending) && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}