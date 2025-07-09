
"use client";

import * as React from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, UserPlus, MoreHorizontal, Edit3, Trash2, Hash, UsersRound, Loader2, FileUp } from "lucide-react";
import { getStudents, getClasses } from "@/lib/actions/dos-actions";
import type { Student, ClassInfo } from "@/lib/types";
import { DeleteAllStudentsConfirmationDialog } from "@/components/dialogs/DeleteAllStudentsConfirmationDialog";
import { DeleteClassStudentsConfirmationDialog } from "@/components/dialogs/DeleteClassStudentsConfirmationDialog";
import { Badge } from "@/components/ui/badge";

export default function ManageStudentsPage() {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [classes, setClasses] = React.useState<ClassInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDeleteAllOpen, setIsDeleteAllOpen] = React.useState(false);
  const [isDeleteByClassOpen, setIsDeleteByClassOpen] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [studentsData, classesData] = await Promise.all([getStudents(), getClasses()]);
      setStudents(studentsData);
      setClasses(classesData);
    } catch (error) {
      console.error("Failed to fetch student data", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || "N/A";

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Manage Students"
          description="View, add, edit, or remove student records from the system."
          icon={Users}
          actionButton={
            <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setIsDeleteByClassOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete by Class
                </Button>
                <Button variant="destructive" onClick={() => setIsDeleteAllOpen(true)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Students
                </Button>
                <Button asChild>
                    <Link href="/dos/students/new">
                    <UserPlus className="mr-2 h-4 w-4" /> Register New Student
                    </Link>
                </Button>
            </div>
          }
        />

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Student List</CardTitle>
            <CardDescription>All students currently enrolled in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : students.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No.</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Stream</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                          <div className="flex items-center gap-1">
                              <Hash className="h-4 w-4 text-muted-foreground"/>
                              {student.studentIdNumber}
                          </div>
                      </TableCell>
                      <TableCell className="font-medium">{student.firstName} {student.lastName}</TableCell>
                      <TableCell>
                          <div className="flex items-center gap-1">
                             <UsersRound className="h-4 w-4 text-muted-foreground"/>
                             {getClassName(student.classId)}
                          </div>
                      </TableCell>
                      <TableCell>
                        {student.stream ? <Badge variant="secondary">{student.stream}</Badge> : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/dos/students/${student.id}/edit`}>
                                <Edit3 className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                             <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10"
                              asChild
                             >
                               <Link href={`/dos/students/${student.id}/edit?action=delete_prompt`}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                               </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center text-muted-foreground py-8 space-y-4">
                <p>No students found. Register a new student or import them in bulk to get started.</p>
                <Button variant="outline" asChild>
                    <Link href="/dos/students/bulk-import">
                        <FileUp className="mr-2 h-4 w-4" /> Bulk Import Students
                    </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteClassStudentsConfirmationDialog
          open={isDeleteByClassOpen}
          onOpenChange={setIsDeleteByClassOpen}
          classes={classes}
          onSuccess={fetchData}
      />
      <DeleteAllStudentsConfirmationDialog
          open={isDeleteAllOpen}
          onOpenChange={setIsDeleteAllOpen}
          onSuccess={fetchData}
      />
    </>
  );
}
