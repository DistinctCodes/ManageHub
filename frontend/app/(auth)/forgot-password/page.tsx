"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
      <div className="w-full max-w-md space-y-6">
        <ForgotPasswordForm />

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <h3 className="font-medium">Need help?</h3>
              <p className="mt-1">
                If you are having trouble accessing your account, contact support at{" "}
                <Link 
                  href="mailto:support@managehub.com" 
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  support@managehub.com
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
