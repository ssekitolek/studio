
"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3, Loader2, Search, Info, Download, AlertTriangle, ChevronsDown, ChevronsUp } from "lucide-react";
import { getClasses, getSubjects, getExams, getAssessmentAnalysisData, downloadAnalysisReport } from "@/lib/actions/dos-actions";
import type { ClassInfo, Subject as SubjectType, Exam, AssessmentAnalysisData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";

export default function DataAnalysisPage() {
  const { toast } = useToast();
  const [isLoadingInitialData, setIsLoadingInitialData] = useState(true);
  const [isLoadingAnalysis, startAnalysisTransition] = useTransition();
  const [isDownloading, startDownloadTransition] = useTransition();

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedExam, setSelectedExam] = useState("");

  const [analysisData, setAnalysisData] = useState<AssessmentAnalysisData | null>(null);

  useEffect(() => {
    async function fetchData() {
      setIsLoadingInitialData(true);
      try {
        const [classesData, subjectsData, examsData] = await Promise.all([
          getClasses(),
          getSubjects(),
          getExams(),
        ]);
        setClasses(classesData);
        setSubjects(subjectsData);
        setExams(examsData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load initial data.", variant: "destructive" });
      } finally {
        setIsLoadingInitialData(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleFetchAnalysis = () => {
    if (!selectedClass || !selectedSubject || !selectedExam) {
      toast({ title: "Selection Missing", description: "Please select class, subject, and exam.", variant: "destructive" });
      return;
    }
    setAnalysisData(null);
    startAnalysisTransition(async () => {
      const result = await getAssessmentAnalysisData(selectedClass, selectedSubject, selectedExam);
      if (result.success && result.data) {
        setAnalysisData(result.data);
      } else {
        toast({ title: "Analysis Failed", description: result.message, variant: "destructive" });
        setAnalysisData(null);
      }
    });
  };

  const handleDownload = () => {
    if (!selectedClass || !selectedSubject || !selectedExam || !analysisData) {
        toast({ title: "Error", description: "No analysis data loaded to download.", variant: "destructive" });
        return;
    }
    startDownloadTransition(async () => {
      try {
        const result = await downloadAnalysisReport(selectedClass, selectedSubject, selectedExam);
        if (result.success && result.data) {
          const blob = new Blob([result.data], { type: 'application/pdf' });
          const link = document.createElement("a");
          link.href = URL.createObjectURL(blob);
          const assessmentNameSlug = (analysisData.assessmentName || "analysis").replace(/[^a-zA-Z0-9_]/g, '_');
          link.setAttribute("download", `${assessmentNameSlug}_analysis_report.pdf`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast({ title: "Download Started", description: result.message });
        } else {
          toast({ title: "Download Failed", description: result.message, variant: "destructive" });
        }
      } catch (error) {
         toast({ title: "Error", description: `Download failed: ${error instanceof Error ? error.message : String(error)}`, variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Data Analysis"
        description="Select an assessment to view and analyze submitted marks."
        icon={BarChart3}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Selection Criteria</CardTitle>
          <CardDescription>Select the specific class, subject, and exam to analyze.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Class"} /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Subject"} /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedExam} onValueChange={setSelectedExam} disabled={isLoadingInitialData}>
            <SelectTrigger><SelectValue placeholder={isLoadingInitialData ? "Loading..." : "Select Exam"} /></SelectTrigger>
            <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
        <CardContent className="flex justify-end">
            <Button
              onClick={handleFetchAnalysis}
              disabled={isLoadingInitialData || isLoadingAnalysis || !selectedClass || !selectedSubject || !selectedExam}
            >
                {isLoadingAnalysis ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Load Analysis
            </Button>
        </CardContent>
      </Card>
      
      {isLoadingAnalysis && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Analyzing marks...</p>
        </div>
      )}

      {analysisData && (
        <div className="space-y-6">
          <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-xl text-primary">Analysis for: {analysisData.assessmentName}</CardTitle>
                <CardDescription>Found {analysisData.marks.length} mark(s) for this assessment.</CardDescription>
              </div>
               <Button onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download Analysis PDF
              </Button>
            </CardHeader>
          </Card>

          <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg text-primary">Summary Statistics</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Mean</p>
                <p className="text-2xl font-bold text-primary">{analysisData.summary.mean.toFixed(2)}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Median</p>
                <p className="text-2xl font-bold text-primary">{analysisData.summary.median.toFixed(2)}</p>
              </div>
               <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Highest Score</p>
                <p className="text-2xl font-bold text-green-600">{analysisData.summary.highest}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Lowest Score</p>
                <p className="text-2xl font-bold text-red-600">{analysisData.summary.lowest}</p>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Std. Deviation</p>
                <p className="text-2xl font-bold text-primary">{analysisData.summary.stdDev.toFixed(2)}</p>
              </div>
               <div className="p-3 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="text-xl font-bold text-primary truncate">{analysisData.summary.mode.join(', ')}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="font-headline text-lg text-primary">Grade Distribution</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <BarChart data={analysisData.gradeDistribution} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="grade" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card className="shadow-md">
              <CardHeader><CardTitle className="font-headline text-lg text-primary">Score Frequency</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <BarChart data={analysisData.scoreFrequency} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="range" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis allowDecimals={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-accent)" radius={4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

           <Card className="shadow-md">
            <CardHeader><CardTitle className="font-headline text-lg text-primary">Full Marks List (Ranked)</CardTitle></CardHeader>
            <CardContent>
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead className="text-center">Rank</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {analysisData.marks.map((mark, index) => (
                    <TableRow key={`${mark.studentId}-${index}`}>
                        <TableCell className="text-center font-bold">{mark.rank}</TableCell>
                        <TableCell>{mark.studentId}</TableCell>
                        <TableCell>{mark.studentName}</TableCell>
                        <TableCell className="text-right font-medium">{mark.score}</TableCell>
                        <TableCell className="text-center font-semibold">{mark.grade}</TableCell>
                    </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
