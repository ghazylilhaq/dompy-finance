"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Eye, ArrowLeftRight } from "lucide-react";
import * as Icons from "lucide-react";
import { AccountFormDialog } from "@/components/accounts/AccountFormDialog";
import { TransferFormDialog } from "@/components/transfers";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Account } from "@/types";
import { useAccounts } from "@/lib/hooks";
import { useApi } from "@/lib/auth-api";
import { formatIDR } from "@/lib/formatCurrency";

export default function AccountsPage() {
  const router = useRouter();
  const { accounts, isLoading: loading, error, mutate } = useAccounts();
  const { createAccount, updateAccount, deleteAccount, getTransactionCount } =
    useApi();

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>(
    undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTransactionCount, setDeleteTransactionCount] = useState<
    number | null
  >(null);

  // Transfer State
  const [transferFromAccount, setTransferFromAccount] =
    useState<Account | null>(null);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  // Fetch transaction count when delete dialog opens
  useEffect(() => {
    if (deleteId) {
      setDeleteTransactionCount(null);
      getTransactionCount({ accountId: deleteId })
        .then(setDeleteTransactionCount)
        .catch(() => setDeleteTransactionCount(0));
    }
  }, [deleteId, getTransactionCount]);

  const handleAddAccount = async (newAccountData: Omit<Account, "id">) => {
    try {
      setIsSubmitting(true);
      await createAccount(newAccountData);
      mutate(); // Refresh list
      setIsFormOpen(false);
    } catch (err) {
      console.error("Create account error:", err);
      alert(err instanceof Error ? err.message : "Failed to create account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAccount = async (updatedData: Omit<Account, "id">) => {
    if (!editingAccount) return;

    try {
      setIsSubmitting(true);
      await updateAccount(editingAccount.id, updatedData);
      mutate(); // Refresh list
      setEditingAccount(undefined);
      setIsFormOpen(false);
    } catch (err) {
      console.error("Update account error:", err);
      alert(err instanceof Error ? err.message : "Failed to update account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string) => {
    try {
      setIsSubmitting(true);
      await deleteAccount(id);
      mutate(); // Refresh list
      setIsFormOpen(false);
      setDeleteId(null);
    } catch (err) {
      console.error("Delete account error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = (id: string) => {
    setIsFormOpen(false); // Close edit dialog if open
    setDeleteId(id);
  };

  const openCreateDialog = () => {
    setEditingAccount(undefined);
    setIsFormOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setIsFormOpen(true);
  };

  const openTransferDialog = (account: Account) => {
    setTransferFromAccount(account);
    setIsTransferOpen(true);
  };

  const handleTransferSuccess = () => {
    mutate(); // Refresh account balances
  };

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Accounts"
          description="Manage your sources of funds"
        />
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-base border-2 border-red-200">
          <p className="font-bold">Error loading accounts</p>
          <p className="text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Accounts" description="Manage your sources of funds">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Account
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-40 rounded-base" />
          <Skeleton className="h-40 rounded-base" />
          <Skeleton className="h-40 rounded-base" />
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-base bg-main/5">
          <p className="text-muted-foreground font-bold mb-2">
            No accounts found.
          </p>
          <Button onClick={openCreateDialog} variant="neutral">
            Create your first account to get started.
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {accounts.map((account) => {
            const IconComponent =
              (
                Icons as unknown as Record<
                  string,
                  React.ComponentType<{ className?: string }>
                >
              )[account.icon] || Icons.HelpCircle;
            const isNegative = account.balance < 0;

            return (
              <Card key={account.id} className="relative group overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold">
                    {account.name}
                  </CardTitle>
                  <div
                    className="p-2 rounded-base border-2 border-border"
                    style={{ backgroundColor: account.color }}
                  >
                    <IconComponent className="h-5 w-5 text-black" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-2xl font-bold mb-1 ${
                      isNegative ? "text-red-500" : ""
                    }`}
                  >
                    {formatIDR(account.balance)}
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">
                    {account.type.replace("_", " ")}
                  </p>
                </CardContent>

                {/* Actions Overlay */}
                <div className="absolute bottom-0 right-0 h-full w-1/2 bg-linear-to-l from-secondary-background via-secondary-background to-transparent flex justify-end items-center gap-1 pr-4 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-in-out z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-main/20"
                    onClick={() => openTransferDialog(account)}
                    title="Transfer"
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-main/20"
                    onClick={() =>
                      router.push(`/transactions?account=${account.id}`)
                    }
                    title="View Transactions"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-main/20"
                    onClick={() => openEditDialog(account)}
                    title="Edit Account"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <AccountFormDialog
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={editingAccount ? handleEditAccount : handleAddAccount}
        initialData={editingAccount}
        onDelete={
          editingAccount ? () => confirmDelete(editingAccount.id) : undefined
        }
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              {deleteTransactionCount === null ? (
                "Loading..."
              ) : deleteTransactionCount > 0 ? (
                <>
                  Are you sure you want to delete this account? This will also
                  delete{" "}
                  <strong>
                    {deleteTransactionCount} transaction
                    {deleteTransactionCount !== 1 ? "s" : ""}
                  </strong>
                  . This action cannot be undone.
                </>
              ) : (
                "Are you sure you want to delete this account? This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDeleteAccount(deleteId)}
              disabled={isSubmitting || deleteTransactionCount === null}
            >
              {isSubmitting
                ? "Deleting..."
                : deleteTransactionCount && deleteTransactionCount > 0
                ? `Delete Account & ${deleteTransactionCount} Transaction${
                    deleteTransactionCount !== 1 ? "s" : ""
                  }`
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      {transferFromAccount && (
        <TransferFormDialog
          isOpen={isTransferOpen}
          onOpenChange={setIsTransferOpen}
          fromAccount={transferFromAccount}
          accounts={accounts}
          onSuccess={handleTransferSuccess}
        />
      )}
    </div>
  );
}
