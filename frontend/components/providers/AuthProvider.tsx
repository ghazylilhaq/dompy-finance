"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { setAuthTokenGetter } from "@/lib/api";

/**
 * AuthProvider component that initializes the API client with Clerk authentication.
 * Must be used within ClerkProvider.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    // Set the token getter for the API client
    setAuthTokenGetter(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error("Failed to get auth token:", error);
        return null;
      }
    });
  }, [getToken]);

  return <>{children}</>;
}








