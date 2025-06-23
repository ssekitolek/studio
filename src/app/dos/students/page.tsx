import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Users, UserPlus, MoreHorizontal, Edit3, Trash2, Hash, UsersRound } from "lucide-react";
import { getStudents, getClasses } from "@/lib/actions/dos-actions"; // Placeholder actions
import type { Student, ClassInfo } from "@/lib/types";

export default async function ManageStudentsPage() {
  const students = await getStudents();
  const classes = await getClasses();

  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || "N/A";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Students"
        description="View, add, edit, or remove student records from the system."
        icon={Users}
        actionButton={
          <Button asChild>
            <Link href="/dos/students/new">
              <UserPlus className="mr-2 h-4 w-4" /> Register New Student
            </Link>
          </Button>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Student List</CardTitle>
          <CardDescription>All students currently enrolled in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {students.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Full Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
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
            <p className="text-center text-muted-foreground py-8">No students found. Register a new student to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
