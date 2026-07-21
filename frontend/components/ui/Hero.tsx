import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center bg-[#faf9f7] px-6 pt-28 pb-20 overflow-hidden grain">
      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-[1.1fr_0.9fr] gap-16 items-center">
        {/* Text — left side */}
        <div className="fade-in-up max-w-xl">
          <h1 className="text-4xl sm:text-5xl md:text-6xl leading-[1.1] tracking-tight text-gray-900 mb-6">
            <span className="font-light">Workspace management</span>
            <br />
            <span className="font-bold">that just works.</span>
          </h1>

          <p className="text-lg text-gray-500 mb-10 max-w-md">
            One place for bookings, billing, and access control — so you can
            focus on what matters.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="px-7 py-3.5 rounded-full bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
            >
              Get started free
            </Link>
            <Link
              href="#how-it-works"
              className="px-7 py-3.5 rounded-full border border-gray-300 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
            >
              See how it works
            </Link>
          </div>
        </div>

        {/* Floating dashboard mockup — right side */}
        <div className="fade-in-up-delay-2 relative hidden lg:block">
          <div className="relative ml-8 -mr-12">
            {/* Main card */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">
                    Your workspace
                  </p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">
                    Acme HQ
                  </p>
                </div>
                <span className="text-xs font-medium bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full">
                  Active
                </span>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: "Members", value: "128" },
                  { label: "Desks booked", value: "84%" },
                  { label: "Revenue", value: "$12.4k" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-2xl font-bold text-gray-900">
                      {s.value}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Mini bar chart */}
              <div className="flex items-end gap-2 h-16">
                {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-md bg-gray-900"
                    style={{ height: `${h}%`, opacity: 0.15 + i * 0.1 }}
                  />
                ))}
              </div>
            </div>

            {/* Floating accent card */}
            <div className="absolute -bottom-6 -left-8 bg-white rounded-xl shadow-lg border border-gray-100 px-5 py-4 flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-sm">
                +3
              </span>
              <div>
                <p className="text-sm font-medium text-gray-900">New members</p>
                <p className="text-xs text-gray-400">Joined today</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
