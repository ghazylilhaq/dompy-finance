import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader 
        title="Settings" 
        description="Configure your preferences"
      />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Customize the look and feel of the application.
            </p>
            <Button variant="neutral">Toggle Dark Mode</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Export or clear your data.
            </p>
            <div className="flex gap-2">
              <Button variant="neutral">Export JSON</Button>
              <Button variant="default" className="bg-red-400 hover:bg-red-500">Reset Data</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
