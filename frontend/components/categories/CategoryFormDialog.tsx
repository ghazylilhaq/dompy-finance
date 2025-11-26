"use client";

import React, { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Category, TransactionType } from "@/types";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/constants";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (category: Omit<Category, "id">) => void;
  existingCategories: Category[];
  initialData?: Category;
  onDelete?: () => void;
}

export function CategoryFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  existingCategories,
  initialData,
  onDelete,
}: CategoryFormDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [parentId, setParentId] = useState<string>("none");
  const [selectedIcon, setSelectedIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(CATEGORY_COLORS[0]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setType(initialData.type);
        setParentId(initialData.parentId || "none");
        setSelectedIcon(initialData.icon);
        setSelectedColor(initialData.color);
      } else {
        setName("");
        setType("expense");
        setParentId("none");
        setSelectedIcon(CATEGORY_ICONS[0]);
        setSelectedColor(CATEGORY_COLORS[0]);
      }
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    onSubmit({
      name,
      type,
      icon: selectedIcon,
      color: selectedColor,
      parentId: parentId === "none" ? undefined : parentId
    });
    onOpenChange(false);
  };

  // Filter potential parents:
  // 1. Must not be a system category
  // 2. Must be same type
  // 3. Must be a top-level category (no parentId)
  // 4. Must not be self (in edit mode)
  const potentialParents = existingCategories.filter(
    c => !c.isSystem && c.type === type && !c.parentId && c.id !== initialData?.id
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Category" : "Add Category"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              type="button"
              variant={type === 'income' ? 'default' : 'neutral'}
              onClick={() => { setType('income'); setParentId("none"); }}
              className="w-full"
            >
              Income
            </Button>
            <Button
              type="button"
              variant={type === 'expense' ? 'default' : 'neutral'}
              onClick={() => { setType('expense'); setParentId("none"); }}
              className="w-full"
            >
              Expense
            </Button>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Category Name</Label>
            <Input 
              id="name" 
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
                {potentialParents.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only top-level categories can be parents.
            </p>
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-6 gap-2 p-2 border-2 border-border rounded-base max-h-40 overflow-y-auto bg-secondary-background">
              {CATEGORY_ICONS.map((iconName) => {
                const Icon = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[iconName] || Icons.HelpCircle;
                const isSelected = selectedIcon === iconName;
                return (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => setSelectedIcon(iconName)}
                    className={cn(
                      "p-2 rounded-base flex items-center justify-center transition-all hover:bg-main/20",
                      isSelected ? "bg-main text-main-foreground ring-2 ring-black" : "text-foreground"
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
                    selectedColor === color ? "ring-2 ring-offset-2 ring-black" : ""
                  )}
                  style={{ backgroundColor: color }}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            {onDelete && initialData && (
              <Button
                type="button"
                variant="destructive"
                onClick={onDelete}
                className="w-full sm:w-auto"
              >
                Delete
              </Button>
            )}
            <Button type="submit" className="w-full sm:flex-1">
              {initialData ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
