"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ImportWizard } from "@/components/imports/ImportWizard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ImportTransactionsPage() {
  const router = useRouter();

  const handleComplete = () => {
    router.push("/transactions");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import Transactions"
        description="Upload CSV or Excel files to import transactions"
      >
        <Button variant="neutral" onClick={() => router.push("/transactions")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Transactions
        </Button>
      </PageHeader>

      <ImportWizard onComplete={handleComplete} />
    </div>
  );
}

