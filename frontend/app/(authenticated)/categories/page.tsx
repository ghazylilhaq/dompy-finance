"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit, Eye } from "lucide-react";
import * as Icons from "lucide-react";
import { CategoryFormDialog } from "@/components/categories/CategoryFormDialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Category } from "@/types";
import { useCategories } from "@/lib/hooks";
import { useApi } from "@/lib/auth-api";

// Helper for icons
const getIcon = (
  iconName: string
): React.ComponentType<{ className?: string }> => {
  return (
    (
      Icons as unknown as Record<
        string,
        React.ComponentType<{ className?: string }>
      >
    )[iconName] || Icons.HelpCircle
  );
};

export default function CategoriesPage() {
  const router = useRouter();
  const { categories, isLoading: loading, error, mutate } = useCategories();
  const {
    createCategory,
    updateCategory,
    deleteCategory,
    getTransactionCount,
  } = useApi();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | undefined>(
    undefined
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTransactionCount, setDeleteTransactionCount] = useState<
    number | null
  >(null);

  // Fetch transaction count when delete dialog opens
  useEffect(() => {
    if (deleteId) {
      setDeleteTransactionCount(null);
      getTransactionCount({ categoryId: deleteId })
        .then(setDeleteTransactionCount)
        .catch(() => setDeleteTransactionCount(0));
    }
  }, [deleteId, getTransactionCount]);

  const handleAddCategory = async (newCategoryData: Omit<Category, "id">) => {
    try {
      await createCategory(newCategoryData);
      mutate(); // Refresh list
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Create category error:", err);
      alert(err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleEditCategory = async (updatedData: Omit<Category, "id">) => {
    if (!editingCategory) return;

    try {
      await updateCategory(editingCategory.id, updatedData);
      mutate(); // Refresh list
      setEditingCategory(undefined);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Update category error:", err);
      alert(err instanceof Error ? err.message : "Failed to update category");
    }
  };

  const confirmDelete = (id: string) => {
    setIsDialogOpen(false); // Close edit dialog if open
    setDeleteId(id);
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      setIsSubmitting(true);
      await deleteCategory(id);
      mutate(); // Refresh list
      setEditingCategory(undefined);
      setDeleteId(null);
    } catch (err) {
      console.error("Delete category error:", err);
      alert(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openCreateDialog = () => {
    setEditingCategory(undefined);
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    setIsDialogOpen(true);
  };

  // Filter out system categories (transfer categories) from display
  const userCategories = categories.filter((c) => !c.isSystem);

  // Grouping Logic
  const incomeCategories = userCategories.filter((c) => c.type === "income");
  const expenseCategories = userCategories.filter((c) => c.type === "expense");

  const organizeHierarchy = (cats: Category[]) => {
    const parents = cats.filter((c) => !c.parentId);
    const children = cats.filter((c) => c.parentId);

    return parents.map((parent) => ({
      ...parent,
      children: children.filter((child) => child.parentId === parent.id),
    }));
  };

  const incomeHierarchy = organizeHierarchy(incomeCategories);
  const expenseHierarchy = organizeHierarchy(expenseCategories);

  const CategoryGroup = ({
    title,
    groups,
  }: {
    title: string;
    groups: ReturnType<typeof organizeHierarchy>;
  }) => (
    <div className="space-y-4">
      <h2 className="text-xl font-heading border-b-2 border-border pb-2">
        {title}
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((group) => {
          const IconComponent = getIcon(group.icon);
          return (
            <Card
              key={group.id}
              className="flex flex-col p-0 overflow-hidden h-full"
            >
              {/* Parent Header */}
              <div className="relative group overflow-hidden p-4 flex items-center gap-4 border-b-2 border-border bg-secondary-background">
                <div
                  className="p-3 rounded-base border-2 border-border shrink-0"
                  style={{ backgroundColor: group.color }}
                >
                  <IconComponent className="h-6 w-6 text-black" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg truncate" title={group.name}>
                    {group.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {group.children.length} subcategories
                  </p>
                </div>

                {/* Parent Drawer / Overlay Actions */}
                <div className="absolute bottom-0 right-0 h-full w-1/2 bg-linear-to-l from-secondary-background via-secondary-background to-transparent flex justify-end items-center gap-1 pr-4 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-in-out">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-main/20"
                    onClick={() =>
                      router.push(`/transactions?category=${group.id}`)
                    }
                    title="View Transactions"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-main/20"
                    onClick={() => openEditDialog(group)}
                    title="Edit Category"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Children List */}
              <div className="p-4 flex-1 bg-main/5 space-y-2">
                {group.children.length > 0 ? (
                  group.children.map((child) => {
                    const ChildIcon = getIcon(child.icon);
                    return (
                      <div
                        key={child.id}
                        className="relative group overflow-hidden flex items-center gap-2 p-2 rounded-base bg-white border-2 border-border shadow-sm"
                      >
                        <div
                          className="p-1 rounded-sm"
                          style={{ backgroundColor: child.color }}
                        >
                          <ChildIcon className="h-3 w-3 text-black" />
                        </div>
                        <span className="text-sm font-medium truncate">
                          {child.name}
                        </span>

                        {/* Drawer / Overlay Actions */}
                        <div className="absolute bottom-0 right-0 h-full w-1/2 bg-linear-to-l from-white via-white to-transparent flex justify-end items-center gap-1 pr-2 translate-x-full group-hover:translate-x-0 transition-transform duration-200 ease-in-out">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-main/20"
                            onClick={() =>
                              router.push(`/transactions?category=${child.id}`)
                            }
                            title="View Transactions"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 hover:bg-main/20"
                            onClick={() => openEditDialog(child)}
                            title="Edit Category"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm italic opacity-50 py-4">
                    No subcategories
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );

  if (error) {
    return (
      <div className="space-y-8">
        <PageHeader
          title="Categories"
          description="Manage your income and expense categories"
        />
        <div className="p-8 text-center text-red-600 bg-red-50 rounded-base border-2 border-red-200">
          <p className="font-bold">Error loading categories</p>
          <p className="text-sm">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Categories"
        description="Manage your income and expense categories"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Skeleton className="h-48 rounded-base" />
            <Skeleton className="h-48 rounded-base" />
            <Skeleton className="h-48 rounded-base" />
            <Skeleton className="h-48 rounded-base" />
          </div>
        </div>
      ) : userCategories.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-border rounded-base bg-main/5">
          <p className="text-muted-foreground font-bold mb-2">
            No categories found.
          </p>
          <Button onClick={openCreateDialog} variant="neutral">
            Create your first category to get started.
          </Button>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Only show sections if they have items */}
          {incomeHierarchy.length > 0 && (
            <CategoryGroup title="Income" groups={incomeHierarchy} />
          )}
          {expenseHierarchy.length > 0 && (
            <CategoryGroup title="Expenses" groups={expenseHierarchy} />
          )}
          {/* If categories exist but hierarchy logic filters them all out (shouldn't happen if logic is correct), show fallback */}
          {incomeHierarchy.length === 0 && expenseHierarchy.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Categories exist but could not be organized.
              </p>
            </div>
          )}
        </div>
      )}

      <CategoryFormDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSubmit={editingCategory ? handleEditCategory : handleAddCategory}
        existingCategories={userCategories}
        initialData={editingCategory}
        onDelete={
          editingCategory ? () => confirmDelete(editingCategory.id) : undefined
        }
      />

      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              {deleteTransactionCount === null ? (
                "Loading..."
              ) : deleteTransactionCount > 0 ? (
                <>
                  Are you sure you want to delete this category? This will also
                  delete{" "}
                  <strong>
                    {deleteTransactionCount} transaction
                    {deleteTransactionCount !== 1 ? "s" : ""}
                  </strong>
                  . This action cannot be undone.
                </>
              ) : (
                "Are you sure you want to delete this category? This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDeleteCategory(deleteId)}
              disabled={isSubmitting || deleteTransactionCount === null}
            >
              {isSubmitting
                ? "Deleting..."
                : deleteTransactionCount && deleteTransactionCount > 0
                ? `Delete Category & ${deleteTransactionCount} Transaction${
                    deleteTransactionCount !== 1 ? "s" : ""
                  }`
                : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
