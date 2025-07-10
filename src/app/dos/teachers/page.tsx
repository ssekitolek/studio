
"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookUser, UserPlus, MoreHorizontal, Edit3, Trash2, Mail, Loader2 } from "lucide-react";
import { getTeachers, getClasses, getSubjects } from "@/lib/actions/dos-actions";
import { deleteTeacherDoc, deleteTeacherWithRole } from "@/lib/actions/dos-admin-actions";
import type { Teacher, ClassInfo, Subject as SubjectType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";


export default function ManageTeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [subjects, setSubjects] = useState<SubjectType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [teachersData, classesData, subjectsData] = await Promise.all([
        getTeachers(),
        getClasses(),
        getSubjects(),
      ]);
      setTeachers(teachersData);
      setClasses(classesData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error("Failed to fetch page data", error);
      toast({ title: "Error", description: "Failed to load page data.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSubjectName = (subjectId: string): string => subjects.find(s => s.id === subjectId)?.name || subjectId;
  const getClassName = (classId: string): string => classes.find(c => c.id === classId)?.name || classId;

  const handleConfirmDelete = () => {
    if (!teacherToDelete) return;

    startDeleteTransition(async () => {
      // Step 1: Delete from Firebase Auth
      const authResult = await deleteTeacherWithRole(teacherToDelete.uid);
      if (!authResult.success) {
        toast({
          title: "Authentication Deletion Failed",
          description: authResult.message,
          variant: "destructive",
        });
        setTeacherToDelete(null);
        return;
      }
      
      // Step 2: Delete from Firestore Database
      const dbResult = await deleteTeacherDoc(teacherToDelete.id);
      if (!dbResult.success) {
         toast({
          title: "Database Deletion Failed",
          description: `${authResult.message}. The user was deleted from Auth, but their record in the database failed to delete. Please contact support. Error: ${dbResult.message}`,
          variant: "destructive",
        });
        setTeacherToDelete(null);
        await fetchData(); // Refresh list even on partial success
        return;
      }

      toast({
        title: "Teacher Deleted",
        description: `Teacher "${teacherToDelete.name}" was successfully deleted.`,
      });

      setTeacherToDelete(null);
      await fetchData(); // Refresh the list
    });
  };

  const getDisplayedAssignmentsForTeacher = (teacher: Teacher): {className: string, subjectName: string}[] => {
    const assignmentsMap = new Map<string, {className: string, subjectName: string}>();

    if (teacher.subjectsAssigned) {
      teacher.subjectsAssigned.forEach(assignment => {
        const key = `${assignment.classId}-${assignment.subjectId}`;
        if (!assignmentsMap.has(key)) {
          assignmentsMap.set(key, {
            className: getClassName(assignment.classId),
            subjectName: getSubjectName(assignment.subjectId),
          });
        }
      });
    }

    classes.forEach(classItem => {
      if (classItem.classTeacherId === teacher.id) {
        classItem.subjects.forEach(subject => {
          const key = `${classItem.id}-${subject.id}`;
          if (!assignmentsMap.has(key)) {
            assignmentsMap.set(key, {
              className: classItem.name,
              subjectName: subject.name,
            });
          }
        });
      }
    });
    return Array.from(assignmentsMap.values());
  };

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Manage Teachers"
          description="View, add, edit, or remove teacher accounts and their assignments."
          icon={BookUser}
          actionButton={
            <Button asChild>
              <Link href="/dos/teachers/new">
                <UserPlus className="mr-2 h-4 w-4" /> Add New Teacher
              </Link>
            </Button>
          }
        />

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Teacher List</CardTitle>
            <CardDescription>Currently registered teachers in the system.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : teachers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Assigned Subjects/Classes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((teacher) => {
                    const displayedAssignments = getDisplayedAssignmentsForTeacher(teacher);
                    return (
                      <TableRow key={teacher.id}>
                        <TableCell className="font-medium">{teacher.name}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {teacher.email}
                          </div>
                        </TableCell>
                        <TableCell>
                          {displayedAssignments.length > 0 ? (
                            <ul className="list-disc list-inside text-sm">
                              {displayedAssignments.slice(0, 3).map((assignment, idx) => (
                                <li key={idx}>
                                  {assignment.subjectName} ({assignment.className})
                                </li>
                              ))}
                              {displayedAssignments.length > 3 && <li>...and {displayedAssignments.length - 3} more</li>}
                            </ul>
                          ) : (
                            <span className="text-muted-foreground italic">No assignments</span>
                          )}
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
                                <Link href={`/dos/teachers/${teacher.id}/edit`}>
                                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                onSelect={() => setTeacherToDelete(teacher)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center text-muted-foreground py-8">No teachers found. Add a new teacher to get started.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      {teacherToDelete && (
        <AlertDialog open={!!teacherToDelete} onOpenChange={() => setTeacherToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2 text-destructive" />
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the teacher record for <strong>{teacherToDelete.name}</strong> from both the database and the authentication system.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete Teacher
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
