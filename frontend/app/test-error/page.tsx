// Test component to trigger errors for testing the error boundary
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export default function ErrorTestPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("This is a test error to demonstrate the error boundary");
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-4">Error Boundary Test</h1>
      <p className="text-gray-600 mb-6 text-center max-w-md">
        Click the button below to trigger an error and see the error boundary in action.
      </p>
      <Button 
        onClick={() => setShouldThrow(true)}
        variant="primary"
      >
        Trigger Error
      </Button>
    </div>
  );
}