"use client";

import React, { useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Link2,
  ArrowDownLeft,
  ArrowUpRight,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { PreviewRow, Category, Account } from "@/types";
import { formatIDR } from "@/lib/formatCurrency";
import { cn } from "@/lib/utils";

interface ImportPreviewTableProps {
  rows: PreviewRow[];
  excludedIndices: Set<number>;
  onToggleExclude: (rowIndex: number) => void;
  onExcludeInvalid: () => void;
  // For inline fixing
  categories: Category[];
  accounts: Account[];
  onFixCategoryMapping: (csvValue: string, categoryId: string) => void;
  onFixAccountMapping: (csvValue: string, accountId: string) => void;
  isRefreshing?: boolean;
}

// Detect if error is a stale mapping issue
function isStaleCategoryError(errors: string[]): boolean {
  return errors.some(
    (e) =>
      e.toLowerCase().includes("category") &&
      (e.toLowerCase().includes("no longer exists") ||
        e.toLowerCase().includes("not found") ||
        e.toLowerCase().includes("deleted"))
  );
}

function isStaleAccountError(errors: string[]): boolean {
  return errors.some(
    (e) =>
      e.toLowerCase().includes("account") &&
      (e.toLowerCase().includes("no longer exists") ||
        e.toLowerCase().includes("not found") ||
        e.toLowerCase().includes("deleted"))
  );
}

function isMissingCategoryError(errors: string[]): boolean {
  return errors.some(
    (e) =>
      e.toLowerCase().includes("category") &&
      e.toLowerCase().includes("required")
  );
}

function isMissingAccountError(errors: string[]): boolean {
  return errors.some(
    (e) =>
      e.toLowerCase().includes("account") &&
      e.toLowerCase().includes("required")
  );
}

export function ImportPreviewTable({
  rows,
  excludedIndices,
  onToggleExclude,
  onExcludeInvalid,
  categories,
  accounts,
  onFixCategoryMapping,
  onFixAccountMapping,
  isRefreshing = false,
}: ImportPreviewTableProps) {
  // Count stats
  const validCount = rows.filter(
    (r) => r.isValid && !excludedIndices.has(r.rowIndex)
  ).length;
  const invalidCount = rows.filter((r) => !r.isValid).length;
  const excludedCount = excludedIndices.size;
  const transferCount =
    rows.filter((r) => r.isTransfer && r.transferPairIndex !== null).length / 2;

  // Count fixable issues (rows with stale mappings that can be fixed inline)
  const fixableCount = rows.filter((r) => {
    if (r.isValid || excludedIndices.has(r.rowIndex)) return false;
    return (
      isStaleCategoryError(r.validationErrors) ||
      isStaleAccountError(r.validationErrors) ||
      isMissingCategoryError(r.validationErrors) ||
      isMissingAccountError(r.validationErrors)
    );
  }).length;

  // Get unique CSV values that need fixing
  const brokenCategoryValues = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((r) => {
      if (
        !excludedIndices.has(r.rowIndex) &&
        (isStaleCategoryError(r.validationErrors) ||
          isMissingCategoryError(r.validationErrors)) &&
        r.categoryValue
      ) {
        values.add(r.categoryValue);
      }
    });
    return values;
  }, [rows, excludedIndices]);

  const brokenAccountValues = useMemo(() => {
    const values = new Set<string>();
    rows.forEach((r) => {
      if (
        !excludedIndices.has(r.rowIndex) &&
        (isStaleAccountError(r.validationErrors) ||
          isMissingAccountError(r.validationErrors)) &&
        r.accountValue
      ) {
        values.add(r.accountValue);
      }
    });
    return values;
  }, [rows, excludedIndices]);

  // Get type icon
  const getTypeIcon = (row: PreviewRow) => {
    if (row.isTransfer) {
      if (row.amount < 0) {
        return <ArrowUpRight className="h-4 w-4 text-orange-500" />;
      }
      return <ArrowDownLeft className="h-4 w-4 text-blue-500" />;
    }
    if (row.type === "expense") {
      return <ArrowUpRight className="h-4 w-4 text-red-500" />;
    }
    return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
  };

  // Get type label
  const getTypeLabel = (row: PreviewRow) => {
    if (row.isTransfer) {
      return row.amount < 0 ? "Out Transfer" : "In Transfer";
    }
    return row.type === "expense" ? "Expense" : "Income";
  };

  // Get status badge
  const getStatusBadge = (row: PreviewRow) => {
    const isExcluded = excludedIndices.has(row.rowIndex);

    if (isExcluded) {
      return (
        <Badge variant="outline" className="text-muted-foreground">
          Excluded
        </Badge>
      );
    }

    if (!row.isValid) {
      const canFix =
        isStaleCategoryError(row.validationErrors) ||
        isStaleAccountError(row.validationErrors) ||
        isMissingCategoryError(row.validationErrors) ||
        isMissingAccountError(row.validationErrors);

      if (canFix) {
        return (
          <Badge className="gap-1 bg-amber-500 hover:bg-amber-600">
            <Wrench className="h-3 w-3" />
            Fixable
          </Badge>
        );
      }

      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Invalid
        </Badge>
      );
    }

    if (row.isTransfer && row.transferPairIndex !== null) {
      return (
        <Badge className="gap-1 bg-blue-500 hover:bg-blue-600">
          <Link2 className="h-3 w-3" />
          Pair #{Math.min(row.rowIndex, row.transferPairIndex) + 1}
        </Badge>
      );
    }

    return (
      <Badge className="gap-1 bg-green-500 hover:bg-green-600">
        <CheckCircle2 className="h-3 w-3" />
        Valid
      </Badge>
    );
  };

  // Check if row has specific issues
  const rowHasCategoryIssue = (row: PreviewRow) => {
    return (
      !row.isValid &&
      (isStaleCategoryError(row.validationErrors) ||
        isMissingCategoryError(row.validationErrors))
    );
  };

  const rowHasAccountIssue = (row: PreviewRow) => {
    return (
      !row.isValid &&
      (isStaleAccountError(row.validationErrors) ||
        isMissingAccountError(row.validationErrors))
    );
  };

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{validCount}</p>
              <p className="text-sm text-green-600">Valid</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
              <p className="text-sm text-red-600">Invalid</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">
                {transferCount}
              </p>
              <p className="text-sm text-blue-600">Transfers</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-gray-600" />
            <div>
              <p className="text-2xl font-bold text-gray-700">
                {excludedCount}
              </p>
              <p className="text-sm text-gray-600">Excluded</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Fixable Issues Panel */}
      {(brokenCategoryValues.size > 0 || brokenAccountValues.size > 0) && (
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <Wrench className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-medium text-amber-800">
                  {fixableCount} rows have fixable issues
                </h3>
                <p className="text-sm text-amber-700">
                  Some mappings point to deleted items. Fix them below to
                  validate these rows:
                </p>
              </div>

              {/* Broken Category Mappings */}
              {brokenCategoryValues.size > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800">
                    Category mappings to fix:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from(brokenCategoryValues).map((csvValue) => (
                      <div
                        key={csvValue}
                        className="flex items-center gap-2 bg-white rounded-base border border-amber-200 p-2"
                      >
                        <span className="text-sm font-mono text-amber-800 truncate flex-1">
                          &quot;{csvValue}&quot;
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <Select
                          onValueChange={(value) =>
                            onFixCategoryMapping(csvValue, value)
                          }
                        >
                          <SelectTrigger className="w-[160px] h-8 text-sm">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Broken Account Mappings */}
              {brokenAccountValues.size > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-amber-800">
                    Account mappings to fix:
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {Array.from(brokenAccountValues).map((csvValue) => (
                      <div
                        key={csvValue}
                        className="flex items-center gap-2 bg-white rounded-base border border-amber-200 p-2"
                      >
                        <span className="text-sm font-mono text-amber-800 truncate flex-1">
                          &quot;{csvValue}&quot;
                        </span>
                        <span className="text-muted-foreground">→</span>
                        <Select
                          onValueChange={(value) =>
                            onFixAccountMapping(csvValue, value)
                          }
                        >
                          <SelectTrigger className="w-[160px] h-8 text-sm">
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isRefreshing && (
                <div className="flex items-center gap-2 text-amber-700">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Refreshing preview...</span>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Actions */}
      {invalidCount > 0 && fixableCount < invalidCount && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onExcludeInvalid}>
            <XCircle className="mr-2 h-4 w-4" />
            Exclude All Invalid ({invalidCount})
          </Button>
        </div>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-secondary-background z-10">
              <TableRow>
                <TableHead className="w-[50px]">
                  <span className="sr-only">Exclude</span>
                </TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const isExcluded = excludedIndices.has(row.rowIndex);
                const hasError = !row.isValid;
                const hasCategoryIssue = rowHasCategoryIssue(row);
                const hasAccountIssue = rowHasAccountIssue(row);

                return (
                  <TableRow
                    key={row.rowIndex}
                    className={cn(
                      isExcluded && "opacity-50 bg-muted/50",
                      hasError && !isExcluded && "bg-red-50/50",
                      row.isTransfer &&
                        row.transferPairIndex !== null &&
                        "bg-blue-50/30"
                    )}
                  >
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={isExcluded}
                        onChange={() => onToggleExclude(row.rowIndex)}
                        className="h-4 w-4 rounded border-2 border-border"
                        title={isExcluded ? "Include row" : "Exclude row"}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {row.parsedDate ? (
                        new Date(row.parsedDate).toLocaleDateString()
                      ) : (
                        <span className="text-red-500">{row.date}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(row)}
                        <span className="text-sm">{getTypeLabel(row)}</span>
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-mono",
                        row.amount < 0 ? "text-red-600" : "text-green-600"
                      )}
                    >
                      {formatIDR(row.amount)}
                    </TableCell>
                    <TableCell>
                      {row.categoryName ? (
                        <span>{row.categoryName}</span>
                      ) : hasCategoryIssue && !isExcluded ? (
                        <span className="text-amber-600 font-medium">
                          ⚠ {row.categoryValue || "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          {row.categoryValue || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {row.accountName ? (
                        <span>{row.accountName}</span>
                      ) : hasAccountIssue && !isExcluded ? (
                        <span className="text-amber-600 font-medium">
                          ⚠ {row.accountValue || "—"}
                        </span>
                      ) : (
                        <span className="text-muted-foreground italic">
                          {row.accountValue || "—"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className="max-w-[200px] truncate"
                      title={row.description}
                    >
                      {row.description || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(row)}
                        {row.validationErrors.length > 0 && !isExcluded && (
                          <span className="text-xs text-red-500">
                            {row.validationErrors[0]}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
