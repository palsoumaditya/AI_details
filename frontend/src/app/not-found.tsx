import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="text-6xl font-extrabold text-accent mb-4">404</div>
      <h1 className="text-2xl font-bold text-text-primary mb-2">
        Page Not Found
      </h1>
      <p className="text-sm text-text-secondary mb-6">
        The page or resource you are looking for does not exist or has been
        moved.
      </p>
      <Link href="/">
        <Button variant="outline" size="sm">
          Return to AI Details Home
        </Button>
      </Link>
    </div>
  );
}
