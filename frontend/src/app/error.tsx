"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Application Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mb-4 text-xl font-bold">
        !
      </div>
      <h2 className="text-xl font-bold text-text-primary mb-2">
        Something went wrong
      </h2>
      <p className="text-sm text-text-secondary mb-6">
        An unexpected error occurred while rendering the page.
      </p>
      <Button onClick={() => reset()} variant="primary" size="sm">
        Try again
      </Button>
    </div>
  );
}
