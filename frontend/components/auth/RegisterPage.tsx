"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2, User, Mail, Phone, MapPin, Lock, Eye, EyeOff, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  personalInfoSchema, accountSetupSchema,
  type PersonalInfoForm, type AccountSetupForm,
} from "@/lib/schemas/auth";
import Link from "next/link";

type RegisterStep = "personal-info" | "account-setup";

interface RegisterPageProps {
  onRegister?: (data: PersonalInfoForm & AccountSetupForm) => void;
  isLoading?: boolean;
}

const userTypeOptions = [
  { id: "member" as const, title: "Member", description: "Regular workspace user" },
  { id: "staff" as const, title: "Staff", description: "Hub staff member" },
  { id: "visitor" as const, title: "Visitor", description: "Temporary access" },
];

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:6001/api";

export function RegisterPage({ onRegister, isLoading }: RegisterPageProps) {
  const [currentStep, setCurrentStep] = useState<RegisterStep>("personal-info");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const personalInfoForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onChange",
    defaultValues: { fullName: "", email: "", phoneNumber: "", location: "" },
  });

  const accountSetupForm = useForm<AccountSetupForm>({
    resolver: zodResolver(accountSetupSchema),
    mode: "onChange",
    defaultValues: {
      userType: "member", organizationName: "", password: "",
      confirmPassword: "", agreeToTerms: false,
    },
  });

  const handlePersonalInfoSubmit = (_data: PersonalInfoForm) => {
    setCurrentStep("account-setup");
  };

  const handleAccountSetupSubmit = async (data: AccountSetupForm) => {
    const personalInfoData = personalInfoForm.getValues();
    onRegister?.({ ...personalInfoData, ...data });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Create Your Account
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Join ManageHub and transform your workspace experience
          </p>
        </div>

        {/* OAuth Buttons */}
        <div className="space-y-3 mb-6">
          
            href={`${API_BASE}/auth/google`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
              <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
              <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
              <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </a>

          
            href={`${API_BASE}/auth/microsoft`}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0h8.571v8.571H0z" fill="#F25022"/>
              <path d="M9.429 0H18v8.571H9.429z" fill="#7FBA00"/>
              <path d="M0 9.429h8.571V18H0z" fill="#00A4EF"/>
              <path d="M9.429 9.429H18V18H9.429z" fill="#FFB900"/>
            </svg>
            Continue with Microsoft
          </a>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-50 text-gray-500">or</span>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === "personal-info" ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
              )}>
                {currentStep === "account-setup" ? <CheckCircle2 className="w-4 h-4" /> : "1"}
              </div>
              <span className={cn("ml-2 text-sm font-medium", currentStep === "personal-info" ? "text-gray-900" : "text-gray-500")}>
                Personal Info
              </span>
            </div>
            <div className={cn("w-12 h-0.5", currentStep === "account-setup" ? "bg-gray-900" : "bg-gray-300")} />
            <div className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                currentStep === "account-setup" ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-500"
              )}>
                2
              </div>
              <span className={cn("ml-2 text-sm font-medium", currentStep === "account-setup" ? "text-gray-900" : "text-gray-500")}>
                Account Setup
              </span>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-6 shadow-sm rounded-lg border border-gray-200">
          {currentStep === "personal-info" ? (
            <PersonalInfoStep form={personalInfoForm} onSubmit={handlePersonalInfoSubmit} />
          ) : (
            <AccountSetupStep
              form={accountSetupForm}
              onSubmit={handleAccountSetupSubmit}
              onBack={() => setCurrentStep("personal-info")}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isSubmitting={isLoading || false}
            />
          )}
        </div>

        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-600 text-sm sm:text-base">
            Already have an account?{" "}
            <Link href="/login" className="text-gray-900 hover:text-gray-700 focus:outline-none focus:underline font-medium transition-colors">
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      <footer className="mt-8 sm:mt-16 text-center px-4">
        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">© 2026 ManageHub. All rights reserved.</p>
        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-6">
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">Privacy Policy</button>
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">Terms of Service</button>
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">Support</button>
        </div>
      </footer>
    </div>
  );
}

interface PersonalInfoStepProps {
  form: ReturnType<typeof useForm<PersonalInfoForm>>;
  onSubmit: (data: PersonalInfoForm) => void;
}

function PersonalInfoStep({ form, onSubmit }: PersonalInfoStepProps) {
  const { register, handleSubmit, formState: { errors } } = form;
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
        <Input id="fullName" className="text-black" type="text" placeholder="Yusuf N M" {...register("fullName")} error={errors.fullName?.message} icon={<User className="w-5 h-5" />} />
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
        <Input id="email" type="email" placeholder="you@example.com" {...register("email")} error={errors.email?.message} icon={<Mail className="w-5 h-5" />} />
      </div>
      <div>
        <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
        <Input id="phoneNumber" type="tel" placeholder="+2348000331562" {...register("phoneNumber")} error={errors.phoneNumber?.message} icon={<Phone className="w-5 h-5" />} />
      </div>
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
        <Input id="location" type="text" placeholder="City, Country" {...register("location")} error={errors.location?.message} icon={<MapPin className="w-5 h-5" />} />
      </div>
      <Button type="submit" className="w-full h-12 text-base font-medium bg-gray-900" size="lg">Continue</Button>
    </form>
  );
}

interface AccountSetupStepProps {
  form: ReturnType<typeof useForm<AccountSetupForm>>;
  onSubmit: (data: AccountSetupForm) => void;
  onBack: () => void;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  showConfirmPassword: boolean;
  setShowConfirmPassword: (show: boolean) => void;
  isSubmitting: boolean;
}

function AccountSetupStep({ form, onSubmit, onBack, showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword, isSubmitting }: AccountSetupStepProps) {
  const { register, handleSubmit, formState: { errors }, watch, setValue } = form;
  const userType = watch("userType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">I am a *</label>
        <div className="grid grid-cols-1 gap-3">
          {userTypeOptions.map((option) => (
            <button key={option.id} type="button" onClick={() => setValue("userType", option.id)}
              className={cn("p-4 border rounded-lg text-left transition-all", userType === option.id ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300")}>
              <div className="font-medium text-gray-900">{option.title}</div>
              <div className="text-sm text-gray-500 mt-1">{option.description}</div>
            </button>
          ))}
        </div>
        {errors.userType && <p className="text-sm text-red-600 mt-1">{errors.userType.message}</p>}
      </div>
      <div>
        <label htmlFor="organizationName" className="block text-sm font-medium text-gray-700 mb-2">Organization/Hub Name *</label>
        <Input id="organizationName" type="text" placeholder="Your organization name" {...register("organizationName")} error={errors.organizationName?.message} icon={<Building2 className="w-5 h-5" />} />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} placeholder="Create a strong password" {...register("password")} error={errors.password?.message} icon={<Lock className="w-5 h-5" />} />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
        <div className="relative">
          <Input id="confirmPassword" type={showConfirmPassword ? "text" : "password"} placeholder="Re-enter your password" {...register("confirmPassword")} error={errors.confirmPassword?.message} icon={<Lock className="w-5 h-5" />} />
          <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>
      <div>
        <div className="flex items-start space-x-3">
          <input id="agreeToTerms" type="checkbox" {...register("agreeToTerms")} className="mt-1 h-4 w-4 text-gray-900 border-gray-300 rounded focus:ring-gray-300" />
          <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
            I agree to the{" "}
            <button type="button" className="text-gray-900 hover:text-gray-700 focus:outline-none focus:underline">Terms and Conditions</button>
            {" "}and{" "}
            <button type="button" className="text-gray-900 hover:text-gray-700 focus:outline-none focus:underline">Privacy Policy</button>
          </label>
        </div>
        {errors.agreeToTerms && <p className="text-sm text-red-600 mt-1">{errors.agreeToTerms.message}</p>}
      </div>
      <div className="flex space-x-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 h-12 bg-gray-900" size="lg">Back</Button>
        <Button type="submit" loading={isSubmitting} disabled={isSubmitting} className="flex-1 h-12 text-base font-medium bg-gray-900" size="lg">Create Account</Button>
      </div>
    </form>
  );
}