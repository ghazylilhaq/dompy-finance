"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOnboardingStatus } from "@/lib/hooks";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default function OnboardingPage() {
  const router = useRouter();
  const { onboardingStatus, isLoading } = useOnboardingStatus();

  useEffect(() => {
    // If already completed onboarding, redirect to dashboard
    if (onboardingStatus?.hasCompletedOnboarding) {
      router.replace("/dashboard");
    }
  }, [router, onboardingStatus]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <OnboardingWizard />;
}
