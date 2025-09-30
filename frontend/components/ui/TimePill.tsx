"use client"


export function TimePill({ label, value }: { label: string; value: number }) {
    return (
      <div className="flex flex-col items-center">
        <div className="px-4 py-3 rounded-lg bg-[#155dfc] text-white text-xl font-extrabold w-full">
          {String(value).padStart(2, "0")}
        </div>
        <div className="text-md text-gray-500 mt-2">{label}</div>
      </div>
    );
  }