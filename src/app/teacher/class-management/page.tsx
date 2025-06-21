"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, ClipboardList, Info, AlertTriangle, Hash, User } from "lucide-react";
import { getClassTeacherManagementData } from "@/lib/actions/teacher-actions";
import type { ClassTeacherData } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export default function ClassManagementPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const [isLoading, setIsLoading] = useState(true);
  const [managementData, setManagementData] = useState<ClassTeacherData[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);

  useEffect(() => {
    if (!searchParams) {
      setPageError("Could not access URL parameters. Please try reloading or logging in again.");
      setIsLoading(false);
      toast({ title: "Error", description: "URL parameters unavailable.", variant: "destructive" });
      return;
    }

    const teacherIdFromUrl = searchParams.get("teacherId");

    if (!teacherIdFromUrl || teacherIdFromUrl.trim() === "" || teacherIdFromUrl.toLowerCase() === "undefined") {
      const msg = "Teacher ID invalid or missing from URL. Please login again to view your classes.";
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
      setPageError(msg);
      setCurrentTeacherId(null);
      setIsLoading(false);
      return;
    }

    setCurrentTeacherId(teacherIdFromUrl);
    setPageError(null);
    setIsLoading(true);

    async function fetchData(validTeacherId: string) {
      try {
        const data = await getClassTeacherManagementData(validTeacherId);
        setManagementData(data);
        if (data.length === 0 && !pageError) {
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
  }, [searchParams, toast]);

  if (pageError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Class Management"
          description="Access denied or error loading data."
          icon={ClipboardList}
        />
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
        <PageHeader
          title="Class Management"
          description="View and manage the classes you are responsible for."
          icon={ClipboardList}
        />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading your class information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Class Management"
        description="View and manage the classes you are responsible for as a Class Teacher."
        icon={ClipboardList}
      />

      {managementData.length > 0 ? (
        managementData.map(({ classInfo, students }) => (
          <Card key={classInfo.id} className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">{classInfo.name}</CardTitle>
              <CardDescription>Level: {classInfo.level} {classInfo.stream || ''} | Number of Students: {students.length}</CardDescription>
            </CardHeader>
            <CardContent>
              <h4 className="font-semibold mb-2 text-foreground/90">Student Roster</h4>
              {students.length > 0 ? (
                <div className="border rounded-lg overflow-hidden">
                    <Table>
                    <TableHeader>
                        <TableRow>
                        <TableHead className="w-[200px]">Student ID</TableHead>
                        <TableHead>Full Name</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {students.map((student) => (
                        <TableRow key={student.id}>
                            <TableCell>
                            <div className="flex items-center gap-2">
                                <Hash className="h-4 w-4 text-muted-foreground"/>
                                {student.studentIdNumber}
                            </div>
                            </TableCell>
                            <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground"/>
                                {student.firstName} {student.lastName}
                                </div>
                            </TableCell>
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
        ))
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
