"use client";

import { useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingData } from "./OnboardingWizard";
import { Category } from "@/types";

interface CategoriesStepProps {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

const RECOMMENDED_CATEGORIES = [
  { name: "Food & Dining", type: "expense", icon: "Utensils", color: "#F59E0B" },
  { name: "Transportation", type: "expense", icon: "Car", color: "#3B82F6" },
  { name: "Housing", type: "expense", icon: "Home", color: "#8B5CF6" },
  { name: "Utilities", type: "expense", icon: "Zap", color: "#FBBF24" },
  { name: "Shopping", type: "expense", icon: "ShoppingBag", color: "#EC4899" },
  { name: "Salary", type: "income", icon: "Banknote", color: "#10B981" },
  { name: "Freelance", type: "income", icon: "Briefcase", color: "#059669" },
];

export function CategoriesStep({ data, updateData, onNext, onBack, isSubmitting }: CategoriesStepProps) {
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<"income" | "expense">("expense");

  const toggleCategory = (rec: typeof RECOMMENDED_CATEGORIES[0]) => {
    const exists = data.categories.find(c => c.name === rec.name && c.type === rec.type);
    if (exists) {
      updateData({
        categories: data.categories.filter(c => c.name !== rec.name || c.type !== rec.type)
      });
    } else {
      updateData({
          categories: [...data.categories, { ...rec, icon: rec.icon, color: rec.color } as Omit<Category, "id" | "createdAt" | "updatedAt" | "isSystem">]
      });
    }
  };

  const addCustomCategory = () => {
    if (!customName.trim()) return;
    updateData({
      categories: [...data.categories, {
        name: customName,
        type: customType,
        icon: "Circle", // Default icon
        color: customType === "income" ? "#10B981" : "#EF4444",
      }]
    });
    setCustomName("");
  };

  const removeCategory = (index: number) => {
    const newCats = [...data.categories];
    newCats.splice(index, 1);
    updateData({ categories: newCats });
  };

  const isSelected = (rec: typeof RECOMMENDED_CATEGORIES[0]) => {
    return data.categories.some(c => c.name === rec.name && c.type === rec.type);
  };

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader>
        <CardTitle>Step 2: Categories</CardTitle>
        <CardDescription>
          Select categories you use frequently. We&apos;ve picked some popular ones for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-3">Recommended</h3>
          <div className="flex flex-wrap gap-2">
            {RECOMMENDED_CATEGORIES.map((rec) => (
              <Badge
                key={`${rec.type}-${rec.name}`}
                variant={isSelected(rec) ? "default" : "outline"}
                className={`cursor-pointer px-3 py-2 text-sm ${isSelected(rec) ? "" : "hover:bg-muted"}`}
                onClick={() => toggleCategory(rec)}
              >
                {isSelected(rec) && <Check className="w-3 h-3 mr-2" />}
                {rec.name}
                <span className="ml-2 opacity-50 text-xs uppercase">({rec.type})</span>
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <h3 className="font-semibold">Custom Category</h3>
          <div className="flex gap-2">
            <Input
              placeholder="Category Name (e.g. Gym)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomCategory()}
            />
            <div className="flex rounded-md border shadow-sm">
              <Button
                variant={customType === "expense" ? "noShadow" : "ghost"}
                className="rounded-r-none px-3"
                onClick={() => setCustomType("expense")}
              >
                Exp
              </Button>
              <Button
                variant={customType === "income" ? "noShadow" : "ghost"}
                className="rounded-l-none px-3"
                onClick={() => setCustomType("income")}
              >
                Inc
              </Button>
            </div>
            <Button onClick={addCustomCategory} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-semibold">Selected ({data.categories.length})</h3>
          </div>
          <div className="max-h-[200px] overflow-y-auto space-y-1">
            {data.categories.length === 0 && (
              <div className="text-sm text-muted-foreground italic">No categories selected.</div>
            )}
            {data.categories.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm p-2 bg-muted/30 rounded">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span>{cat.name}</span>
                  <span className="text-xs text-muted-foreground">({cat.type})</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeCategory(idx)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between pt-6">
        <Button variant="outline" onClick={onBack} disabled={isSubmitting}>Back</Button>
        <Button onClick={onNext} disabled={isSubmitting || data.categories.length === 0}>
          {isSubmitting ? "Setting up..." : "Finish Setup"}
        </Button>
      </CardFooter>
    </Card>
  );
}

