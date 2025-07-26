
"use client";

import { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardCheck, Loader2, Search, AlertTriangle, UserCheck, UserX, Clock } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";

import { getClasses, getAttendanceSummaryForDOS } from "@/lib/actions/dos-actions";
import type { ClassInfo, DOSAttendanceSummary } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function DOSAttendanceSummaryPage() {
  const { toast } = useToast();
  const [isTransitioning, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  // Data state
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<DOSAttendanceSummary | null>(null);

  // Filter state
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedGender, setSelectedGender] = useState<'all' | 'Male' | 'Female'>('all');


  // Initial data loading for filters
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const teacherClasses = await getClasses();
        setClasses(teacherClasses);
        if (teacherClasses.length > 0) {
          setSelectedClassId(teacherClasses[0].id);
        }
      } catch (error) {
        toast({ title: "Error", description: "Failed to load classes.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, [toast]);

  const handleFetchSummary = () => {
    if (!selectedClassId || !selectedDate) {
      toast({ title: "Selection Missing", description: "Please select a class and a date.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      setIsLoading(true);
      setAttendanceSummary(null);
      try {
        const genderToFetch = selectedGender === 'all' ? undefined : selectedGender;
        const result = await getAttendanceSummaryForDOS(selectedClassId, format(selectedDate, "yyyy-MM-dd"), genderToFetch);
        if (result.success && result.data) {
          setAttendanceSummary(result.data);
          if (result.data.totalStudents === 0) {
            toast({ title: "No Students", description: "No students match the selected class and gender.", variant: "default" });
          } else if (result.data.totalRecords === 0) {
            toast({ title: "No Record Found", description: "Attendance has not been recorded for this class on the selected date.", variant: "default" });
          }
        } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({ title: "Fetch Failed", description: errorMessage, variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Summary" description="Review daily attendance records submitted by class teachers." icon={ClipboardCheck} />

      <Card>
        <CardHeader>
          <CardTitle>Filter Records</CardTitle>
          <CardDescription>Select a class, date, and gender to view the attendance summary.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={classes.length === 0 || isLoading}>
            <SelectTrigger><SelectValue placeholder="Select a class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
          </Select>
          <DatePicker date={selectedDate} setDate={setSelectedDate} placeholder="Select date" disabled={isLoading} />
           <Select value={selectedGender} onValueChange={(value: 'all' | 'Male' | 'Female') => setSelectedGender(value)} disabled={isLoading}>
            <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
            <SelectContent>
                <SelectItem value="all">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleFetchSummary} disabled={isTransitioning || isLoading || !selectedClassId || !selectedDate}>
            {isTransitioning ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
            Get Summary
          </Button>
        </CardContent>
      </Card>
      
      {(isTransitioning || isLoading) && <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /><p className="ml-2">Loading summary...</p></div>}
      
      {!isTransitioning && !isLoading && attendanceSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary for {classes.find(c=>c.id === selectedClassId)?.name} on {format(selectedDate!, "PPP")}</CardTitle>
            <CardDescription>
                Record submitted by: {attendanceSummary.teacherName || 'Unknown Teacher'}.
                Last updated: {attendanceSummary.lastUpdatedAt ? format(new Date(attendanceSummary.lastUpdatedAt), "Pp") : 'N/A'}.
                Total Students in Filter: {attendanceSummary.totalStudents}.
            </CardDescription>
          </CardHeader>
          <CardContent>
             {attendanceSummary.totalRecords > 0 ? (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <StatCard title="Present" value={attendanceSummary.present} icon={UserCheck} description={`${attendanceSummary.present} of ${attendanceSummary.totalStudents} students.`}/>
                        <StatCard title="Absent" value={attendanceSummary.absent} icon={UserX} description={`${attendanceSummary.absent} of ${attendanceSummary.totalStudents} students.`}/>
                        <StatCard title="Late" value={attendanceSummary.late} icon={Clock} description={`${attendanceSummary.late} of ${attendanceSummary.totalStudents} students.`}/>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader><CardTitle className="text-lg text-green-600">Present & Late Students</CardTitle></CardHeader>
                            <CardContent className="max-h-60 overflow-y-auto">
                              {attendanceSummary.presentDetails.length > 0 || attendanceSummary.lateDetails.length > 0 ? (
                                <ul className="space-y-2">
                                  {attendanceSummary.presentDetails.map(student => <li key={student.id} className="text-sm">{student.name}</li>)}
                                  {attendanceSummary.lateDetails.map(student => <li key={student.id} className="text-sm">{student.name} <span className="text-xs text-orange-500">(Late)</span></li>)}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground">No students marked present or late.</p>}
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg text-red-600">Absent Students</CardTitle></CardHeader>
                            <CardContent className="max-h-60 overflow-y-auto">
                              {attendanceSummary.absentDetails.length > 0 ? (
                                <ul className="space-y-2">
                                  {attendanceSummary.absentDetails.map(student => <li key={student.id} className="text-sm">{student.name}</li>)}
                                </ul>
                              ) : <p className="text-sm text-muted-foreground">No students marked absent today. Great!</p>}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            ) : (
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>No Record</AlertTitle>
                    <AlertDescription>
                        Attendance has not been recorded for this class on the selected date.
                    </AlertDescription>
                </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
