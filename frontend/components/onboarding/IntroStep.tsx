import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletCards } from "lucide-react";

interface IntroStepProps {
  onNext: () => void;
}

export function IntroStep({ onNext }: IntroStepProps) {
  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <WalletCards className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold">Welcome to NeoBudget</CardTitle>
        <CardDescription className="text-lg mt-2">
          Let's set up your financial workspace in just a few steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 text-center">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-1">1. Add Accounts</h3>
            <p className="text-sm text-muted-foreground">
              Where do you keep your money? Cash, Bank, etc.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-1">2. Set Categories</h3>
            <p className="text-sm text-muted-foreground">
              Organize your spending (Food, Rent, etc.)
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h3 className="font-semibold mb-1">3. Start Tracking</h3>
            <p className="text-sm text-muted-foreground">
              We'll prepare everything for you.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-center pt-6">
        <Button size="lg" onClick={onNext} className="w-full sm:w-auto min-w-[200px]">
          Get Started
        </Button>
      </CardFooter>
    </Card>
  );
}

