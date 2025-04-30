import React from "react";
import { Check } from "lucide-react";

const CustomToast = ({ message }) => {
  return (
    <>
      <div className="flex items-center gap-2 text-white px-4 py-3 rounded-lg border-l-[7px] border-[#FDBC04] shadow-lg max-w-xs w-full bg-gray-800 absolute top-0 right-0 z-50">
        <div className="bg-[#FDBC04] rounded-full p-1 -mt-3">
          <Check className="w-3 h-3 text-gray-900" />
        </div>

        <div className="flex flex-col">
          <span className="font-semibold">Success</span>
          <span className="text-sm text-gray-400">{message}</span>
        </div>

        <button
          className="ml-auto text-[11px] text-gray-400 hover:text-white border-white border-[1px] rounded-[50%] px-[4px] py-[0.2px] -mt-6"
          onClick={() => {
            /* Add close handler */
          }}
        >
          <span className="sr-only">Close</span>✕
        </button>
      </div>
    </>
  );
};

export default CustomToast;
