"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useOnboardingStatus } from "@/lib/hooks";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { onboardingStatus, isLoading: isCheckingStatus } =
    useOnboardingStatus();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for AuthProvider (which waits for Clerk)
    if (!isLoaded) return;

    // Skip check on onboarding page itself
    if (pathname.startsWith("/onboarding")) {
      setIsAuthorized(true);
      return;
    }

    // If not signed in, we shouldn't be here (middleware should handle), but just in case:
    if (!isSignedIn) {
      // Let Clerk handle redirect or show nothing
      return;
    }

    // Wait for onboarding status to load
    if (isCheckingStatus) return;

    // Check onboarding status from SWR cache
    if (onboardingStatus) {
      if (!onboardingStatus.hasCompletedOnboarding) {
        router.replace("/onboarding");
      } else {
        setIsAuthorized(true);
      }
    } else {
      // If status is undefined (error), fail safe and allow access
      setIsAuthorized(true);
    }
  }, [
    router,
    pathname,
    isLoaded,
    isSignedIn,
    onboardingStatus,
    isCheckingStatus,
  ]);

  if (isCheckingStatus || !isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
