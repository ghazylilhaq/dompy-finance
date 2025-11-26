import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  className?: string;
  iconColor?: string; // Hex or Tailwind class
}

export function StatCard({ title, value, icon: Icon, description, className, iconColor = "bg-main" }: StatCardProps) {
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium font-base">
          {title}
        </CardTitle>
        <div className={cn("p-2 rounded-base border-2 border-border", iconColor)}>
          <Icon className="h-4 w-4 text-main-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-heading">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1 font-base">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
