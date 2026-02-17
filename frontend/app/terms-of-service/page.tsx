"use client";

import React, { useState } from "react";
import {
  Building2,
  FileText,
  Calendar,
  Shield,
  AlertCircle,
  ChevronRight,
  User,
  CreditCard,
  Lock,
  Bell,
  Scale,
  Mail,
  Link,
} from "lucide-react";

const TermsOfServicePage = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const tableOfContents = [
    {
      id: "acceptance",
      title: "Acceptance of Terms",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "services",
      title: "Description of Services",
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: "accounts",
      title: "User Accounts",
      icon: <User className="h-4 w-4" />,
    },
    {
      id: "payment",
      title: "Payment & Billing",
      icon: <CreditCard className="h-4 w-4" />,
    },
    {
      id: "conduct",
      title: "User Conduct",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      id: "privacy",
      title: "Privacy & Data",
      icon: <Lock className="h-4 w-4" />,
    },
    {
      id: "termination",
      title: "Termination",
      icon: <AlertCircle className="h-4 w-4" />,
    },
    {
      id: "liability",
      title: "Limitation of Liability",
      icon: <Scale className="h-4 w-4" />,
    },
    {
      id: "changes",
      title: "Changes to Terms",
      icon: <Bell className="h-4 w-4" />,
    },
    { id: "contact", title: "Contact Us", icon: <Mail className="h-4 w-4" /> },
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveSection(id);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2.5 rounded-xl">
                <Building2 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Terms of Service
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  ManageHub Platform Agreement
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>

      {/* Last Updated Banner */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center text-sm text-blue-900">
            <Calendar className="h-4 w-4 mr-2" />
            <span className="font-medium">Last Updated:</span>
            <span className="ml-2">January 27, 2025</span>
            <span className="ml-4 text-blue-700">Version 1.0</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Table of Contents - Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  Table of Contents
                </h2>
                <nav className="space-y-2">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm rounded-lg transition-colors text-left ${
                        activeSection === item.id
                          ? "bg-blue-50 text-blue-600 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <span className="mr-2">{item.icon}</span>
                      <span className="flex-1">{item.title}</span>
                      <ChevronRight className="h-4 w-4 opacity-50" />
                    </button>
                  ))}
                </nav>

                {/* Quick Actions */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <Link
                    href="/privacy-policy"
                    className="block text-sm text-blue-600 hover:text-blue-700 font-medium mb-3"
                  >
                    → Privacy Policy
                  </Link>
                  <Link
                    href="/contact"
                    className="block text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    → Contact Support
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 md:p-12">
              {/* Introduction */}
              <div className="mb-12">
                <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded-r-lg mb-6">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">
                        Important Notice
                      </p>
                      <p className="text-sm text-blue-800 mt-1">
                        Please read these Terms of Service carefully before
                        using ManageHub. By accessing or using our services, you
                        agree to be bound by these terms.
                      </p>
                    </div>
                  </div>
                </div>

                <p className="text-gray-700 leading-relaxed">
                  Welcome to ManageHub. These Terms of Service govern your use
                  of our workspace management platform, including all features,
                  services, and technologies we provide. By creating an account
                  or using our services, you acknowledge that you have read,
                  understood, and agree to be bound by these terms.
                </p>
              </div>

              {/* 1. Acceptance of Terms */}
              <section id="acceptance" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <FileText className="h-6 w-6 text-blue-600 mr-2" />
                  1. Acceptance of Terms
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    By accessing or using ManageHub, you confirm that you are at
                    least 18 years old and have the legal capacity to enter into
                    these Terms of Service. If you are using ManageHub on behalf
                    of an organization, you represent and warrant that you have
                    the authority to bind that organization to these terms.
                  </p>
                  <p>
                    Your continued use of our services constitutes acceptance of
                    any modifications to these terms. If you do not agree with
                    any part of these terms, you must discontinue use of our
                    services immediately.
                  </p>
                </div>
              </section>

              {/* 2. Description of Services */}
              <section id="services" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Building2 className="h-6 w-6 text-blue-600 mr-2" />
                  2. Description of Services
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    ManageHub provides a comprehensive workspace management
                    platform that includes but is not limited to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      User and member management with role-based access control
                    </li>
                    <li>Workspace and facility booking systems</li>
                    <li>Biometric authentication and access control</li>
                    <li>Subscription and billing management</li>
                    <li>Analytics and reporting tools</li>
                    <li>Event and community management features</li>
                    <li>
                      Integration with third-party services and payment
                      processors
                    </li>
                  </ul>
                  <p>
                    We reserve the right to modify, suspend, or discontinue any
                    aspect of our services at any time, with or without notice.
                    We are not liable for any modification, suspension, or
                    discontinuation of services.
                  </p>
                </div>
              </section>

              {/* 3. User Accounts */}
              <section id="accounts" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <User className="h-6 w-6 text-blue-600 mr-2" />
                  3. User Accounts
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    To access certain features of ManageHub, you must create an
                    account. When creating an account, you agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Provide accurate, current, and complete information</li>
                    <li>
                      Maintain and promptly update your account information
                    </li>
                    <li>
                      Maintain the security of your password and account
                      credentials
                    </li>
                    <li>
                      Accept responsibility for all activities that occur under
                      your account
                    </li>
                    <li>
                      Notify us immediately of any unauthorized use of your
                      account
                    </li>
                  </ul>
                  <p>
                    You are solely responsible for maintaining the
                    confidentiality of your account credentials. ManageHub will
                    not be liable for any loss or damage arising from your
                    failure to comply with these security obligations.
                  </p>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-amber-900 font-medium">
                      Security Notice: Never share your password or biometric
                      data with anyone. ManageHub staff will never ask for your
                      password.
                    </p>
                  </div>
                </div>
              </section>

              {/* 4. Payment & Billing */}
              <section id="payment" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-6 w-6 text-blue-600 mr-2" />
                  4. Payment & Billing
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    ManageHub offers various subscription plans and payment
                    models. By subscribing to our services, you agree to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      Pay all fees associated with your chosen subscription plan
                    </li>
                    <li>
                      Provide valid payment information and keep it current
                    </li>
                    <li>
                      Authorize automatic billing for recurring subscriptions
                    </li>
                    <li>
                      Pay any applicable taxes, including VAT or sales tax
                    </li>
                  </ul>
                  <p>
                    <strong>Subscription Renewals:</strong> All subscriptions
                    automatically renew at the end of each billing period unless
                    you cancel before the renewal date. You will be charged the
                    then-current subscription fee.
                  </p>
                  <p>
                    <strong>Refund Policy:</strong> Refunds are provided at our
                    sole discretion. Generally, subscription fees are
                    non-refundable except where required by law or as explicitly
                    stated in your subscription agreement.
                  </p>
                  <p>
                    <strong>Price Changes:</strong> We reserve the right to
                    modify our pricing at any time. Price changes will be
                    communicated at least 30 days in advance and will apply to
                    subsequent billing periods.
                  </p>
                </div>
              </section>

              {/* 5. User Conduct */}
              <section id="conduct" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Shield className="h-6 w-6 text-blue-600 mr-2" />
                  5. User Conduct
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    You agree to use ManageHub only for lawful purposes and in
                    accordance with these Terms. You agree not to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      Violate any applicable local, national, or international
                      law or regulation
                    </li>
                    <li>
                      Infringe upon the intellectual property rights of
                      ManageHub or third parties
                    </li>
                    <li>
                      Transmit any malicious code, viruses, or harmful software
                    </li>
                    <li>
                      Attempt to gain unauthorized access to our systems or
                      networks
                    </li>
                    <li>
                      Engage in any activity that disrupts or interferes with
                      our services
                    </li>
                    <li>Use our services to harass, abuse, or harm others</li>
                    <li>
                      Impersonate any person or entity or misrepresent your
                      affiliation
                    </li>
                    <li>
                      Collect or harvest data from our platform without
                      authorization
                    </li>
                    <li>
                      Use automated systems to access our services without
                      permission
                    </li>
                  </ul>
                  <p>
                    Violation of these conduct rules may result in immediate
                    suspension or termination of your account without refund.
                  </p>
                </div>
              </section>

              {/* 6. Privacy & Data */}
              <section id="privacy" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Lock className="h-6 w-6 text-blue-600 mr-2" />
                  6. Privacy & Data Protection
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    Your privacy is important to us. Our collection, use, and
                    protection of your personal information is governed by our
                    Privacy Policy, which is incorporated into these Terms by
                    reference.
                  </p>
                  <p>
                    <strong>Biometric Data:</strong> If you use our biometric
                    authentication features, you consent to our collection and
                    processing of your biometric data (fingerprints, facial
                    recognition) solely for authentication and security
                    purposes. This data is encrypted and stored securely in
                    accordance with applicable data protection laws.
                  </p>
                  <p>
                    <strong>Data Retention:</strong> We retain your data for as
                    long as your account is active or as needed to provide
                    services. You may request deletion of your data at any time,
                    subject to our legal retention obligations.
                  </p>
                  <p>
                    <strong>Data Security:</strong> We implement
                    industry-standard security measures to protect your data.
                    However, no method of transmission over the internet is 100%
                    secure, and we cannot guarantee absolute security.
                  </p>
                </div>
              </section>

              {/* 7. Termination */}
              <section id="termination" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="h-6 w-6 text-blue-600 mr-2" />
                  7. Termination
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    <strong>By You:</strong> You may terminate your account at
                    any time through your account settings or by contacting our
                    support team. Upon termination, your right to access and use
                    our services will immediately cease.
                  </p>
                  <p>
                    <strong>By Us:</strong> We reserve the right to suspend or
                    terminate your account at any time, with or without cause,
                    and with or without notice. Reasons for termination may
                    include, but are not limited to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Violation of these Terms of Service</li>
                    <li>Fraudulent or illegal activity</li>
                    <li>Non-payment of fees</li>
                    <li>Extended periods of inactivity</li>
                    <li>
                      Requests from law enforcement or regulatory authorities
                    </li>
                  </ul>
                  <p>
                    <strong>Effect of Termination:</strong> Upon termination,
                    all licenses and rights granted to you will immediately
                    cease. We may delete your data in accordance with our
                    retention policies. Provisions regarding payment
                    obligations, limitations of liability, and dispute
                    resolution will survive termination.
                  </p>
                </div>
              </section>

              {/* 8. Limitation of Liability */}
              <section id="liability" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Scale className="h-6 w-6 text-blue-600 mr-2" />
                  8. Limitation of Liability
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    <strong>Disclaimer:</strong> ManageHub is provided "as is"
                    and "as available" without warranties of any kind, either
                    express or implied, including but not limited to warranties
                    of merchantability, fitness for a particular purpose, or
                    non-infringement.
                  </p>
                  <p>
                    <strong>Limitation:</strong> To the maximum extent permitted
                    by law, ManageHub and its affiliates, officers, directors,
                    employees, and agents shall not be liable for any indirect,
                    incidental, special, consequential, or punitive damages,
                    including but not limited to:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>Loss of profits, revenue, or business opportunities</li>
                    <li>Loss of data or information</li>
                    <li>Business interruption</li>
                    <li>Personal injury or property damage</li>
                  </ul>
                  <p>
                    Our total liability to you for any claims arising from your
                    use of ManageHub shall not exceed the amount you paid us in
                    the 12 months preceding the claim.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
                    <p className="text-sm text-gray-700">
                      Some jurisdictions do not allow the exclusion of certain
                      warranties or limitation of liability. In such
                      jurisdictions, our liability will be limited to the
                      greatest extent permitted by law.
                    </p>
                  </div>
                </div>
              </section>

              {/* 9. Changes to Terms */}
              <section id="changes" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Bell className="h-6 w-6 text-blue-600 mr-2" />
                  9. Changes to Terms
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    We reserve the right to modify these Terms of Service at any
                    time. When we make changes, we will:
                  </p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li>
                      Update the "Last Updated" date at the top of this page
                    </li>
                    <li>Notify you via email or through the platform</li>
                    <li>
                      Provide at least 30 days' notice for material changes
                    </li>
                  </ul>
                  <p>
                    Your continued use of ManageHub after changes become
                    effective constitutes acceptance of the modified terms. If
                    you do not agree with the changes, you must stop using our
                    services and terminate your account.
                  </p>
                  <p>
                    We encourage you to review these Terms periodically to stay
                    informed of any updates.
                  </p>
                </div>
              </section>

              {/* 10. Contact Us */}
              <section id="contact" className="mb-10 scroll-mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                  <Mail className="h-6 w-6 text-blue-600 mr-2" />
                  10. Contact Us
                </h2>
                <div className="prose prose-gray max-w-none space-y-4 text-gray-700">
                  <p>
                    If you have any questions, concerns, or feedback regarding
                    these Terms of Service, please contact us:
                  </p>
                  <div className="bg-slate-50 border border-gray-200 rounded-lg p-6 mt-4">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Mail className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Email
                          </p>
                          <a
                            href="mailto:legal@managehub.com"
                            className="text-sm text-blue-600 hover:text-blue-700"
                          >
                            legal@managehub.com
                          </a>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Building2 className="h-5 w-5 text-blue-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Address
                          </p>
                          <p className="text-sm text-gray-600">
                            ManageHub Inc., Abuja, FCT, Nigeria
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Additional Legal Information */}
              <div className="border-t border-gray-200 pt-8 mt-12">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Additional Legal Information
                </h3>
                <div className="space-y-4 text-sm text-gray-700">
                  <p>
                    <strong>Governing Law:</strong> These Terms shall be
                    governed by and construed in accordance with the laws of the
                    Federal Republic of Nigeria, without regard to its conflict
                    of law provisions.
                  </p>
                  <p>
                    <strong>Dispute Resolution:</strong> Any disputes arising
                    from these Terms or your use of ManageHub shall be resolved
                    through binding arbitration in accordance with Nigerian law,
                    except where prohibited by law.
                  </p>
                  <p>
                    <strong>Severability:</strong> If any provision of these
                    Terms is found to be invalid or unenforceable, the remaining
                    provisions will continue in full force and effect.
                  </p>
                  <p>
                    <strong>Entire Agreement:</strong> These Terms, along with
                    our Privacy Policy, constitute the entire agreement between
                    you and ManageHub regarding the use of our services.
                  </p>
                </div>
              </div>
            </div>

            {/* Agreement Confirmation */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-8">
              <div className="flex items-start">
                <Shield className="h-6 w-6 text-blue-600 mt-0.5 mr-4 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-bold text-blue-900 mb-2">
                    Agreement Acknowledgment
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    By using ManageHub, you acknowledge that you have read,
                    understood, and agree to be bound by these Terms of Service
                    and our Privacy Policy.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/privacy-policy"
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-white border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
                    >
                      Read Privacy Policy
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Contact Support
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-500">
            <p>© 2025 ManageHub. All rights reserved.</p>
            <div className="mt-3 space-x-4">
              <Link href="/privacy-policy" className="hover:text-gray-700">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-gray-700">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-gray-700">
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
