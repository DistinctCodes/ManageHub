"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  Loader2,
  MapPin,
  Users,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAuthState, useAuthActions } from "@/lib/store/authStore";
import { useGetWorkspaces } from "@/lib/react-query/hooks/workspaces/useGetWorkspaces";
import { Workspace } from "@/lib/types/workspace";

const TOTAL_STEPS = 4;

type ProfileFormData = {
  firstname: string;
  lastname: string;
  bio?: string;
};

// ── Step 1: Welcome ───────────────────────────────────────────────────────────
function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-3xl">
        👋
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome to ManageHub, {name}!
        </h1>
        <p className="mt-2 text-gray-500">
          Here&apos;s what you can do with your account:
        </p>
      </div>
      <ul className="text-left space-y-3 max-w-xs mx-auto">
        {[
          "📅 Book workspaces and meeting rooms",
          "🕐 Clock in/out with biometric support",
          "📊 Track your usage and invoices",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onNext}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        Get started <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── Step 2: Profile ───────────────────────────────────────────────────────────
function StepProfile({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const { user } = useAuthState();
  const { updateProfile } = useAuthActions();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    defaultValues: {
      firstname: user?.firstname ?? "",
      lastname: user?.lastname ?? "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    try {
      await updateProfile(data);
      toast.success("Profile updated!");
      onNext();
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">
          Complete Your Profile
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Help others recognise you on ManageHub.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First name
          </label>
          <input
            {...register("firstname", { required: "Required" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {errors.firstname && (
            <p className="text-xs text-red-500 mt-1">
              {errors.firstname.message}
            </p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last name
          </label>
          <input
            {...register("lastname", { required: "Required" })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          />
          {errors.lastname && (
            <p className="text-xs text-red-500 mt-1">
              {errors.lastname.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Bio <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          {...register("bio")}
          rows={3}
          placeholder="Tell us a bit about yourself..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 resize-none"
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now
        </button>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Save &amp; continue <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ── Step 3: Workspaces ────────────────────────────────────────────────────────
function StepWorkspaces({
  onNext,
  onSkip,
}: {
  onNext: () => void;
  onSkip: () => void;
}) {
  const { data, isLoading } = useGetWorkspaces({ limit: 3 });
  const workspaces: Workspace[] = data?.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Find a Workspace</h2>
        <p className="mt-1 text-sm text-gray-500">
          Browse featured workspaces available for booking.
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {workspaces.map((ws) => (
            <div
              key={ws.id}
              className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-gray-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {ws.name}
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Users className="w-3 h-3" />
                  {ws.totalSeats} seat{ws.totalSeats !== 1 ? "s" : ""}
                </p>
              </div>
              <span className="text-sm font-semibold text-gray-700">
                ₦{(ws.hourlyRate / 100).toLocaleString()}/hr
              </span>
            </div>
          ))}
          {workspaces.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No workspaces available yet.
            </p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          Skip for now
        </button>
        <div className="flex items-center gap-3">
          <Link
            href="/workspaces"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium"
          >
            Browse all
          </Link>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Done ──────────────────────────────────────────────────────────────
function StepDone({ onFinish, finishing }: { onFinish: () => void; finishing: boolean }) {
  return (
    <div className="text-center space-y-6">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50">
        <CheckCircle2 className="w-10 h-10 text-green-500" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          You&apos;re all set!
        </h2>
        <p className="mt-2 text-gray-500">
          Your account is ready. Start exploring ManageHub.
        </p>
      </div>
      <button
        onClick={onFinish}
        disabled={finishing}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors disabled:opacity-60"
      >
        {finishing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8">
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>
          Step {step} of {TOTAL_STEPS}
        </span>
        <span>{Math.round((step / TOTAL_STEPS) * 100)}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gray-900 rounded-full transition-all duration-300"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthState();
  const { updateProfile } = useAuthActions();
  const [step, setStep] = useState(1);
  const [finishing, setFinishing] = useState(false);

  // Redirect if already onboarded
  if (user?.hasCompletedOnboarding) {
    router.replace("/dashboard");
    return null;
  }

  const next = () => setStep((s) => s + 1);

  const completeOnboarding = async () => {
    setFinishing(true);
    try {
      await updateProfile({ hasCompletedOnboarding: true });
    } catch {
      // best-effort — still redirect
    } finally {
      setFinishing(false);
      router.push("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-[#faf9f7] flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <ProgressBar step={step} />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          {step === 1 && (
            <StepWelcome
              name={user?.firstname ?? "there"}
              onNext={next}
            />
          )}
          {step === 2 && <StepProfile onNext={next} onSkip={next} />}
          {step === 3 && <StepWorkspaces onNext={next} onSkip={next} />}
          {step === 4 && (
            <StepDone onFinish={completeOnboarding} finishing={finishing} />
          )}
        </div>
      </div>
    </div>
  );
}
