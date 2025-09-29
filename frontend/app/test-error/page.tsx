"use client";

import { useState } from "react";

export default function TestErrorPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("Test error to demonstrate the error boundary");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Test Error Boundary</h1>
      <p className="text-gray-600 mb-6 text-center">
        Click the button below to trigger an error and see the error boundary in action.
      </p>
      <button 
        onClick={() => setShouldThrow(true)}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        Trigger Error
      </button>
    </div>
  );
}