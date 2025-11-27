"use client";

import { useState } from "react";
import { Plus, Trash2, Wallet, Landmark, CreditCard, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "./OnboardingWizard";
import { AccountType } from "@/types";

interface AccountsStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

const RECOMMENDED_ACCOUNTS: Array<{
  name: string;
  type: AccountType;
  icon: string;
  color: string;
  label: string;
  defaultBalance: number;
}> = [
  { name: "Cash Wallet", type: "cash", icon: "Wallet", color: "#10B981", label: "Cash", defaultBalance: 0 },
  { name: "Main Bank", type: "bank", icon: "Landmark", color: "#3B82F6", label: "Bank Account", defaultBalance: 0 },
  { name: "Credit Card", type: "credit_card", icon: "CreditCard", color: "#F59E0B", label: "Credit Card", defaultBalance: 0 },
];

export function AccountsStep({ data, updateData, onNext, onBack }: AccountsStepProps) {
  const [errors, setErrors] = useState<string[]>([]);

  const addAccount = (rec?: typeof RECOMMENDED_ACCOUNTS[0]) => {
    const newAccount = {
      name: rec ? rec.name : "New Account",
      type: rec ? rec.type : "cash",
      balance: rec ? rec.defaultBalance : 0,
      color: rec ? rec.color : "#9CA3AF",
      icon: rec ? rec.icon : "Wallet",
    };
    updateData({ accounts: [...data.accounts, newAccount] });
  };

  const removeAccount = (index: number) => {
    const newAccounts = [...data.accounts];
    newAccounts.splice(index, 1);
    updateData({ accounts: newAccounts });
  };

  const updateAccountField = (index: number, field: string, value: string | number) => {
    const newAccounts = [...data.accounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    updateData({ accounts: newAccounts });
  };

  const handleNext = () => {
    if (data.accounts.length === 0) {
      setErrors(["Please add at least one account to continue."]);
      return;
    }
    setErrors([]);
    onNext();
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle>Step 1: Add Accounts</CardTitle>
        <CardDescription>
          Add your financial accounts. You can start with these recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Recommendations */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RECOMMENDED_ACCOUNTS.map((rec) => (
            <Button
              key={rec.label}
              variant="outline"
              className="h-auto py-4 flex flex-col gap-2 border-dashed"
              onClick={() => addAccount(rec)}
            >
              {rec.type === "cash" && <Wallet className="w-6 h-6" />}
              {rec.type === "bank" && <Landmark className="w-6 h-6" />}
              {(rec.type === "credit_card" || rec.type === "credit card") && <CreditCard className="w-6 h-6" />}
              <span className="font-medium">{rec.label}</span>
            </Button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Your Accounts</h3>
            <Button size="sm" variant="ghost" onClick={() => addAccount()}>
              <Plus className="w-4 h-4 mr-2" /> Custom
            </Button>
          </div>
          
          {data.accounts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
              No accounts added yet. Click a recommendation above.
            </div>
          )}

          {data.accounts.map((acc, idx) => (
            <div key={idx} className="flex gap-3 items-start p-3 rounded-lg border bg-card">
              <div className="grid gap-3 flex-1 sm:grid-cols-12">
                <div className="sm:col-span-4">
                  <Label className="text-xs mb-1 block">Name</Label>
                  <Input
                    value={acc.name}
                    onChange={(e) => updateAccountField(idx, "name", e.target.value)}
                    placeholder="Account Name"
                  />
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs mb-1 block">Type</Label>
                  <Select
                    value={acc.type}
                    onValueChange={(val) => updateAccountField(idx, "type", val)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank">Bank</SelectItem>
                      <SelectItem value="credit_card">Credit Card</SelectItem>
                      <SelectItem value="e-wallet">E-Wallet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-4">
                  <Label className="text-xs mb-1 block">Initial Balance</Label>
                  <Input
                    type="number"
                    value={acc.balance}
                    onChange={(e) => updateAccountField(idx, "balance", parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive mt-6"
                onClick={() => removeAccount(idx)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        {errors.length > 0 && (
          <div className="text-sm text-destructive font-medium">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleNext} disabled={data.accounts.length === 0}>
          Next: Categories
        </Button>
      </CardFooter>
    </Card>
  );
}

