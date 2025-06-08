
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ClipboardList, PlusCircle } from "lucide-react";

// Mock data - replace with actual data fetching
const classesData = [
  { id: "c1", name: "Form 1A", level: "Form 1", stream: "A", subjects: ["Mathematics", "English"], teacher: "Mr. Harrison" },
  { id: "c2", name: "Form 2B", level: "Form 2", stream: "B", subjects: ["Physics", "Chemistry"], teacher: "Ms. Priya" },
];

const subjectsData = [
  { id: "s1", name: "Mathematics", code: "MATH" },
  { id: "s2", name: "English", code: "ENG" },
  { id: "s3", name: "Physics", code: "PHY" },
  { id: "s4", name: "Chemistry", code: "CHEM" },
];


export default function ManageClassesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Manage Classes & Subjects"
        description="View, create, and manage classes and the subjects offered."
        icon={ClipboardList}
        actionButton={
          <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/dos/classes/new-subject"> {/* Placeholder Link */}
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Subject
                </Link>
            </Button>
            <Button asChild>
                <Link href="/dos/classes/new"> {/* Placeholder Link */}
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
          {classesData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classesData.map((classItem) => (
                <Card key={classItem.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{classItem.name}</CardTitle>
                    <CardDescription>Level: {classItem.level} {classItem.stream} - Teacher: {classItem.teacher}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <h4 className="font-semibold mb-1">Subjects:</h4>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {classItem.subjects.map(subject => <li key={subject}>{subject}</li>)}
                    </ul>
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
          {subjectsData.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {subjectsData.map(subject => (
                    <Card key={subject.id} className="p-4 flex flex-col justify-between hover:shadow-lg transition-shadow">
                       <div>
                         <h3 className="font-semibold text-primary">{subject.name}</h3>
                         <p className="text-sm text-muted-foreground">{subject.code}</p>
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

    