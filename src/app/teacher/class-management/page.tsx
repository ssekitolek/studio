
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ClipboardList, Info, AlertTriangle, Hash, User, BarChart3, Users, CalendarCheck, UserCheck, UserX } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { getClassTeacherManagementData } from "@/lib/actions/teacher-actions";
import type { ClassTeacherData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { StatCard } from "@/components/shared/StatCard";
import { Progress } from "@/components/ui/progress";


export default function ClassManagementPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [managementData, setManagementData] = useState<ClassTeacherData[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const teacherIdFromUrl = searchParams?.get("teacherId");

    if (!teacherIdFromUrl) {
      const msg = "Teacher ID missing from URL. Please login again to view your classes.";
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
      setPageError(msg);
      setIsLoading(false);
      return;
    }

    setPageError(null);
    setIsLoading(true);

    async function fetchData(validTeacherId: string) {
      try {
        const data = await getClassTeacherManagementData(validTeacherId);
        setManagementData(data);
        if (data.length === 0) {
          toast({
            title: "No Classes Found",
            description: "You are not assigned as a Class Teacher for any class.",
            variant: "default",
            action: <Info className="text-blue-500" />
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        toast({ title: "Error Loading Data", description: errorMessage, variant: "destructive" });
        setPageError(`Failed to load class data: ${errorMessage}`);
        setManagementData([]);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData(teacherIdFromUrl);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (pageError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Class Management" description="Access denied or error loading data." icon={ClipboardList} />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Error</AlertTitle>
          <AlertDescription>
            {pageError} You can try to <Link href="/login/teacher" className="underline">login again</Link>.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Class Management" description="View and manage the classes you are responsible for." icon={ClipboardList} />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your class information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Class Management" description="View details and performance for the classes you are responsible for as a Class Teacher." icon={ClipboardList} />

      {managementData.length > 0 ? (
        <Accordion type="multiple" defaultValue={managementData.map(d => d.classInfo.id)} className="w-full space-y-4">
          {managementData.map(({ classInfo, students, assessments, attendance }) => (
            <AccordionItem value={classInfo.id} key={classInfo.id} className="border rounded-lg shadow-md bg-card">
              <AccordionTrigger className="p-4 hover:no-underline">
                <div className="flex flex-col text-left">
                    <h2 className="text-xl font-headline text-primary">{classInfo.name}</h2>
                    <p className="text-sm text-muted-foreground">Level: {classInfo.level} {classInfo.stream || ''} | {students.length} Students</p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-4 pt-0">
                <Tabs defaultValue="assessments">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="assessments">Assessments</TabsTrigger>
                    <TabsTrigger value="roster">Student Roster</TabsTrigger>
                    <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="assessments" className="mt-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChart3/> Class Assessment Overview</CardTitle>
                        <CardDescription>Performance in all approved term assessments.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {assessments.length > 0 ? (
                           <Accordion type="single" collapsible className="w-full">
                            {assessments.map(assessment => (
                              <AccordionItem value={assessment.examId + assessment.subjectId} key={assessment.examId + assessment.subjectId}>
                                <AccordionTrigger>
                                  <div>
                                    <p className="font-semibold">{assessment.examName} - {assessment.subjectName}</p>
                                    <p className="text-sm text-muted-foreground text-left">Avg: {assessment.summary.average.toFixed(1)} | High: {assessment.summary.highest} | Low: {assessment.summary.lowest}</p>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <h4 className="font-semibold text-center mb-2">Grade Distribution</h4>
                                      <ChartContainer config={{}} className="h-[200px] w-full">
                                        <BarChart data={assessment.gradeDistribution} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                                          <CartesianGrid vertical={false} />
                                          <XAxis dataKey="grade" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                                          <YAxis allowDecimals={false} />
                                          <ChartTooltip content={<ChartTooltipContent />} />
                                          <Bar dataKey="count" fill="var(--color-primary)" radius={4} />
                                        </BarChart>
                                      </ChartContainer>
                                    </div>
                                    <div className="max-h-[250px] overflow-y-auto pr-2">
                                      <h4 className="font-semibold text-center mb-2">Individual Marks</h4>
                                      <Table>
                                        <TableHeader>
                                          <TableRow><TableHead>Student</TableHead><TableHead className="text-right">Score</TableHead><TableHead className="text-right">Grade</TableHead></TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {assessment.marks.map(mark => (
                                            <TableRow key={mark.studentId}><TableCell>{mark.studentName}</TableCell><TableCell className="text-right">{mark.score}</TableCell><TableCell className="text-right font-semibold">{mark.grade}</TableCell></TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            ))}
                           </Accordion>
                        ) : (
                          <p className="text-center text-muted-foreground py-8">No approved assessment data available for this class in the current term.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="roster" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Users/> Student Roster</CardTitle>
                        </CardHeader>
                        <CardContent>
                             {students.length > 0 ? (
                                <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Student ID</TableHead><TableHead>Full Name</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {students.map((student) => (
                                            <TableRow key={student.id}>
                                                <TableCell><div className="flex items-center gap-2"><Hash className="h-4 w-4 text-muted-foreground"/>{student.studentIdNumber}</div></TableCell>
                                                <TableCell className="font-medium"><div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground"/>{student.firstName} {student.lastName}</div></TableCell>
                                            </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            ) : (
                                <p className="text-center text-muted-foreground py-8">No students are currently enrolled in this class.</p>
                            )}
                        </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="attendance" className="mt-4">
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><CalendarCheck/> Today's Attendance Overview</CardTitle>
                            <CardDescription>A summary of student attendance for today. (This is sample data; attendance recording feature is not yet implemented).</CardDescription>
                        </CardHeader>
                        {attendance ? (
                          <CardContent className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                                <StatCard title="Present Today" value={attendance.presentToday.length} icon={UserCheck} description="Students marked present." />
                                <StatCard title="Absent Today" value={attendance.absentToday.length} icon={UserX} description="Students marked absent." />
                                <StatCard title="Total Enrolled" value={students.length} icon={Users} description="Total students in class." />
                            </div>
                            <div>
                                <h3 className="text-md font-medium">Overall Attendance Rate</h3>
                                <Progress value={attendance.overallPercentage} className="w-full mt-2 h-4" />
                                <p className="text-sm text-muted-foreground mt-1 text-right">{attendance.overallPercentage.toFixed(1)}% Present</p>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                                <Card>
                                    <CardHeader><CardTitle className="text-lg text-green-600">Present Students</CardTitle></CardHeader>
                                    <CardContent className="max-h-60 overflow-y-auto">
                                      {attendance.presentToday.length > 0 ? (
                                        <ul className="space-y-2">
                                          {attendance.presentToday.map(student => <li key={student.id} className="text-sm">{student.name}</li>)}
                                        </ul>
                                      ) : <p className="text-sm text-muted-foreground">No students marked present.</p>}
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader><CardTitle className="text-lg text-red-600">Absent Students</CardTitle></CardHeader>
                                    <CardContent className="max-h-60 overflow-y-auto">
                                      {attendance.absentToday.length > 0 ? (
                                        <ul className="space-y-2">
                                          {attendance.absentToday.map(student => <li key={student.id} className="text-sm">{student.name}</li>)}
                                        </ul>
                                      ) : <p className="text-sm text-muted-foreground">No students marked absent today. Great!</p>}
                                    </CardContent>
                                </Card>
                            </div>
                          </CardContent>
                        ) : (
                           <CardContent className="text-center text-muted-foreground py-12">
                             <p>Attendance data is not available for this class.</p>
                           </CardContent>
                        )}
                    </Card>
                  </TabsContent>
                </Tabs>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <Card className="shadow-md">
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Info className="mx-auto h-12 w-12 mb-4" />
              <h3 className="text-lg font-semibold text-foreground">You Are Not Assigned as a Class Teacher</h3>
              <p className="mt-2 max-w-md mx-auto">This page is for teachers who have been assigned as the main teacher for a class. If you believe this is an error, please contact the D.O.S. office.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
