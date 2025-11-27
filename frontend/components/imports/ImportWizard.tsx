"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  X,
  Link2,
  ArrowLeft,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValueMappingTable } from "./ValueMappingTable";
import { QuickCategoryDialog } from "./QuickCategoryDialog";
import { QuickAccountDialog } from "./QuickAccountDialog";
import { ImportPreviewTable } from "./ImportPreviewTable";
import { useApi } from "@/lib/auth-api";
import { useCategories, useAccounts } from "@/lib/hooks";
import {
  ParseResult,
  MappingItem,
  ImportResult,
  Category,
  Account,
  PreviewResult,
} from "@/types";

type ImportStep = "upload" | "mapping" | "preview" | "result";

interface ImportWizardProps {
  onComplete?: () => void;
}

export function ImportWizard({ onComplete }: ImportWizardProps) {
  const {
    parseImportFile,
    previewImport,
    confirmImport,
  } = useApi();
  const { categories, mutate: mutateCategories } = useCategories();
  const { accounts, mutate: mutateAccounts } = useAccounts();

  // Wizard state
  const [step, setStep] = useState<ImportStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(
    null
  );
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

  // Preview exclusion state
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(
    new Set()
  );
  const [isRefreshingPreview, setIsRefreshingPreview] = useState(false);

  // Track pending refresh for mapping fixes
  const pendingRefreshRef = useRef(false);

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

      // If no unmapped values, go directly to preview
      if (
        result.unmappedCategories.length === 0 &&
        result.unmappedAccounts.length === 0
      ) {
        // All mapped - generate preview
        const catMappingItems = Array.from(catMap.entries()).map(
          ([csv, id]) => ({
            csvValue: csv,
            internalId: id,
          })
        );
        const accMappingItems = Array.from(accMap.entries()).map(
          ([csv, id]) => ({
            csvValue: csv,
            internalId: id,
          })
        );

        const preview = await previewImport(
          result.profileId,
          result.parsedRows,
          catMappingItems,
          accMappingItems
        );

        setPreviewResult(preview);
        setExcludedIndices(new Set());
        setStep("preview");
      } else {
        setStep("mapping");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse file");
    } finally {
      setIsLoading(false);
    }
  };

  // Build mapping items from maps
  const buildMappingItems = (
    mappings: Map<string, string>,
    existingMappings: Record<string, string>
  ): MappingItem[] => {
    const items: MappingItem[] = [];
    mappings.forEach((id, csv) => {
      // Include all mappings for preview, only new ones for confirm
      items.push({ csvValue: csv, internalId: id });
    });
    return items;
  };

  // Generate preview after mapping
  const handleGeneratePreview = async () => {
    if (!parseResult) return;

    // Validate all unmapped values have mappings
    const missingCategories = parseResult.unmappedCategories.filter(
      (v) => !categoryMappings.has(v)
    );
    const missingAccounts = parseResult.unmappedAccounts.filter(
      (v) => !accountMappings.has(v)
    );

    if (missingCategories.length > 0 || missingAccounts.length > 0) {
      setError("Please map all values before previewing");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const catMappingItems = buildMappingItems(
        categoryMappings,
        parseResult.existingCategoryMappings
      );
      const accMappingItems = buildMappingItems(
        accountMappings,
        parseResult.existingAccountMappings
      );

      const preview = await previewImport(
        parseResult.profileId,
        parseResult.parsedRows,
        catMappingItems,
        accMappingItems
      );

      setPreviewResult(preview);
      setExcludedIndices(new Set());
      setStep("preview");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate preview"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Execute import with exclusions
  const executeImport = async () => {
    if (!parseResult) return;

    setIsLoading(true);
    setError(null);

    try {
      // Collect new mappings (only those not in existing)
      const newCategoryMappings: MappingItem[] = [];
      const newAccountMappings: MappingItem[] = [];

      categoryMappings.forEach((id, csv) => {
        if (!parseResult.existingCategoryMappings[csv]) {
          newCategoryMappings.push({ csvValue: csv, internalId: id });
        }
      });

      accountMappings.forEach((id, csv) => {
        if (!parseResult.existingAccountMappings[csv]) {
          newAccountMappings.push({ csvValue: csv, internalId: id });
        }
      });

      const importRes = await confirmImport(
        parseResult.profileId,
        newCategoryMappings,
        newAccountMappings,
        parseResult.parsedRows,
        Array.from(excludedIndices)
      );

      setImportResult(importRes);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle exclusion for a row
  const handleToggleExclude = (rowIndex: number) => {
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(rowIndex)) {
        next.delete(rowIndex);
      } else {
        next.add(rowIndex);
      }
      return next;
    });
  };

  // Exclude all invalid rows
  const handleExcludeInvalid = () => {
    if (!previewResult) return;
    const invalidIndices = previewResult.rows
      .filter((r) => !r.isValid)
      .map((r) => r.rowIndex);
    setExcludedIndices((prev) => {
      const next = new Set(prev);
      invalidIndices.forEach((i) => next.add(i));
      return next;
    });
  };

  // Fix category mapping from preview - sets pending refresh
  const handleFixCategoryMapping = useCallback(
    (csvValue: string, categoryId: string) => {
      setCategoryMappings((prev) => {
        const next = new Map(prev);
        next.set(csvValue, categoryId);
        return next;
      });
      pendingRefreshRef.current = true;
    },
    []
  );

  // Fix account mapping from preview - sets pending refresh
  const handleFixAccountMapping = useCallback(
    (csvValue: string, accountId: string) => {
      setAccountMappings((prev) => {
        const next = new Map(prev);
        next.set(csvValue, accountId);
        return next;
      });
      pendingRefreshRef.current = true;
    },
    []
  );

  // Effect to refresh preview when mappings change (after fix)
  useEffect(() => {
    if (!pendingRefreshRef.current || !parseResult || step !== "preview")
      return;
    pendingRefreshRef.current = false;

    const doRefresh = async () => {
      setIsRefreshingPreview(true);
      try {
        const catMappingItems = buildMappingItems(
          categoryMappings,
          parseResult.existingCategoryMappings
        );
        const accMappingItems = buildMappingItems(
          accountMappings,
          parseResult.existingAccountMappings
        );

        const preview = await previewImport(
          parseResult.profileId,
          parseResult.parsedRows,
          catMappingItems,
          accMappingItems
        );

        setPreviewResult(preview);
        // Keep existing exclusions that are still valid
        setExcludedIndices((prev) => {
          const validIndices = new Set(preview.rows.map((r) => r.rowIndex));
          const next = new Set<number>();
          prev.forEach((i) => {
            if (validIndices.has(i)) next.add(i);
          });
          return next;
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to refresh preview"
        );
      } finally {
        setIsRefreshingPreview(false);
      }
    };

    doRefresh();
  }, [categoryMappings, accountMappings, parseResult, step, previewImport]);

  // Go back from preview to mapping
  const handleBackToMapping = () => {
    setStep("mapping");
    setPreviewResult(null);
  };

  // Legacy handler - now goes to preview
  const handleConfirmMapping = async () => {
    await handleGeneratePreview();
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
    setPreviewResult(null);
    setImportResult(null);
    setCategoryMappings(new Map());
    setAccountMappings(new Map());
    setExcludedIndices(new Set());
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
                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
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
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
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
              Generating Preview...
            </>
          ) : (
            <>
              <Eye className="mr-2 h-4 w-4" />
              Preview Import ({parseResult.totalRows} rows)
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

  // Render preview step
  if (step === "preview" && previewResult && parseResult) {
    const importableCount = previewResult.rows.filter(
      (r) => r.isValid && !excludedIndices.has(r.rowIndex)
    ).length;

    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-heading">Preview Import</h2>
              <p className="text-muted-foreground">
                Review transactions before importing
                {previewResult.totalTransfers > 0 && (
                  <span className="ml-2 inline-flex items-center gap-1 text-blue-600">
                    <Link2 className="h-4 w-4" />
                    {previewResult.totalTransfers} transfers detected
                  </span>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBackToMapping}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="neutral" onClick={handleReset}>
                Cancel
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-2 border-red-200 rounded-base text-red-700 flex items-start gap-2 mb-4">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {previewResult.warnings.length > 0 && (
            <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-base text-yellow-700 mb-4">
              <h3 className="font-medium text-yellow-800 mb-2">Warnings:</h3>
              <ul className="text-sm space-y-1">
                {previewResult.warnings.map((w, i) => (
                  <li key={i}>• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <ImportPreviewTable
          rows={previewResult.rows}
          excludedIndices={excludedIndices}
          onToggleExclude={handleToggleExclude}
          onExcludeInvalid={handleExcludeInvalid}
          categories={categories}
          accounts={accounts}
          onFixCategoryMapping={handleFixCategoryMapping}
          onFixAccountMapping={handleFixAccountMapping}
          isRefreshing={isRefreshingPreview}
        />

        <Button
          onClick={executeImport}
          disabled={isLoading || importableCount === 0}
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
              Import {importableCount} Transactions
              {previewResult.totalTransfers > 0 &&
                ` (${previewResult.totalTransfers} transfers)`}
            </>
          )}
        </Button>
      </div>
    );
  }

  // Render result step
  if (step === "result" && importResult) {
    const hasErrors = importResult.errors.length > 0;
    const totalImported =
      importResult.importedCount + importResult.transferCount * 2;

    return (
      <Card className="p-8">
        <div className="text-center space-y-6">
          {importResult.importedCount > 0 || importResult.transferCount > 0 ? (
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500" />
          ) : (
            <AlertCircle className="h-16 w-16 mx-auto text-yellow-500" />
          )}

          <div>
            <h2 className="text-xl font-heading mb-2">
              {totalImported > 0 ? "Import Complete!" : "Import Finished"}
            </h2>
            <div className="text-muted-foreground space-y-1">
              {importResult.importedCount > 0 && (
                <p>✓ {importResult.importedCount} transactions imported</p>
              )}
              {importResult.transferCount > 0 && (
                <p className="text-blue-600">
                  <Link2 className="inline h-4 w-4 mr-1" />
                  {importResult.transferCount} transfers created
                </p>
              )}
              {importResult.skippedCount > 0 && (
                <p className="text-yellow-600">
                  ⚠ {importResult.skippedCount} rows skipped
                </p>
              )}
            </div>
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
