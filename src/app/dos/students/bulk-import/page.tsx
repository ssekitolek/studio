
"use client";

import * as React from "react";
import { useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileUp, Download, Loader2, ListChecks, FileCheck2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getClasses, bulkImportStudents } from "@/lib/actions/dos-actions";
import type { ClassInfo } from "@/lib/types";

interface ImportResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export default function BulkImportPage() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [targetClassId, setTargetClassId] = useState<string>("");
  const [isProcessing, startTransition] = useTransition();
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = useState(true);

  React.useEffect(() => {
    async function fetchClassesData() {
      setIsLoadingClasses(true);
      try {
        const classesData = await getClasses();
        setClasses(classesData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load classes.", variant: "destructive" });
      } finally {
        setIsLoadingClasses(false);
      }
    }
    fetchClassesData();
  }, [toast]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      const allowedTypes = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
        "text/csv", // .csv
      ];
      if (allowedTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setImportResult(null); // Reset previous results
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload a .xlsx or .csv file.",
          variant: "destructive",
        });
        event.target.value = ""; // Clear the input
      }
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "studentIdNumber,firstName,lastName\nS1001,John,Doe\nS1002,Jane,Smith";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "student_import_template.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast({ title: "No File Selected", description: "Please select a file to import.", variant: "destructive" });
      return;
    }
    if (!targetClassId) {
      toast({ title: "No Class Selected", description: "Please select a class for the students.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: ["studentIdNumber", "firstName", "lastName"],
            skipHeader: true,
          }) as Array<{ studentIdNumber: string; firstName: string; lastName: string; }>;
          
          if (jsonData.length === 0) {
            toast({ title: "Empty File", description: "The uploaded file contains no student data.", variant: "destructive"});
            return;
          }

          const result = await bulkImportStudents(jsonData, targetClassId);
          setImportResult(result);
          toast({ title: "Processing Complete", description: "The student import has finished."});
        } catch (error) {
          toast({ title: "Error Processing File", description: "Could not read or process the file.", variant: "destructive"});
        }
      };
      reader.onerror = () => {
        toast({ title: "Error Reading File", description: "There was an error reading the file.", variant: "destructive"});
      };
      reader.readAsArrayBuffer(file);
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Student Import"
        description="Import multiple students into a class from a CSV or Excel file."
        icon={FileUp}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Import Process</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h3 className="font-semibold">Step 1: Download Template</h3>
            <p className="text-sm text-muted-foreground">Download the CSV template file. It contains the required columns: `studentIdNumber`, `firstName`, and `lastName`.</p>
            <Button variant="outline" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" /> Download Template
            </Button>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Step 2: Select Target Class</h3>
            <p className="text-sm text-muted-foreground">Choose the class where the new students will be enrolled.</p>
            <Select value={targetClassId} onValueChange={setTargetClassId} disabled={isLoadingClasses}>
              <SelectTrigger className="w-full md:w-1/2">
                <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select a class"} />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold">Step 3: Upload and Process</h3>
            <p className="text-sm text-muted-foreground">Upload your completed .csv or .xlsx file.</p>
            <Input type="file" onChange={handleFileChange} accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="w-full md:w-1/2" />
          </div>

          <div>
            <Button onClick={handleSubmit} disabled={isProcessing || !file || !targetClassId}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ListChecks className="mr-2 h-4 w-4" />}
              Process Student File
            </Button>
          </div>
        </CardContent>
      </Card>

      {importResult && (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Import Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Alert variant={importResult.successCount > 0 ? "default" : "destructive"} className="border-green-500 bg-green-500/10">
                <FileCheck2 className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-700">Successfully Imported</AlertTitle>
                <AlertDescription className="text-green-600 text-2xl font-bold">{importResult.successCount} students</AlertDescription>
              </Alert>
              <Alert variant={importResult.errorCount > 0 ? "destructive" : "default"}>
                <AlertCircle className="h-5 w-5 text-destructive" />
                <AlertTitle>Failed Imports</AlertTitle>
                <AlertDescription className="text-2xl font-bold">{importResult.errorCount} students</AlertDescription>
              </Alert>
            </div>

            {importResult.errors.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Error Details:</h3>
                <div className="max-h-60 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Row</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importResult.errors.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell>{error}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
