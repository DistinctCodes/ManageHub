const companies = ["Acme Corp", "Lattice", "Runway", "Vercel", "Linear", "Notion"];

export default function TrustedBy() {
  return (
    <section className="px-6 py-16 bg-[#faf9f7]">
      <div className="max-w-5xl mx-auto">
        <p className="text-sm text-gray-400 uppercase tracking-widest mb-8 text-center">
          Trusted by teams at
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
          {companies.map((name) => (
            <span
              key={name}
              className="text-lg font-semibold text-gray-300 select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
