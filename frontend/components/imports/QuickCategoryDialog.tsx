"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import * as Icons from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApi } from "@/lib/auth-api";
import { Category, TransactionType } from "@/types";
import { CATEGORY_COLORS, CATEGORY_ICONS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface QuickCategoryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedName: string;
  existingCategories: Category[];
  onCreated: (category: Category) => void;
}

export function QuickCategoryDialog({
  isOpen,
  onOpenChange,
  suggestedName,
  existingCategories,
  onCreated,
}: QuickCategoryDialogProps) {
  const { createCategory } = useApi();
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [parentId, setParentId] = useState<string>("none");
  const [selectedIcon, setSelectedIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(
    CATEGORY_COLORS[0]
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName(suggestedName);
      setType("expense");
      setParentId("none");
      setSelectedIcon(CATEGORY_ICONS[0]);
      setSelectedColor(CATEGORY_COLORS[0]);
      setError(null);
    }
  }, [isOpen, suggestedName]);

  // Filter potential parents (same type, no parent)
  const potentialParents = existingCategories.filter(
    (c) => c.type === type && !c.parentId
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newCategory = await createCategory({
        name: name.trim(),
        type,
        color: selectedColor,
        icon: selectedIcon,
        parentId: parentId === "none" ? undefined : parentId,
      });
      onCreated(newCategory);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create category"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Category</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={type === "income" ? "default" : "neutral"}
              onClick={() => {
                setType("income");
                setParentId("none");
              }}
              className="w-full"
            >
              Income
            </Button>
            <Button
              type="button"
              variant={type === "expense" ? "default" : "neutral"}
              onClick={() => {
                setType("expense");
                setParentId("none");
              }}
              className="w-full"
            >
              Expense
            </Button>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="category-name">Category Name</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries"
              required
            />
          </div>

          {/* Parent Category */}
          <div className="space-y-2">
            <Label htmlFor="parent">Parent Category (Optional)</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="None (Top Level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Top Level)</SelectItem>
                {potentialParents.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2 p-2 border-2 border-border rounded-base max-h-40 overflow-y-auto bg-secondary-background">
              {CATEGORY_ICONS.map((iconName) => {
                const Icon =
                  (
                    Icons as unknown as Record<
                      string,
                      React.ComponentType<{ className?: string }>
                    >
                  )[iconName] || Icons.HelpCircle;
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={cn(
                      "p-2 rounded-base flex items-center justify-center transition-all hover:bg-main/20",
                      isSelected
                        ? "bg-main text-main-foreground ring-2 ring-black"
                        : "text-foreground"
                    )}
                    title={iconName}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-3">
              {CATEGORY_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 border-border shadow-sm transition-transform hover:scale-110",
                    selectedColor === color
                      ? "ring-2 ring-offset-2 ring-black"
                      : ""
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <DialogFooter>
            <Button
              type="button"
              variant="neutral"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
