import { Star } from "lucide-react";
import { CountdownTimer } from "./CountDownTimer";

export function Hero({
  launchDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 45),
}: {
  launchDate?: Date | string;
}) {
  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center bg-[#f8fafc] px-6 pt-40">
      <div className="flex gap-2 items-center justify-center mb-4 px-4 py-1 rounded-full border border-gray-300 text-sm text-[#155dfc] shadow-sm">
        <Star color="#fea419" size={16} /> Something Amazing is Coming
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold leading-tight text-gray-900 mb-6">
        The Future of <br />
        <span className="bg-gradient-to-r from-[#2563EB] to-[#0D9488] bg-clip-text text-transparent">
          Workspace Management
        </span>
      </h1>

      <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
        Revolutionary platform combining biometric authentication, real-time
        analytics, and blockchain technology to transform how tech hubs and
        coworking spaces operate.
      </p>

      <CountdownTimer targetDate={launchDate} />
    </section>
  );
}
