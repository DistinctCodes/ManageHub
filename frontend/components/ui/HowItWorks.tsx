const steps = [
  {
    number: "01",
    title: "Set up your space",
    desc: "Create your workspace in under a minute.",
  },
  {
    number: "02",
    title: "Invite your team",
    desc: "Add members with a single link.",
  },
  {
    number: "03",
    title: "Manage everything",
    desc: "Bookings, billing, access — all in one place.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="px-6 py-28 bg-background">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          How it works
        </h2>
        <p className="text-muted-foreground mb-16 max-w-md">
          Three steps. No onboarding calls, no week-long setup.
        </p>

        <div className="relative grid md:grid-cols-3 gap-12 md:gap-8">
          {/* connecting line — desktop only */}
          <div className="hidden md:block absolute top-5 left-[16.6%] right-[16.6%] h-px bg-border" />

          {steps.map((s, i) => (
            <div
              key={s.number}
              className={`fade-in-up-delay-${i + 1} relative`}
            >
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-sm font-bold mb-5 relative z-10">
                {s.number}
              </span>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {s.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}