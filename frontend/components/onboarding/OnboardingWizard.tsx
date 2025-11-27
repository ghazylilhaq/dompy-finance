"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding, OnboardingPayload } from "@/lib/api";
import { IntroStep } from "./IntroStep";
import { AccountsStep } from "./AccountsStep";
import { CategoriesStep } from "./CategoriesStep";
import { CompletionStep } from "./CompletionStep";

export type OnboardingData = OnboardingPayload;

const INITIAL_DATA: OnboardingData = {
  accounts: [],
  categories: [],
};

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleNext = () => setStep((s) => s + 1);
  const handleBack = () => setStep((s) => s - 1);

  const updateData = (updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding(data);
      handleNext(); // Move to completion step
    } catch (error) {
      console.error("Onboarding failed:", error);
      // Handle error (maybe show toast)
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinish = () => {
    router.replace("/dashboard");
  };

  const steps = [
    <IntroStep key="intro" onNext={handleNext} />,
    <AccountsStep key="accounts" data={data} updateData={updateData} onNext={handleNext} onBack={handleBack} />,
    <CategoriesStep key="categories" data={data} updateData={updateData} onNext={handleSubmit} onBack={handleBack} isSubmitting={isSubmitting} />,
    <CompletionStep key="completion" onFinish={handleFinish} />,
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="mb-8 flex justify-between items-center px-2">
        {/* Progress Indicator could go here */}
        <div className="text-sm text-muted-foreground">
          Step {step + 1} of {steps.length}
        </div>
      </div>
      {steps[step]}
    </div>
  );
}

