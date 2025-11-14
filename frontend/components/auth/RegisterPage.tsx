"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";
import {
  personalInfoSchema,
  accountSetupSchema,
  type PersonalInfoForm,
  type AccountSetupForm,
} from "@/lib/schemas/auth";
import Link from "next/link";

type RegisterStep = "personal-info" | "account-setup";

interface RegisterPageProps {
  onRegister?: (data: PersonalInfoForm & AccountSetupForm) => void;
  isLoading?: boolean;
}

const userTypeOptions = [
  {
    id: "member" as const,
    title: "Member",
    description: "Regular workspace user",
  },
  {
    id: "staff" as const,
    title: "Staff",
    description: "Hub staff member",
  },
  {
    id: "visitor" as const,
    title: "Visitor",
    description: "Temporary access",
  },
];

export function RegisterPage({ onRegister, isLoading }: RegisterPageProps) {
  const [currentStep, setCurrentStep] = useState<RegisterStep>('personal-info');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
 
  
  // Personal Info Form
  const personalInfoForm = useForm<PersonalInfoForm>({
    resolver: zodResolver(personalInfoSchema),
    mode: "onChange",
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      location: "",
    },
  });

  // Account Setup Form
  const accountSetupForm = useForm<AccountSetupForm>({
    resolver: zodResolver(accountSetupSchema),
    mode: "onChange",
    defaultValues: {
      userType: "member",
      organizationName: "",
      password: "",
      confirmPassword: "",
      agreeToTerms: false,
    },
  });

  const handlePersonalInfoSubmit = (_data: PersonalInfoForm) => {
    setCurrentStep("account-setup");
  };

  const handleAccountSetupSubmit = async (data: AccountSetupForm) => {
    
    
    // Get personal info data
    const personalInfoData = personalInfoForm.getValues();

    // Simulate API call
    // await new Promise(resolve => setTimeout(resolve, 2000));
    
    // onRegister?.({
    //   ...personalInfoData,
    //   ...data,
    // });
    const finalData = {
      ...personalInfoData,
      ...data,
    };

    // 3. Send it to the parent (page.tsx)
    // We do NOT set loading state here. The parent's hook handles that.
    onRegister?.(finalData);
  };

  // const handleBack = () => {
  //   setCurrentStep('personal-info');
  // };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-6 px-4 sm:py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
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

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {/* Step 1 */}
            <div className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep === "personal-info"
                    ? "bg-blue-600 text-white"
                    : "bg-blue-100 text-blue-600"
                )}
              >
                {currentStep === "account-setup" ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  "1"
                )}
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium",
                  currentStep === "personal-info"
                    ? "text-gray-900"
                    : "text-gray-500"
                )}
              >
                Personal Info
              </span>
            </div>

            {/* Connector */}
            <div
              className={cn(
                "w-12 h-0.5",
                currentStep === "account-setup" ? "bg-blue-600" : "bg-gray-300"
              )}
            />

            {/* Step 2 */}
            <div className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  currentStep === "account-setup"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-500"
                )}
              >
                2
              </div>
              <span
                className={cn(
                  "ml-2 text-sm font-medium",
                  currentStep === "account-setup"
                    ? "text-gray-900"
                    : "text-gray-500"
                )}
              >
                Account Setup
              </span>
            </div>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white py-6 px-4 sm:py-8 sm:px-6 shadow-sm rounded-lg border border-gray-200">
          {currentStep === "personal-info" ? (
            <PersonalInfoStep
              form={personalInfoForm}
              onSubmit={handlePersonalInfoSubmit}
              
            />
          ) : (
            <AccountSetupStep
              form={accountSetupForm}
              onSubmit={handleAccountSetupSubmit}
              onBack={() => setCurrentStep('personal-info')}
              showPassword={showPassword}
              setShowPassword={setShowPassword}
              showConfirmPassword={showConfirmPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isSubmitting={isLoading || false}
            />
          )}
        </div>

        {/* Sign In Link */}
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-600 text-sm sm:text-base">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-[#2563EB] hover:text-blue-700 focus:outline-none focus:underline font-medium transition-colors"
            >
              Sign in here
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-8 sm:mt-16 text-center px-4">
        <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
          © 2025 ManageHub. All rights reserved.
        </p>
        <div className="flex flex-col space-y-2 sm:flex-row sm:justify-center sm:space-y-0 sm:space-x-6">
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">
            Privacy Policy
          </button>
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">
            Terms of Service
          </button>
          <button className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus:underline transition-colors">
            Support
          </button>
        </div>
      </footer>
    </div>
  );
}

// Personal Info Step Component
interface PersonalInfoStepProps {
  form: ReturnType<typeof useForm<PersonalInfoForm>>;
  onSubmit: (data: PersonalInfoForm) => void;
}

function PersonalInfoStep({ form, onSubmit }: PersonalInfoStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = form;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Full Name */}
      <div>
        <label
          htmlFor="fullName"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Full Name *
        </label>
        <Input
          id="fullName"
          className="text-black"
          type="text"
          placeholder="Yusuf N M"
          {...register("fullName")}
          error={errors.fullName?.message}
          icon={<User className="w-5 h-5" />}
        />
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Email Address *
        </label>
        <Input
          id="email"
          type="email"
          placeholder="faladeyusuf54@gmail.com"
          {...register("email")}
          error={errors.email?.message}
          icon={<Mail className="w-5 h-5" />}
        />
      </div>

      {/* Phone Number */}
      <div>
        <label
          htmlFor="phoneNumber"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Phone Number *
        </label>
        <Input
          id="phoneNumber"
          type="tel"
          placeholder="+234800033156218"
          {...register("phoneNumber")}
          error={errors.phoneNumber?.message}
          icon={<Phone className="w-5 h-5" />}
        />
      </div>

      {/* Location */}
      <div>
        <label
          htmlFor="location"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Location (Optional)
        </label>
        <Input
          id="location"
          type="text"
          placeholder="City, Country"
          {...register("location")}
          error={errors.location?.message}
          icon={<MapPin className="w-5 h-5" />}
        />
      </div>

      {/* Continue Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base font-medium bg-blue-600"
        size="lg"
      >
        Continue
      </Button>
    </form>
  );
}

// Account Setup Step Component
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

function AccountSetupStep({
  form,
  onSubmit,
  onBack,
  showPassword,
  setShowPassword,
  showConfirmPassword,
  setShowConfirmPassword,
  isSubmitting,
}: AccountSetupStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = form;
  const userType = watch("userType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* User Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          I am a *
        </label>
        <div className="grid grid-cols-1 gap-3">
          {userTypeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setValue("userType", option.id)}
              className={cn(
                "p-4 border rounded-lg text-left transition-all",
                userType === option.id
                  ? "border-blue-600 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <div className="font-medium text-gray-900">{option.title}</div>
              <div className="text-sm text-gray-500 mt-1">
                {option.description}
              </div>
            </button>
          ))}
        </div>
        {errors.userType && (
          <p className="text-sm text-red-600 mt-1">{errors.userType.message}</p>
        )}
      </div>

      {/* Organization Name */}
      <div>
        <label
          htmlFor="organizationName"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Organization/Hub Name *
        </label>
        <Input
          id="organizationName"
          type="text"
          placeholder="Your organization name"
          {...register("organizationName")}
          error={errors.organizationName?.message}
          icon={<Building2 className="w-5 h-5" />}
        />
      </div>

      {/* Password */}
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Password *
        </label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Create a strong password"
            {...register("password")}
            error={errors.password?.message}
            icon={<Lock className="w-5 h-5" />}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Confirm Password */}
      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Confirm Password *
        </label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Re-enter your password"
            {...register("confirmPassword")}
            error={errors.confirmPassword?.message}
            icon={<Lock className="w-5 h-5" />}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showConfirmPassword ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div>
        <div className="flex items-start space-x-3">
          <input
            id="agreeToTerms"
            type="checkbox"
            {...register("agreeToTerms")}
            className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-gray-700">
            I agree to the{" "}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
            >
              Terms and Conditions
            </button>{" "}
            and{" "}
            <button
              type="button"
              className="text-blue-600 hover:text-blue-700 focus:outline-none focus:underline"
            >
              Privacy Policy
            </button>
          </label>
        </div>
        {errors.agreeToTerms && (
          <p className="text-sm text-red-600 mt-1">
            {errors.agreeToTerms.message}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="flex-1 h-12 bg-blue-600"
          size="lg"
        >
          Back
        </Button>
        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting}
          className="flex-1 h-12 text-base font-medium bg-blue-600"
          size="lg"
        >
          Create Account
        </Button>
      </div>
    </form>
  );
}
