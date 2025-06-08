
"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Download, Loader2, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadAllMarks } from "@/lib/actions/dos-actions"; // Assuming this action exists

export default function DownloadMarksPage() {
  const { toast } = useToast();
  const [isDownloading, startTransition] = useTransition();
  const [selectedFormat, setSelectedFormat] = useState<string>("csv");
  // Add more state for filters if needed, e.g., term, class, exam

  const handleDownload = async () => {
    startTransition(async () => {
      try {
        // In a real app, you might pass filters to downloadAllMarks
        const result = await downloadAllMarks(); 
        if (result.success && result.data) {
          // Trigger browser download
          const blob = new Blob([result.data], { type: `text/${selectedFormat};charset=utf-8;` });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.setAttribute("download", `all_marks.${selectedFormat}`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: "Download Started", description: result.message });
        } else {
          toast({ title: "Download Failed", description: result.message, variant: "destructive" });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({ title: "Error", description: `An unexpected error occurred during download: ${errorMessage}`, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Download Reports"
        description="Generate and download marks reports in various formats."
        icon={Download}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Report Configuration</CardTitle>
          <CardDescription>Select filters and format for your report.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add filter selection here - e.g., Term, Class, Exam */}
          {/* 
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select>
              <SelectTrigger><SelectValue placeholder="Select Term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="term1">Term 1 2024</SelectItem>
              </SelectContent>
            </Select>
             <Select>
              <SelectTrigger><SelectValue placeholder="Select Class (Optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="class1">Form 1A</SelectItem>
              </SelectContent>
            </Select>
             <Select>
              <SelectTrigger><SelectValue placeholder="Select Exam (Optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="exam1">Midterm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          */}
          
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger className="w-full md:w-1/3">
              <SelectValue placeholder="Select Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
              <SelectItem value="xlsx" disabled>Excel (XLSX) - Coming Soon</SelectItem>
              <SelectItem value="pdf" disabled>PDF - Coming Soon</SelectItem>
            </SelectContent>
          </Select>

          <Alert variant="default" className="bg-accent/10 border-accent/30">
            <AlertTriangle className="h-4 w-4 text-accent-foreground/80" />
            <AlertTitle className="text-accent-foreground/90">Note</AlertTitle>
            <AlertDescription className="text-accent-foreground/80">
              For now, only CSV download of all marks is supported. More filters and formats are coming soon.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardContent className="flex justify-end">
          <Button onClick={handleDownload} disabled={isDownloading} size="lg">
            {isDownloading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download Report
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

