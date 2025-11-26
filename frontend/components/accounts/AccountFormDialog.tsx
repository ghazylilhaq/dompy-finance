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
import { Account } from "@/types";
import { CATEGORY_ICONS, CATEGORY_COLORS } from "@/lib/constants";
import * as Icons from "lucide-react";
import { cn } from "@/lib/utils";

interface AccountFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (account: Omit<Account, "id">) => void;
  onDelete?: () => void;
  initialData?: Account;
}

export function AccountFormDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  onDelete,
  initialData
}: AccountFormDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<Account['type']>("cash");
  const [balance, setBalance] = useState<string>("0");
  const [selectedIcon, setSelectedIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [selectedColor, setSelectedColor] = useState<string>(CATEGORY_COLORS[0]);

  // Reset form when dialog opens or initialData changes
  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setName(initialData.name);
        setType(initialData.type);
        setBalance(initialData.balance.toString());
        setSelectedIcon(initialData.icon);
        setSelectedColor(initialData.color);
      } else {
        setName("");
        setType("cash");
        setBalance("0");
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
      balance: parseFloat(balance) || 0,
      icon: selectedIcon,
      color: selectedColor,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Account" : "Add Account"}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input 
              id="name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="e.g., Main Wallet"
              required
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="type">Account Type</Label>
            <Select value={type} onValueChange={(val: Account['type']) => setType(val)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="bank">Bank</SelectItem>
                <SelectItem value="credit card">Credit Card</SelectItem>
                <SelectItem value="e-wallet">E-Wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance">Initial Balance (IDR)</Label>
            <Input 
              id="balance" 
              type="number"
              step="1"
              value={balance} 
              onChange={(e) => setBalance(e.target.value)} 
              placeholder="0"
              required
            />
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

          <DialogFooter className="flex-col sm:justify-between gap-2">
            {initialData && onDelete && (
              <Button 
                type="button" 
                variant="destructive" 
                onClick={onDelete}
                className="w-full sm:w-auto"
              >
                Delete Account
              </Button>
            )}
            <Button type="submit" className="w-full sm:w-auto">
              {initialData ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

