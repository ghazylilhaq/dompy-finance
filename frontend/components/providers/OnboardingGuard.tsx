"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { getOnboardingStatus } from "@/lib/api";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Wait for AuthProvider (which waits for Clerk)
    if (!isLoaded) return;

    // Skip check on onboarding page itself
    if (pathname.startsWith("/onboarding")) {
      setIsAuthorized(true);
      setIsLoading(false);
      return;
    }

    // If not signed in, we shouldn't be here (middleware should handle), but just in case:
    if (!isSignedIn) {
       // Let Clerk handle redirect or show nothing
       return; 
    }

    async function check() {
      try {
        const status = await getOnboardingStatus();
        if (!status.hasCompletedOnboarding) {
          router.replace("/onboarding");
        } else {
          setIsAuthorized(true);
        }
      } catch (error) {
        console.error("Failed to check onboarding status:", error);
        // If check fails (e.g. network error), we might want to retry or show error
        // But failing open (allowing access) defeats the purpose if the error is 403.
        // However, blocking the user completely is also bad if backend is down.
        // For 403 specifically, we should probably assume "not onboarded" or "auth error"
        
        // For now, fail safe: allow access so they can at least see the dashboard 
        // (which might also fail if 403, but maybe dashboard has better error handling UI)
        setIsAuthorized(true);
      } finally {
        setIsLoading(false);
      }
    }
    
    check();
  }, [router, pathname, isLoaded, isSignedIn]);

  if (isLoading || !isLoaded) {
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
