"use client"
import { Building2, X, Menu, Clock } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { TimePill } from "./TimePill";


/* ---------------- Countdown Timer ---------------- */
export function CountdownTimer({ targetDate }: { targetDate: string | Date }) {
    const target = useMemo(() => new Date(targetDate), [targetDate]);
    const [now, setNow] = useState<Date>(new Date());
  
    useEffect(() => {
      const id = setInterval(() => setNow(new Date()), 1000);
      return () => clearInterval(id);
    }, []);
  
    const diff = Math.max(0, target.getTime() - now.getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
  
    return (
      <div className="w-full max-w-xl mx-auto bg-white rounded-2xl p-8 shadow-lg text-gray-800">
        <div className="flex items-center justify-center gap-2 mb-5">
          <Clock className="w-6 h-6 text-[#155dfc]" size={12}/>
          <span className="text-black font-bold">Launching In</span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <TimePill label="Days" value={days} />
          <TimePill label="Hours" value={hours} />
          <TimePill label="Minutes" value={minutes} />
          <TimePill label="Seconds" value={seconds} />
        </div>
      </div>
    );
  }