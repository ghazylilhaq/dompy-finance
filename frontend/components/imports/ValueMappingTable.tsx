"use client";

import React from "react";
import { Plus, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ValueMappingTableProps {
  title: string;
  description?: string;
  unmappedValues: string[];
  existingItems: Array<{ id: string; name: string }>;
  mappings: Map<string, string>;
  onMappingChange: (csvValue: string, internalId: string) => void;
  onCreateNew: (csvValue: string) => void;
}

export function ValueMappingTable({
  title,
  description,
  unmappedValues,
  existingItems,
  mappings,
  onMappingChange,
  onCreateNew,
}: ValueMappingTableProps) {
  if (unmappedValues.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden">
      <div className="p-4 border-b-2 border-border bg-secondary-background">
        <h3 className="font-heading text-lg">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40%]">CSV Value</TableHead>
            <TableHead className="w-[40%]">Map To</TableHead>
            <TableHead className="w-[20%]">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {unmappedValues.map((csvValue) => {
            const mappedId = mappings.get(csvValue);
            const isMapped = !!mappedId;

            return (
              <TableRow key={csvValue}>
                <TableCell className="font-mono text-sm">
                  {csvValue}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Select
                      value={mappedId || ""}
                      onValueChange={(value) => onMappingChange(csvValue, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {existingItems.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="neutral"
                      size="icon"
                      onClick={() => onCreateNew(csvValue)}
                      title="Create new"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  {isMapped ? (
                    <Badge
                      className={cn(
                        "bg-green-100 text-green-800 border-green-300"
                      )}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Mapped
                    </Badge>
                  ) : (
                    <Badge
                      className={cn(
                        "bg-yellow-100 text-yellow-800 border-yellow-300"
                      )}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Needs mapping
                    </Badge>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

