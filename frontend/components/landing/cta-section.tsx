// frontend/src/components/landing/cta-section.tsx
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-blue-600  py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-0 h-96 w-96 rounded-full bg-blue-400/30 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-96 w-96 rounded-full bg-purple-400/30 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4" />
            Limited Time Offer
          </div>

          {/* Heading */}
          <h2 className="mt-6 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            Ready to transform your workspace?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-blue-100">
            Join hundreds of professionals and businesses using ManageHub to
            streamline their workspace management. Start your free trial today.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-8 py-4 text-base font-medium text-blue-600 shadow-xl transition-all hover:bg-gray-50 hover:shadow-2xl"
            >
              Start Free Trial
              <ArrowRight className="h-5 w-5" />
            </Link>

            <Link
              href="#pricing"
              className="inline-flex items-center gap-2 rounded-lg border-2 border-white bg-transparent px-8 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/80">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">Free 14-day trial</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
