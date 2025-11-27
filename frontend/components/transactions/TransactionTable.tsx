"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Transaction, Category, Account } from "@/types";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/formatCurrency";
import { Button } from "@/components/ui/button";
import { Edit, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onEdit?: (transaction: Transaction) => void;
  compact?: boolean;
}

export function TransactionTable({
  transactions,
  categories,
  accounts,
  onEdit,
  compact = false,
}: TransactionTableProps) {
  const router = useRouter();
  const getCategory = (id: string) => categories.find((c) => c.id === id);
  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  if (transactions.length === 0) {
    return (
      <div className="rounded-base border-2 border-dashed border-border p-12 text-center bg-main/5">
        <p className="text-muted-foreground font-bold text-lg">
          No transactions found.
        </p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or add a new transaction.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-base border-2 border-border overflow-hidden bg-main/5">
      <Table>
        <TableHeader className="bg-secondary-background">
          <TableRow className="border-b-2 border-border hover:bg-transparent">
            <TableHead className="w-[120px] text-foreground font-bold">
              Date
            </TableHead>
            <TableHead className="text-foreground font-bold">
              Description
            </TableHead>
            <TableHead className="text-foreground font-bold">
              Category
            </TableHead>
            {!compact && (
              <TableHead className="text-foreground font-bold">Account</TableHead>
            )}
            <TableHead className="text-right text-foreground font-bold w-[150px]">
              Amount
            </TableHead>
            {/* Actions Column */}
            <TableHead className={cn("w-[100px]", compact ? "text-right" : "")}></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((transaction) => {
            const category = getCategory(transaction.categoryId);
            const account = getAccount(transaction.accountId);
            const isExpense = transaction.type === "expense";

            return (
              <TableRow
                key={transaction.id}
                className="border-b-2 border-border last:border-0 hover:bg-white group relative"
              >
                <TableCell className="font-medium">
                  {format(new Date(transaction.date), "MMM d, yyyy")}
                </TableCell>
                <TableCell>{transaction.description}</TableCell>
                <TableCell>
                  {category && (
                    <Badge
                      variant="outline"
                      className="bg-white whitespace-nowrap"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.name}
                    </Badge>
                  )}
                </TableCell>
                {!compact && <TableCell>{account?.name}</TableCell>}
                <TableCell
                  className={cn(
                    "text-right font-bold",
                    isExpense ? "text-chart-4-red" : "text-chart-1-green"
                  )}
                >
                  {isExpense ? "-" : "+"}
                  {formatIDR(Math.abs(transaction.amount))}
                </TableCell>

                {/* Actions Cell */}
                {compact ? (
                  <TableCell className="text-right p-2">
                     <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-main/20"
                          onClick={() =>
                            router.push(`/transactions/${transaction.id}`)
                          }
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                     </div>
                  </TableCell>
                ) : (
                  <TableCell className="p-0 relative">
                    <div className="absolute inset-0 bg-linear-to-l from-white via-white to-transparent flex items-center justify-end gap-1 pr-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-main/20"
                        onClick={() =>
                          router.push(`/transactions/${transaction.id}`)
                        }
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 hover:bg-main/20"
                        onClick={() => onEdit?.(transaction)}
                        title="Edit Transaction"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
