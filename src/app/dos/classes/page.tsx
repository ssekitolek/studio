
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, PlusCircle, BookOpen, Edit3, Trash2, MoreHorizontal } from "lucide-react"; // Added icons
import { getClasses, getSubjects, getTeachers } from "@/lib/actions/dos-actions";
import type { ClassInfo, Subject as SubjectType, Teacher } from "@/lib/types"; 
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";


export default async function ManageClassesPage() {
  const classes: ClassInfo[] = await getClasses();
  const subjects: SubjectType[] = await getSubjects();
  const teachers: Teacher[] = await getTeachers();

  const getTeacherName = (teacherId?: string): string => {
    if (!teacherId) return "N/A";
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? teacher.name : "Unknown Teacher";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Classes & Subjects"
        description="View, create, and manage classes and the subjects offered."
        icon={ClipboardList}
        actionButton={
          <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/dos/classes/new-subject">
                <BookOpen className="mr-2 h-4 w-4" /> Add New Subject
                </Link>
            </Button>
            <Button asChild>
                <Link href="/dos/classes/new">
                <PlusCircle className="mr-2 h-4 w-4" /> Create New Class
                </Link>
            </Button>
          </div>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Class List</CardTitle>
          <CardDescription>All registered classes in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classes.map((classItem) => (
                <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{classItem.name}</CardTitle>
                    <CardDescription>Level: {classItem.level} - Teacher: {getTeacherName(classItem.classTeacherId)}</CardDescription>
                     {classItem.streams && classItem.streams.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        <span className="text-xs text-muted-foreground mr-1">Streams:</span>
                        {classItem.streams.map(stream => <Badge key={stream} variant="secondary">{stream}</Badge>)}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-1">Subjects:</h4>
                    {classItem.subjects && classItem.subjects.length > 0 ? (
                        <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {classItem.subjects.map(subject => <li key={subject.id}>{subject.name}</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No subjects assigned.</p>
                    )}
                    <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                        <Link href={`/dos/classes/${classItem.id}/edit`}>Edit Class</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No classes found. Create a new class to get started.</p>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Subject List</CardTitle>
          <CardDescription>All available subjects in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {subjects.map(subject => (
                    <Card key={subject.id} className="flex flex-col justify-between hover:shadow-lg transition-shadow">
                       <CardHeader className="flex-row items-start justify-between pb-2">
                         <div>
                           <h3 className="font-semibold text-primary">{subject.name}</h3>
                           <p className="text-sm text-muted-foreground">{subject.code || 'No Code'}</p>
                         </div>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dos/subjects/${subject.id}/edit`}>
                                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator/>
                              <DropdownMenuItem 
                                className="text-destructive focus:text-destructive focus:bg-destructive/10"
                                asChild
                              >
                                <Link href={`/dos/subjects/${subject.id}/edit?action=delete_prompt`}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                       </CardHeader>
                       {/* Removed edit button from here as it's in dropdown now */}
                    </Card>
                ))}
             </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No subjects found. Add a new subject to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
