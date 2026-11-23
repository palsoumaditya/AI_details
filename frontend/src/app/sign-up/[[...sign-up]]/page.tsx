import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata = {
  title: "Create Account — AI Details Platform",
  description: "Create an account to access AI Details model discovery, benchmarks, and comparison intelligence.",
};

export default function SignUpPage() {
  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Home</span>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-800 text-xs font-medium mb-1">
            <Sparkles className="h-3.5 w-3.5 text-blue-600" />
            <span>Free Community Access</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Create your account
          </h1>
          <p className="text-sm text-text-secondary">
            Join developers and researchers analyzing foundation AI models.
          </p>
        </div>

        <div className="flex justify-center">
          <SignUp
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-white shadow-sm border border-slate-200 rounded-2xl p-6",
                headerTitle: "text-slate-900 font-bold",
                headerSubtitle: "text-slate-600 text-sm",
                socialButtonsBlockButton:
                  "border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg",
                formButtonPrimary:
                  "bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg py-2.5",
                formFieldInput:
                  "border-slate-300 focus:border-blue-600 focus:ring-blue-600 text-slate-900 text-sm rounded-lg",
                footerActionLink: "text-blue-600 hover:text-blue-700 font-medium",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
