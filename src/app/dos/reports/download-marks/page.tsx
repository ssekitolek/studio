
"use client";

import { useState, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { downloadAllMarks } from "@/lib/actions/dos-actions";

export default function DownloadMarksPage() {
  const { toast } = useToast();
  const [isDownloading, startTransition] = useTransition();
  const [selectedFormat, setSelectedFormat] = useState<"csv" | "xlsx" | "pdf">("csv");
  // Add more state for filters if needed, e.g., term, class, exam

  const handleDownload = async () => {
    startTransition(async () => {
      try {
        const result = await downloadAllMarks(selectedFormat); 
        
        if (result.success && result.data) {
          let blobType: string;
          let fileName: string;

          switch (selectedFormat) {
            case "xlsx":
              blobType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
              fileName = "all_marks.xlsx";
              break;
            case "pdf":
              blobType = "application/pdf"; // Or "text/plain" if it's just text
              fileName = "all_marks.pdf";
              break;
            case "csv":
            default:
              blobType = "text/csv;charset=utf-8;";
              fileName = "all_marks.csv";
              break;
          }

          const blob = new Blob([result.data], { type: blobType });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          link.setAttribute("download", fileName);
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
          <CardDescription>Select format for your report. Filters will be added in the future.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add filter selection here - e.g., Term, Class, Exam (Future implementation) */}
          
          <Select value={selectedFormat} onValueChange={(value: "csv" | "xlsx" | "pdf") => setSelectedFormat(value)}>
            <SelectTrigger className="w-full md:w-1/3">
              <SelectValue placeholder="Select Format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV (Comma Separated Values)</SelectItem>
              <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
              <SelectItem value="pdf">PDF (Basic Text)</SelectItem>
            </SelectContent>
          </Select>
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
