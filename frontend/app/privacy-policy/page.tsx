"use client";

import React, { useState } from "react";
import {
  Building2,
  Shield,
  Eye,
  Lock,
  Users,
  Database,
  Cookie,
  Mail,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Heart,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

const PrivacyPolicyPage = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: "Do you sell my data to third parties?",
      answer:
        "No, never. We don't sell your personal information to anyone. Your data is yours, and we only use it to make ManageHub work better for you.",
    },
    {
      question: "Can I delete my account and data?",
      answer:
        "Absolutely. You can delete your account anytime from your settings. We'll remove your personal data within 30 days, except for what we legally need to keep (like transaction records).",
    },
    {
      question: "Is my biometric data safe?",
      answer:
        "Yes. Your fingerprints and facial data are encrypted and stored separately from your other information. We can't use it for anything except letting you into your workspace.",
    },
    {
      question: "Who can see my workspace activity?",
      answer:
        "Only your hub administrators can see when you check in/out and which spaces you book. We don't share this with anyone else unless you give permission.",
    },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
              <Shield className="h-8 w-8 text-white" />
            </div>
            <Building2 className="h-8 w-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Your Privacy Matters
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl">
            We're committed to protecting your personal information. Here's
            exactly how we handle your data, explained in plain English.
          </p>
          <div className="flex items-center gap-2 mt-6 text-blue-100">
            <Heart className="h-5 w-5" />
            <span className="text-sm">Last updated: January 27, 2025</span>
          </div>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8 mb-12">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
            <CheckCircle className="h-8 w-8 text-green-500 mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">We Don't Sell Data</h3>
            <p className="text-sm text-gray-600">
              Your information is never sold to advertisers or third parties.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
            <Lock className="h-8 w-8 text-blue-500 mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">
              Bank-Level Security
            </h3>
            <p className="text-sm text-gray-600">
              All data is encrypted and stored with industry-leading protection.
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-teal-500">
            <Eye className="h-8 w-8 text-teal-500 mb-3" />
            <h3 className="font-bold text-gray-900 mb-2">You're In Control</h3>
            <p className="text-sm text-gray-600">
              Access, download, or delete your data whenever you want.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {/* The Short Version */}
          <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-8 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="bg-blue-600 p-3 rounded-lg flex-shrink-0">
                <HelpCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                  The Short Version
                </h2>
                <p className="text-gray-700 leading-relaxed mb-4">
                  We collect information to run ManageHub and make it useful for
                  you. This includes your name, email, and workspace activity.
                  If you use biometric login, we store that too (encrypted and
                  super secure).
                </p>
                <p className="text-gray-700 leading-relaxed">
                  We don't sell your data. We don't spam you. We use it to
                  improve our service and keep your workspace running smoothly.
                  You can leave anytime and take your data with you.
                </p>
              </div>
            </div>
          </div>

          {/* Content Sections */}
          <div className="p-8 md:p-12 space-y-12">
            {/* What We Collect */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Database className="h-7 w-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  What Information We Collect
                </h2>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    When you sign up, we collect:
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-6 space-y-2">
                    <p className="text-gray-700">
                      • Your name and email address
                    </p>
                    <p className="text-gray-700">
                      • Phone number (if you provide it)
                    </p>
                    <p className="text-gray-700">
                      • Company or organization name
                    </p>
                    <p className="text-gray-700">
                      • Password (encrypted, we can't see it)
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    When you use ManageHub, we collect:
                  </h3>
                  <div className="bg-slate-50 rounded-lg p-6 space-y-2">
                    <p className="text-gray-700">
                      • Check-in and check-out times
                    </p>
                    <p className="text-gray-700">
                      • Workspace and desk bookings
                    </p>
                    <p className="text-gray-700">
                      • Payment and billing information
                    </p>
                    <p className="text-gray-700">
                      • Device type and browser (for technical support)
                    </p>
                  </div>
                </div>

                <div className="bg-amber-50 border-l-4 border-amber-500 p-5 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-900 mb-2">
                        About Biometric Data
                      </h4>
                      <p className="text-sm text-amber-800">
                        If you choose to use fingerprint or facial recognition,
                        we store that data in an encrypted format. It's
                        separated from your other information and only used for
                        authentication. We never share it with anyone, and you
                        can turn it off anytime.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* How We Use It */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Users className="h-7 w-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  How We Use Your Information
                </h2>
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                We're not in the business of selling ads or spam. Here's what we
                actually do with your data:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-semibold text-gray-900">
                      We Use It To:
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Let you into your workspace</li>
                    <li>• Process your bookings and payments</li>
                    <li>• Send important updates about your account</li>
                    <li>• Improve our service based on usage patterns</li>
                    <li>• Provide customer support when you need it</li>
                    <li>• Keep our platform secure</li>
                  </ul>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-gray-900">
                      We Don't Use It To:
                    </h3>
                  </div>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li>• Sell to advertisers or data brokers</li>
                    <li>
                      • Send you spam or marketing emails (unless you opt in)
                    </li>
                    <li>• Track you across other websites</li>
                    <li>• Share with random third parties</li>
                    <li>• Build advertising profiles</li>
                    <li>• Anything creepy or invasive</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Who We Share With */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Lock className="h-7 w-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  Who Sees Your Information
                </h2>
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                We keep your data private, but sometimes we need to share
                limited information with trusted partners to make ManageHub
                work:
              </p>

              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-5 py-3">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Your Hub Administrator
                  </h4>
                  <p className="text-gray-700">
                    They can see your check-ins, bookings, and subscription
                    status. That's how they manage the workspace.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-5 py-3">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Payment Processors
                  </h4>
                  <p className="text-gray-700">
                    When you pay, companies like Stripe or Paystack handle the
                    transaction. They follow strict security standards.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-5 py-3">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Cloud Hosting
                  </h4>
                  <p className="text-gray-700">
                    We use secure cloud servers to store data. They can't access
                    or use your information.
                  </p>
                </div>

                <div className="border-l-4 border-blue-500 pl-5 py-3">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    When Required by Law
                  </h4>
                  <p className="text-gray-700">
                    If law enforcement has a valid legal request, we may have to
                    share certain information. We'll notify you unless legally
                    prevented.
                  </p>
                </div>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Cookie className="h-7 w-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  Cookies & Tracking
                </h2>
              </div>

              <p className="text-gray-700 leading-relaxed mb-4">
                We use cookies to keep you logged in and remember your
                preferences. That's it. We don't use invasive tracking or
                advertising cookies.
              </p>

              <div className="bg-blue-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  The cookies we use:
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Essential Cookies
                      </p>
                      <p className="text-sm text-gray-600">
                        Keep you logged in and the site working properly
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Preference Cookies
                      </p>
                      <p className="text-sm text-gray-600">
                        Remember your settings like language and theme
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-gray-900">
                        Analytics Cookies
                      </p>
                      <p className="text-sm text-gray-600">
                        Help us understand how people use the platform
                        (anonymized data)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Your Rights */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Shield className="h-7 w-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  Your Rights & Control
                </h2>
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                Your data belongs to you. Here's what you can do with it:
              </p>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 transition-colors">
                  <h4 className="font-bold text-gray-900 mb-2">
                    Access Your Data
                  </h4>
                  <p className="text-sm text-gray-600">
                    Download everything we have about you from your account
                    settings.
                  </p>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 transition-colors">
                  <h4 className="font-bold text-gray-900 mb-2">
                    Correct Information
                  </h4>
                  <p className="text-sm text-gray-600">
                    Update your profile anytime if something's wrong.
                  </p>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 transition-colors">
                  <h4 className="font-bold text-gray-900 mb-2">
                    Delete Your Account
                  </h4>
                  <p className="text-sm text-gray-600">
                    Remove your data permanently. We'll miss you though!
                  </p>
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-500 transition-colors">
                  <h4 className="font-bold text-gray-900 mb-2">
                    Opt Out of Emails
                  </h4>
                  <p className="text-sm text-gray-600">
                    Unsubscribe from marketing emails with one click.
                  </p>
                </div>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <Lock className="h-7 w-7 text-blue-600" />
                <h2 className="text-3xl font-bold text-gray-900">
                  How We Keep Data Secure
                </h2>
              </div>

              <p className="text-gray-700 leading-relaxed mb-6">
                Security isn't just a checkbox for us. Here's how we protect
                your information:
              </p>

              <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-xl p-6 space-y-3">
                <p className="text-gray-700">
                  🔒 All data encrypted in transit and at rest
                </p>
                <p className="text-gray-700">
                  🛡️ Regular security audits and penetration testing
                </p>
                <p className="text-gray-700">
                  🔐 Two-factor authentication available for all accounts
                </p>
                <p className="text-gray-700">
                  🏢 Data stored in secure, certified data centers
                </p>
                <p className="text-gray-700">
                  👥 Limited employee access on a need-to-know basis
                </p>
                <p className="text-gray-700">
                  ⚡ Real-time monitoring for suspicious activity
                </p>
              </div>

              <p className="text-sm text-gray-600 mt-4 italic">
                While we do everything we can to protect your data, no system is
                100% secure. If we ever detect a breach, we'll let you know
                immediately.
              </p>
            </section>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-12 bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Common Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleFaq(index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
                >
                  <span className="font-semibold text-gray-900">
                    {faq.question}
                  </span>
                  {expandedFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="px-5 pb-5 text-gray-700 bg-slate-50">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Contact Section */}
        <div className="mt-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 text-white text-center">
          <Mail className="h-12 w-12 mx-auto mb-4 opacity-90" />
          <h2 className="text-2xl font-bold mb-3">Still Have Questions?</h2>
          <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
            Privacy can be confusing. If you have questions about how we handle
            your data, we're here to help. Real humans, real answers.
          </p>
          <a
            href="mailto:privacy@managehub.com"
            className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
          >
            <Mail className="h-5 w-5" />
            privacy@managehub.com
          </a>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 ManageHub. All rights reserved.</p>
            <div className="mt-3 space-x-4">
              <a href="/privacy-policy" className="hover:text-gray-700">
                Privacy Policy
              </a>
              <a href="/terms" className="hover:text-gray-700">
                Terms of Service
              </a>
              <a href="/contact" className="hover:text-gray-700">
                Contact Us
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
