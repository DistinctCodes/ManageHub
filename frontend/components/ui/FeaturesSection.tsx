const features = [
  {
    emoji: "👥",
    title: "Team management",
    desc: "Roles, permissions, and member directories — all tidy.",
    accent: "bg-blue-50",
    area: "a",
  },
  {
    emoji: "📊",
    title: "Real-time analytics",
    desc: "Occupancy, revenue, and engagement at a glance.",
    accent: "bg-amber-50",
    area: "b",
  },
  {
    emoji: "🔐",
    title: "Access control",
    desc: "Secure entry with biometrics or key cards.",
    accent: "bg-emerald-50",
    area: "c",
  },
  {
    emoji: "📱",
    title: "Mobile ready",
    desc: "Check in and book from any device.",
    accent: "bg-purple-50",
    area: "d",
  },
  {
    emoji: "⚡",
    title: "Automated billing",
    desc: "Invoices and subscriptions on autopilot.",
    accent: "bg-rose-50",
    area: "e",
  },
  {
    emoji: "🌐",
    title: "Multi-location",
    desc: "Manage every site from one dashboard.",
    accent: "bg-cyan-50",
    area: "f",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="relative px-6 py-28 bg-[#faf9f7] grain">
      <div className="max-w-5xl mx-auto">
        <div className="mb-16 max-w-lg">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need,
            <br />
            nothing you don&apos;t.
          </h2>
          <p className="text-gray-500">
            Built for coworking spaces, tech hubs, and modern offices.
          </p>
        </div>

        {/* Bento grid */}
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "auto auto auto",
            gridTemplateAreas: `
              "a a b b"
              "c d d e"
              "c f f e"
            `,
          }}
        >
          {features.map((f, i) => {
            const isLarge = f.area === "a" || f.area === "b";
            return (
              <div
                key={f.title}
                className={`fade-in-up-delay-${Math.min(i + 1, 4)} ${f.accent} rounded-2xl p-6 md:p-8 flex flex-col justify-end border border-gray-100`}
                style={{ gridArea: f.area }}
              >
                <span className="text-2xl mb-3">{f.emoji}</span>
                <h3
                  className={`font-semibold text-gray-900 mb-1 ${isLarge ? "text-xl" : "text-base"}`}
                >
                  {f.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>

        {/* Mobile fallback — simple stack */}
        <style>{`
          @media (max-width: 639px) {
            #features .grid {
              display: flex !important;
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </section>
  );
};

export default FeaturesSection;
