"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api";

/**
 * AuthProvider component that initializes the API client with Clerk authentication.
 * Must be used within ClerkProvider.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken, isLoaded } = useAuth();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for Clerk to be loaded
    if (!isLoaded) return;

    // Set the token getter for the API client
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error("Failed to get auth token:", error);
        return null;
      }
    });

    // Mark as ready only after setting the getter
    setIsReady(true);
  }, [getToken, isLoaded]);

  if (!isReady) {
    return null; // or a loading spinner
  }

  return <>{children}</>;
}
