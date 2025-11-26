"use client";

import React, { useState, useCallback } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValueMappingTable } from "./ValueMappingTable";
import { QuickCategoryDialog } from "./QuickCategoryDialog";
import { QuickAccountDialog } from "./QuickAccountDialog";
import { useApi } from "@/lib/auth-api";
import { useCategories, useAccounts } from "@/lib/hooks";
import {
  ParseResult,
  MappingItem,
  ImportResult,
  Category,
  Account,
  ParsedRow,
} from "@/types";

type ImportStep = "upload" | "mapping" | "result";

interface ImportWizardProps {
  onComplete?: () => void;
}

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const { parseImportFile, confirmImport, createCategory, createAccount } =
    useApi();
  const { categories, mutate: mutateCategories } = useCategories();
  const { accounts, mutate: mutateAccounts } = useAccounts();

  // Wizard state
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mapping state
  const [categoryMappings, setCategoryMappings] = useState<Map<string, string>>(
    new Map()
  );
  const [accountMappings, setAccountMappings] = useState<Map<string, string>>(
    new Map()
  );

  // Quick creation dialogs
  const [quickCategoryOpen, setQuickCategoryOpen] = useState(false);
  const [quickCategoryValue, setQuickCategoryValue] = useState("");
  const [quickAccountOpen, setQuickAccountOpen] = useState(false);
  const [quickAccountValue, setQuickAccountValue] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    // Reset the file input
    const fileInput = document.getElementById(
      "file-upload"
    ) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleParse = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await parseImportFile(file);
      setParseResult(result);

      // Initialize mappings from existing
      const catMap = new Map<string, string>();
      Object.entries(result.existingCategoryMappings).forEach(([csv, id]) => {
        catMap.set(csv, id);
      });
      setCategoryMappings(catMap);

      const accMap = new Map<string, string>();
      Object.entries(result.existingAccountMappings).forEach(([csv, id]) => {
        accMap.set(csv, id);
      });
      setAccountMappings(accMap);

      // If no unmapped values, skip to auto-import
      if (
        result.unmappedCategories.length === 0 &&
        result.unmappedAccounts.length === 0
      ) {
        // Auto-import
        await executeImport(result, catMap, accMap);
      } else {
        setStep("mapping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  };

  const executeImport = async (
    result: ParseResult,
    catMappings: Map<string, string>,
    accMappings: Map<string, string>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // Collect new mappings (only those not in existing)
      const newCategoryMappings: MappingItem[] = [];
      const newAccountMappings: MappingItem[] = [];

      catMappings.forEach((id, csv) => {
        if (!result.existingCategoryMappings[csv]) {
          newCategoryMappings.push({ csvValue: csv, internalId: id });
        }
      });

      accMappings.forEach((id, csv) => {
        if (!result.existingAccountMappings[csv]) {
          newAccountMappings.push({ csvValue: csv, internalId: id });
        }
      });

      const importRes = await confirmImport(
        result.profileId,
        newCategoryMappings,
        newAccountMappings,
        result.parsedRows
      );

      setImportResult(importRes);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmMapping = async () => {
    if (!parseResult) return;

    // Validate all unmapped values have mappings
    const missingCategories = parseResult.unmappedCategories.filter(
      (v) => !categoryMappings.has(v)
    );
    const missingAccounts = parseResult.unmappedAccounts.filter(
      (v) => !accountMappings.has(v)
    );

    if (missingCategories.length > 0 || missingAccounts.length > 0) {
      setError("Please map all values before importing");
      return;
    }

    await executeImport(parseResult, categoryMappings, accountMappings);
  };

  const handleCategoryMappingChange = (
    csvValue: string,
    internalId: string
  ) => {
    setCategoryMappings((prev) => {
      const next = new Map(prev);
      next.set(csvValue, internalId);
      return next;
    });
  };

  const handleAccountMappingChange = (csvValue: string, internalId: string) => {
    setAccountMappings((prev) => {
      const next = new Map(prev);
      next.set(csvValue, internalId);
      return next;
    });
  };

  const handleCreateCategory = (csvValue: string) => {
    setQuickCategoryValue(csvValue);
    setQuickCategoryOpen(true);
  };

  const handleCreateAccount = (csvValue: string) => {
    setQuickAccountValue(csvValue);
    setQuickAccountOpen(true);
  };

  const handleCategoryCreated = async (category: Category) => {
    // Auto-select the newly created category
    setCategoryMappings((prev) => {
      const next = new Map(prev);
      next.set(quickCategoryValue, category.id);
      return next;
    });
    setQuickCategoryOpen(false);
    mutateCategories();
  };

  const handleAccountCreated = async (account: Account) => {
    // Auto-select the newly created account
    setAccountMappings((prev) => {
      const next = new Map(prev);
      next.set(quickAccountValue, account.id);
      return next;
    });
    setQuickAccountOpen(false);
    mutateAccounts();
  };

  const handleReset = () => {
    setStep("upload");
    setFile(null);
    setParseResult(null);
    setImportResult(null);
    setCategoryMappings(new Map());
    setAccountMappings(new Map());
    setError(null);
  };

  // Render upload step
  if (step === "upload") {
    return (
      <Card className="p-8">
        <div className="space-y-6">
          <div className="text-center">
            <FileSpreadsheet className="h-16 w-16 mx-auto text-main mb-4" />
            <h2 className="text-xl font-heading mb-2">Import Transactions</h2>
            <p className="text-muted-foreground">
              Upload your CSV or Excel file with transaction data
            </p>
          </div>

          <div className="space-y-4">
            {/* File Upload Area */}
            {!file ? (
              <div className="border-2 border-dashed border-border rounded-base p-8 text-center hover:border-main hover:bg-main/5 transition-all cursor-pointer">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <span className="font-medium">Click to select file</span>
                  <span className="text-sm text-muted-foreground">
                    CSV or Excel (.xlsx) files supported
                  </span>
                </Label>
              </div>
            ) : (
              <div className="border-2 border-green-400 bg-green-50 rounded-base p-6 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-base bg-green-100 flex items-center justify-center">
                      <FileCheck className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-800">{file.name}</p>
                      <p className="text-sm text-green-600">
                        {(file.size / 1024).toFixed(1)} KB • Ready to parse
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="neutral"
                    size="icon"
                    onClick={handleClearFile}
                    className="h-8 w-8 hover:bg-red-100 hover:text-red-600 hover:border-red-300"
                    title="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {/* Hidden file input for re-selection */}
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-base text-red-700 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="bg-secondary-background p-4 rounded-base border-2 border-border">
              <h3 className="font-medium mb-2">Expected Columns:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <strong>Id</strong> - External identifier
                </li>
                <li>
                  • <strong>Date</strong> - Transaction date (dd/MM/yyyy)
                </li>
                <li>
                  • <strong>Categories</strong> - Category name
                </li>
                <li>
                  • <strong>Amount</strong> - Amount (negative for expenses)
                </li>
                <li>
                  • <strong>Accounts</strong> - Account name
                </li>
                <li>
                  • <strong>Description</strong> - Transaction description
                </li>
              </ul>
            </div>
          </div>

          <Button
            onClick={handleParse}
            disabled={!file || isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Parse File
              </>
            )}
          </Button>
        </div>
      </Card>
    );
  }

  // Render mapping step
  if (step === "mapping" && parseResult) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-heading">Map Values</h2>
              <p className="text-muted-foreground">
                {parseResult.totalRows} transactions ready to import
              </p>
            </div>
            <Button variant="neutral" onClick={handleReset}>
              Cancel
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-base text-red-700 flex items-start gap-2 mb-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </Card>

        {parseResult.unmappedCategories.length > 0 && (
          <ValueMappingTable
            title="Category Mappings"
            description="Map CSV category values to your existing categories"
            unmappedValues={parseResult.unmappedCategories}
            existingItems={categories.map((c) => ({ id: c.id, name: c.name }))}
            mappings={categoryMappings}
            onMappingChange={handleCategoryMappingChange}
            onCreateNew={handleCreateCategory}
          />
        )}

        {parseResult.unmappedAccounts.length > 0 && (
          <ValueMappingTable
            title="Account Mappings"
            description="Map CSV account values to your existing accounts"
            unmappedValues={parseResult.unmappedAccounts}
            existingItems={accounts.map((a) => ({ id: a.id, name: a.name }))}
            mappings={accountMappings}
            onMappingChange={handleAccountMappingChange}
            onCreateNew={handleCreateAccount}
          />
        )}

        <Button
          onClick={handleConfirmMapping}
          disabled={isLoading}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Confirm & Import {parseResult.totalRows} Transactions
            </>
          )}
        </Button>

        <QuickCategoryDialog
          isOpen={quickCategoryOpen}
          onOpenChange={setQuickCategoryOpen}
          suggestedName={quickCategoryValue}
          existingCategories={categories}
          onCreated={handleCategoryCreated}
        />

        <QuickAccountDialog
          isOpen={quickAccountOpen}
          onOpenChange={setQuickAccountOpen}
          suggestedName={quickAccountValue}
          onCreated={handleAccountCreated}
        />
      </div>
    );
  }

  // Render result step
  if (step === "result" && importResult) {
    const hasErrors = importResult.errors.length > 0;

    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          {importResult.importedCount > 0 ? (
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
          )}

          <div>
            <h2 className="text-xl font-heading mb-2">
              {importResult.importedCount > 0
                ? "Import Complete!"
                : "Import Finished"}
            </h2>
            <p className="text-muted-foreground">
              Successfully imported {importResult.importedCount} transactions
              {importResult.skippedCount > 0 && (
                <span className="text-yellow-600">
                  {" "}
                  ({importResult.skippedCount} skipped)
                </span>
              )}
            </p>
          </div>

          {hasErrors && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-base p-4 text-left">
              <h3 className="font-medium text-yellow-800 mb-2">
                Some rows had issues:
              </h3>
              <ul className="text-sm text-yellow-700 space-y-1 max-h-40 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((err, i) => (
                  <li key={i}>• {err}</li>
                ))}
                {importResult.errors.length > 10 && (
                  <li className="text-yellow-600">
                    ... and {importResult.errors.length - 10} more
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex gap-4 justify-center">
            <Button variant="neutral" onClick={handleReset}>
              Import Another
            </Button>
            {onComplete && (
              <Button onClick={onComplete}>View Transactions</Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
