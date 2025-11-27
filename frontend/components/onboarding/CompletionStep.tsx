import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

interface CompletionStepProps {
  onFinish: () => void;
}

export function CompletionStep({ onFinish }: CompletionStepProps) {
  return (
    <Card className="border-2 shadow-lg border-primary/20">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-3xl font-bold">All Set!</CardTitle>
        <CardDescription className="text-lg mt-2">
          Your workspace is ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4 pt-6">
        <p className="text-muted-foreground">
          We've created your accounts and categories. You can now start tracking your expenses and income.
        </p>
      </CardContent>
      <CardFooter className="flex justify-center pt-6">
        <Button size="lg" onClick={onFinish} className="w-full sm:w-auto min-w-[200px]">
          Go to Dashboard
        </Button>
      </CardFooter>
    </Card>
  );
}

