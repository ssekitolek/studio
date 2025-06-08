
import Link from "next/link";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { BookUser, UserPlus, MoreHorizontal, Edit3, Trash2, Mail } from "lucide-react";
import { getTeachers, getClasses, getSubjects } from "@/lib/actions/dos-actions";
import type { Teacher, ClassInfo, Subject } from "@/lib/types";

// Dummy delete action for client-side interaction demonstration if direct delete button was used.
// Actual delete is handled via the edit page with ?action=delete_prompt
async function handleDeleteTeacher(teacherId: string) {
  "use server"; 
  console.log("Attempting to delete teacher:", teacherId);
  // const result = await deleteTeacher(teacherId); // This would be the actual server action
  // revalidatePath("/dos/teachers"); // if action doesn't do it
  // return result;
  return { success: true, message: `Teacher ${teacherId} would be deleted.` };
}

export default async function ManageTeachersPage() {
  const teachers = await getTeachers();
  const classes = await getClasses();
  const subjects = await getSubjects();

  const getSubjectName = (subjectId: string) => subjects.find(s => s.id === subjectId)?.name || subjectId;
  const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || classId;

  return (
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
          <CardDescription>Currently registered teachers in GradeCentral.</CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length > 0 ? (
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
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>
                        <div className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-muted-foreground"/>
                            {teacher.email}
                        </div>
                    </TableCell>
                    <TableCell>
                      {teacher.subjectsAssigned && teacher.subjectsAssigned.length > 0 ? (
                        <ul className="list-disc list-inside text-sm">
                          {teacher.subjectsAssigned.slice(0,2).map(assignment => ( // Show max 2 for brevity
                            <li key={`${assignment.classId}-${assignment.subjectId}`}>
                              {getSubjectName(assignment.subjectId)} ({getClassName(assignment.classId)})
                            </li>
                          ))}
                          {teacher.subjectsAssigned.length > 2 && <li>...and {teacher.subjectsAssigned.length - 2} more</li>}
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
                            asChild
                           >
                             <Link href={`/dos/teachers/${teacher.id}/edit?action=delete_prompt`}>
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
            <p className="text-center text-muted-foreground py-8">No teachers found. Add a new teacher to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
