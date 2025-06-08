
"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input"; // Added missing import
import { ShieldAlert, Loader2, CheckCircle, Search, FileWarning } from "lucide-react";
import { getClasses, getSubjects, getExams, getStudents, getGeneralSettings } from "@/lib/actions/dos-actions"; // Assuming these exist
import { gradeAnomalyDetection, type GradeAnomalyDetectionInput, type GradeAnomalyDetectionOutput } from "@/ai/flows/grade-anomaly-detection";
import type { ClassInfo, Subject as SubjectType, Exam, Student, AnomalyExplanation, GradeEntry } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Dummy marks data - in a real app, this would be fetched based on selections
const dummyMarksData: Array<GradeEntry & { studentName: string }> = [
  { studentId: "S1001", grade: 85, studentName: "Alice Wonderland" },
  { studentId: "S1002", grade: 85, studentName: "Bob The Builder" },
  { studentId: "S1003", grade: 85, studentName: "Charlie Brown" },
  { studentId: "S1004", grade: 60, studentName: "Diana Prince" },
  { studentId: "S1005", grade: 92, studentName: "Edward Scissorhands" },
];

export default function MarksReviewPage() {
  const { toast } = useToast();
  const [isProcessing, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedExam, setSelectedExam] = useState<string>("");
  
  const [marks, setMarks] = useState<Array<GradeEntry & { studentName: string }>>([]);
  const [anomalies, setAnomalies] = useState<AnomalyExplanation[]>([]);
  const [historicalAverage, setHistoricalAverage] = useState<number | undefined>(undefined); // Example

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
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
        setIsLoading(false);
      }
    }
    fetchData();
  }, [toast]);

  const handleFetchMarks = async () => {
    if (!selectedClass || !selectedSubject || !selectedExam) {
      toast({ title: "Selection Missing", description: "Please select class, subject, and exam.", variant: "destructive" });
      return;
    }
    // In a real app, fetch marks for the selected criteria
    // For now, use dummy data
    console.log(`Fetching marks for Class: ${selectedClass}, Subject: ${selectedSubject}, Exam: ${selectedExam}`);
    setMarks(dummyMarksData); 
    setAnomalies([]); // Clear previous anomalies
  };

  const handleAnomalyCheck = async () => {
    if (marks.length === 0) {
      toast({ title: "No Marks", description: "No marks loaded to check for anomalies.", variant: "destructive" });
      return;
    }

    const currentSubject = subjects.find(s => s.id === selectedSubject);
    const currentExam = exams.find(e => e.id === selectedExam);

    if (!currentSubject || !currentExam) {
        toast({ title: "Error", description: "Could not find subject or exam details.", variant: "destructive" });
        return;
    }

    const gradeEntries: GradeEntry[] = marks.map(m => ({ studentId: m.studentId, grade: m.grade }));

    const anomalyInput: GradeAnomalyDetectionInput = {
      subject: currentSubject.name,
      exam: currentExam.name,
      grades: gradeEntries,
      historicalAverage: historicalAverage, 
    };

    startTransition(async () => {
      try {
        const result = await gradeAnomalyDetection(anomalyInput);
        if (result.hasAnomalies) {
          setAnomalies(result.anomalies);
          toast({ title: "Anomalies Detected", description: "Potential issues found in the marks.", variant: "default", action: <FileWarning className="text-yellow-500"/> });
        } else {
          setAnomalies([]);
          toast({ title: "No Anomalies Found", description: "The marks appear consistent.", variant: "default", action: <CheckCircle className="text-green-500"/> });
        }
      } catch (error) {
        console.error("Anomaly detection error:", error);
        toast({ title: "Error", description: "Failed to perform anomaly detection.", variant: "destructive" });
      }
    });
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title="Marks Review & Anomaly Detection"
        description="Review submitted marks and use AI to detect potential anomalies."
        icon={ShieldAlert}
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Selection Criteria</CardTitle>
          <CardDescription>Select class, subject, and exam to review marks.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select value={selectedClass} onValueChange={setSelectedClass} disabled={isLoading}>
            <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedSubject} onValueChange={setSelectedSubject} disabled={isLoading}>
            <SelectTrigger><SelectValue placeholder="Select Subject" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedExam} onValueChange={setSelectedExam} disabled={isLoading}>
            <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
            <SelectContent>{exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
          </Select>
        </CardContent>
        <CardContent className="flex justify-end gap-2">
            <Input 
                type="number" 
                placeholder="Optional: Historical Avg." 
                className="max-w-xs"
                value={historicalAverage === undefined ? '' : historicalAverage}
                onChange={(e) => setHistoricalAverage(e.target.value ? parseFloat(e.target.value) : undefined)}
            />
            <Button onClick={handleFetchMarks} disabled={isLoading || isProcessing || !selectedClass || !selectedSubject || !selectedExam}>
                <Search className="mr-2 h-4 w-4" /> Load Marks
            </Button>
        </CardContent>
      </Card>

      {marks.length > 0 && (
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="font-headline text-xl text-primary">Marks Overview</CardTitle>
              <CardDescription>Marks for the selected criteria.</CardDescription>
            </div>
            <Button onClick={handleAnomalyCheck} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
              Check for Anomalies
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marks.map((mark, index) => (
                  <TableRow key={index}>
                    <TableCell>{mark.studentId}</TableCell>
                    <TableCell>{mark.studentName}</TableCell>
                    <TableCell className="text-right">{mark.grade}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {anomalies.length > 0 && (
        <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
            <FileWarning className="h-5 w-5 text-yellow-600" />
            <AlertTitle className="font-headline text-yellow-700">Anomaly Detection Results</AlertTitle>
            <AlertDescription className="text-yellow-600">
            The following potential issues were found:
            <ul className="list-disc pl-5 mt-2 space-y-1">
              {anomalies.map((anomaly, index) => (
                <li key={index}>
                  <strong>Student {anomaly.studentId}:</strong> {anomaly.explanation}
                </li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      {isProcessing && anomalies.length === 0 && ( // Show loading for anomaly check only if no results yet
         <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Checking for anomalies...</p>
          </div>
      )}
    </div>
  );
}

    