
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, PlusCircle } from "lucide-react";
import { getClasses, getSubjects, getTeachers } from "@/lib/actions/dos-actions";
import type { ClassInfo, Subject as SubjectType, Teacher } from "@/lib/types"; // Renamed Subject to avoid conflict

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
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
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
                    <CardDescription>Level: {classItem.level} {classItem.stream || ''} - Teacher: {getTeacherName(classItem.classTeacherId)}</CardDescription>
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
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {subjects.map(subject => (
                    <Card key={subject.id} className="p-4 flex flex-col justify-between hover:shadow-lg transition-shadow">
                       <div>
                         <h3 className="font-semibold text-primary">{subject.name}</h3>
                         <p className="text-sm text-muted-foreground">{subject.code || 'No Code'}</p>
                       </div>
                        <Button variant="link" size="sm" className="p-0 h-auto mt-2 self-start text-xs" asChild>
                            <Link href={`/dos/subjects/${subject.id}/edit`}>Edit Subject</Link>
                        </Button>
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
