
"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { History, Loader2, AlertTriangle, User, Calendar, Download, FileText, Check, X, Clock, PieChart } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";

import { getClassesForTeacher, getStudentsForClass, getAttendanceHistory } from "@/lib/actions/teacher-actions";
import type { ClassInfo, Student, AttendanceHistoryData } from "@/lib/types";

export default function AttendanceHistoryPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [isTransitioning, startTransition] = useTransition();

  // Data state
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceHistoryData[]>([]);
  
  // UI State
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });

  // Initial data loading for filters
  useEffect(() => {
    const teacherId = searchParams.get("teacherId");
    if (!teacherId) {
      setPageError("Teacher ID missing. Cannot load data.");
      setIsFetchingData(false);
      setIsLoading(false);
      return;
    }
    setCurrentTeacherId(teacherId);

    async function loadInitialData() {
      setIsFetchingData(true);
      try {
        const teacherClasses = await getClassesForTeacher(teacherId!);
        setClasses(teacherClasses);
        if (teacherClasses.length > 0) {
          setSelectedClassId(teacherClasses[0].id);
        } else {
           setIsLoading(false);
        }
      } catch (error) {
        setPageError("Failed to load your classes.");
         setIsLoading(false);
      } finally {
        setIsFetchingData(false);
      }
    }
    loadInitialData();
  }, [searchParams]);

  // Load students when a class is selected
  useEffect(() => {
    if (selectedClassId) {
      async function loadStudents() {
        try {
          const classStudents = await getStudentsForClass(selectedClassId);
          setStudents(classStudents);
        } catch (error) {
          toast({ title: "Error", description: "Failed to load students for this class.", variant: "destructive" });
        }
      }
      loadStudents();
    }
  }, [selectedClassId, toast]);

  // Fetch attendance data when filters change
  useEffect(() => {
    if (selectedClassId && dateRange.from && dateRange.to) {
      startTransition(async () => {
        setIsLoading(true);
        try {
          const records = await getAttendanceHistory(selectedClassId, format(dateRange.from!, 'yyyy-MM-dd'), format(dateRange.to!, 'yyyy-MM-dd'));
          setAttendanceRecords(records);
           if(records.length === 0) {
            toast({ title: "No Records", description: "No attendance records were found for the selected criteria.", variant: "default" });
           }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
          setPageError(errorMessage);
          setAttendanceRecords([]);
        } finally {
          setIsLoading(false);
        }
      });
    } else if (!isFetchingData && !selectedClassId) {
      setAttendanceRecords([]);
      setIsLoading(false);
    }
  }, [selectedClassId, dateRange, isFetchingData, toast]);

  const filteredData = useMemo(() => {
    if (selectedStudentId === "all") {
      return attendanceRecords;
    }
    return attendanceRecords.filter(r => r.studentId === selectedStudentId);
  }, [attendanceRecords, selectedStudentId]);

  const studentSummary = useMemo(() => {
    if (selectedStudentId === "all" || filteredData.length === 0) return null;

    const summary = { present: 0, absent: 0, late: 0 };
    filteredData.forEach(record => {
      summary[record.status]++;
    });
    return summary;
  }, [filteredData, selectedStudentId]);

  const handleDownloadPDF = () => {
    if (filteredData.length === 0) {
      toast({ title: "No Data", description: "No attendance data to download for the current selection.", variant: "destructive" });
      return;
    }
    const doc = new jsPDF();
    const selectedClass = classes.find(c => c.id === selectedClassId);
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    const title = selectedStudent 
      ? `Attendance Report for ${selectedStudent.firstName} ${selectedStudent.lastName}`
      : `Class Attendance Report for ${selectedClass?.name}`;
    
    const subtitle = `Period: ${format(dateRange.from!, 'PPP')} to ${format(dateRange.to!, 'PPP')}`;

    doc.setFontSize(18);
    doc.text(title, 14, 22);
    doc.setFontSize(12);
    doc.text(subtitle, 14, 30);
    
    let finalY = 30;

    if (studentSummary && selectedStudent) {
      doc.setFontSize(14);
      doc.text("Attendance Summary", 14, 45);
      autoTable(doc, {
        startY: 50,
        body: [
          ['Days Present', studentSummary.present],
          ['Days Absent', studentSummary.absent],
          ['Days Late', studentSummary.late],
          ['Total Days Recorded', studentSummary.present + studentSummary.absent + studentSummary.late],
        ],
        theme: 'plain'
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    doc.setFontSize(14);
    doc.text("Detailed Log", 14, finalY);

    autoTable(doc, {
      startY: finalY + 5,
      head: [selectedStudent ? ['Date', 'Status'] : ['Date', 'Student Name', 'Status']],
      body: filteredData.map(r => (
        selectedStudent ? [r.date, r.status] : [r.date, r.studentName, r.status]
      )),
      theme: 'grid',
      columnStyles: {
        1: { cellWidth: selectedStudent ? 'auto' : 80 }, // Apply width only to 'Student Name' column when it exists
      },
    });
    
    const fileName = selectedStudent
      ? `attendance_${selectedStudent.studentIdNumber}.pdf`
      : `attendance_${selectedClass?.name.replace(/ /g, '_')}.pdf`;

    doc.save(fileName);
  };


  if (isFetchingData) {
    return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /><p className="ml-2">Loading initial data...</p></div>
  }

  if (pageError && !isLoading) {
    return <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{pageError}</AlertDescription></Alert>
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance History" description="Review and export student attendance records." icon={History} />

      <Card>
        <CardHeader>
          <CardTitle>Filter Records</CardTitle>
          <CardDescription>Select a class, student, and date range to view history.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classes.length === 0 || isLoading || isTransitioning}>
            <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={selectedStudentId} onValueChange={setSelectedStudentId} disabled={!selectedClassId || isLoading || isTransitioning}>
            <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              {students.map(s => <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>)}
            </SelectContent>
          </Select>
          <DatePicker date={dateRange.from} setDate={(date) => setDateRange(prev => ({...prev, from: date}))} placeholder="Start date" disabled={isLoading || isTransitioning}/>
           <DatePicker date={dateRange.to} setDate={(date) => setDateRange(prev => ({...prev, to: date}))} placeholder="End date" disabled={isLoading || isTransitioning}/>
        </CardContent>
      </Card>
      
      {(isLoading || isTransitioning) && <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /><p className="ml-2">Loading records...</p></div>}
      
      {!isLoading && !isTransitioning && (
        <>
          {studentSummary && (
            <Card>
              <CardHeader className="flex flex-row justify-between items-center">
                <div >
                    <CardTitle className="flex items-center gap-2"><PieChart/> Summary for {students.find(s=>s.id === selectedStudentId)?.firstName}</CardTitle>
                    <CardDescription>Total days recorded in selected period: {studentSummary.present + studentSummary.absent + studentSummary.late}</CardDescription>
                </div>
                 <Button onClick={handleDownloadPDF} disabled={isTransitioning || filteredData.length === 0}><Download className="mr-2"/> Download PDF</Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatCard title="Present" value={studentSummary.present} icon={Check} description="Days marked as present."/>
                  <StatCard title="Absent" value={studentSummary.absent} icon={X} description="Days marked as absent."/>
                  <StatCard title="Late" value={studentSummary.late} icon={Clock} description="Days marked as late."/>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle>Attendance Log</CardTitle>
               {selectedStudentId === "all" && <Button onClick={handleDownloadPDF} disabled={isTransitioning || filteredData.length === 0}><Download className="mr-2"/> Download PDF</Button>}
            </CardHeader>
            <CardContent>
              {filteredData.length > 0 ? (
                <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead><Calendar className="inline-block mr-1"/> Date</TableHead>
                      {selectedStudentId === "all" && <TableHead><User className="inline-block mr-1"/> Student</TableHead>}
                      <TableHead><FileText className="inline-block mr-1"/> Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((record, index) => (
                      <TableRow key={`${record.studentId}-${record.date}-${index}`}>
                        <TableCell>{record.date}</TableCell>
                        {selectedStudentId === "all" && <TableCell>{record.studentName}</TableCell>}
                        <TableCell>{record.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No attendance records found for the selected criteria.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}

    </div>
  );
}
