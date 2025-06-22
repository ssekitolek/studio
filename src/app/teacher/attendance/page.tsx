
"use client";

import { useState, useEffect, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { format } from "date-fns";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ClipboardCheck, Loader2, AlertTriangle, Check, UserCheck, History } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";

import { getClassesForTeacher, getStudentsForClass, saveAttendance } from "@/lib/actions/teacher-actions";
import type { ClassInfo, Student, StudentAttendanceInput } from "@/lib/types";

const studentAttendanceSchema = z.object({
  studentId: z.string(),
  status: z.enum(["present", "absent", "late"]),
});

const attendanceFormSchema = z.object({
  classId: z.string().min(1, "Please select a class."),
  date: z.date({ required_error: "Please select a date." }),
  students: z.array(studentAttendanceSchema),
});

type AttendanceFormValues = z.infer<typeof attendanceFormSchema>;

export default function TakeAttendancePage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(attendanceFormSchema),
    defaultValues: {
      classId: "",
      date: new Date(),
      students: [],
    },
  });

  const { control, watch, setValue } = form;
  const selectedClassId = watch("classId");

  useEffect(() => {
    const teacherIdFromUrl = searchParams.get("teacherId");
    if (!teacherIdFromUrl) {
      setPageError("Teacher ID missing from URL. Please login again.");
      setIsLoading(false);
      return;
    }
    setCurrentTeacherId(teacherIdFromUrl);

    async function fetchClasses() {
      try {
        const teacherClasses = await getClassesForTeacher(teacherIdFromUrl);
        setClasses(teacherClasses);
        if (teacherClasses.length === 0) {
          setPageError("You are not assigned as a Class Teacher for any class.");
        }
      } catch (error) {
        setPageError("Failed to load your assigned classes.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchClasses();
  }, [searchParams]);

  useEffect(() => {
    async function fetchStudents() {
      if (selectedClassId) {
        setIsLoading(true);
        try {
          const classStudents = await getStudentsForClass(selectedClassId);
          setStudents(classStudents);
          setValue(
            "students",
            classStudents.map((s) => ({ studentId: s.id, status: "present" }))
          );
        } catch (error) {
          toast({ title: "Error", description: "Failed to load students for this class.", variant: "destructive" });
        } finally {
          setIsLoading(false);
        }
      } else {
        setStudents([]);
        setValue("students", []);
      }
    }
    fetchStudents();
  }, [selectedClassId, setValue, toast]);
  
  const setAllStudentsStatus = (status: "present" | "absent" | "late") => {
    const currentStudentValues = form.getValues('students');
    const updatedStudents = currentStudentValues.map(student => ({...student, status}));
    setValue("students", updatedStudents, { shouldDirty: true });
  }

  const attendanceHistoryLink = currentTeacherId 
    ? `/teacher/attendance/history?teacherId=${encodeURIComponent(currentTeacherId)}&teacherName=${encodeURIComponent(searchParams.get("teacherName") || "Teacher")}`
    : "#";

  const onSubmit = (data: AttendanceFormValues) => {
    if (!currentTeacherId) {
      toast({ title: "Error", description: "Teacher ID not found.", variant: "destructive" });
      return;
    }

    startTransition(async () => {
      const result = await saveAttendance({
        teacherId: currentTeacherId,
        classId: data.classId,
        date: data.date.toISOString().split('T')[0], // YYYY-MM-DD
        records: data.students,
      });

      if (result.success) {
        toast({
            title: "Attendance Recorded",
            description: `Attendance for ${format(data.date, "PPP")} has been saved.`,
            action: (
              <ToastAction altText="View History" asChild>
                <Link href={attendanceHistoryLink}>View History</Link>
              </ToastAction>
            ),
        });
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  if (pageError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Take Attendance" description="Record daily student attendance." icon={ClipboardCheck} />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{pageError}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Take Attendance" 
        description="Record daily student attendance for your classes." 
        icon={ClipboardCheck} 
        actionButton={
            <Button variant="outline" asChild disabled={!currentTeacherId}>
                <Link href={attendanceHistoryLink}>
                    <History className="mr-2 h-4 w-4" /> View History
                </Link>
            </Button>
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Class and Date</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={control}
                name="classId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoading ? "Loading classes..." : "Select a class"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Date</FormLabel>
                    <DatePicker date={field.value} setDate={field.onChange} />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {selectedClassId && (
            <Card>
              <CardHeader>
                <CardTitle>Student List</CardTitle>
                <CardDescription>Mark attendance for each student. Defaults to 'Present'.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : students.length > 0 ? (
                  <>
                    <div className="flex gap-2 mb-4">
                       <Button type="button" variant="outline" size="sm" onClick={() => setAllStudentsStatus('present')}>Mark All Present</Button>
                       <Button type="button" variant="outline" size="sm" onClick={() => setAllStudentsStatus('absent')}>Mark All Absent</Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student Name</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {form.getValues('students').map((student, index) => (
                          <TableRow key={student.studentId}>
                            <TableCell className="font-medium">
                              {students.find(s => s.id === student.studentId)?.firstName} {students.find(s => s.id === student.studentId)?.lastName}
                            </TableCell>
                            <TableCell>
                              <FormField
                                control={control}
                                name={`students.${index}.status`}
                                render={({ field }) => (
                                  <FormControl>
                                    <RadioGroup
                                      onValueChange={field.onChange}
                                      value={field.value}
                                      className="flex justify-center space-x-4"
                                    >
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl><RadioGroupItem value="present" id={`present-${student.studentId}`} /></FormControl>
                                        <FormLabel htmlFor={`present-${student.studentId}`} className="font-normal cursor-pointer">Present</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl><RadioGroupItem value="absent" id={`absent-${student.studentId}`} /></FormControl>
                                        <FormLabel htmlFor={`absent-${student.studentId}`} className="font-normal cursor-pointer">Absent</FormLabel>
                                      </FormItem>
                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                        <FormControl><RadioGroupItem value="late" id={`late-${student.studentId}`} /></FormControl>
                                        <FormLabel htmlFor={`late-${student.studentId}`} className="font-normal cursor-pointer">Late</FormLabel>
                                      </FormItem>
                                    </RadioGroup>
                                  </FormControl>
                                )}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    </div>
                    <div className="flex justify-end mt-6">
                      <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 animate-spin" /> : <UserCheck className="mr-2"/>}
                        Submit Attendance
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="text-center text-muted-foreground py-8">No students found in this class.</p>
                )}
              </CardContent>
            </Card>
          )}
        </form>
      </Form>
    </div>
  );
}
