
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserCog, ArrowLeft, Edit3 } from "lucide-react";

// This will eventually be a form component
// import { StudentRegistrationForm } from "@/components/forms/StudentRegistrationForm";

export default function EditStudentPage({ params }: { params: { studentId: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Student ${params.studentId}`}
        description="Update the student's details."
        icon={Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/students">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Students
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Student Form</CardTitle>
          <CardDescription>Modify the details for student {params.studentId}.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for StudentRegistrationForm */}
          <p className="text-muted-foreground">Student editing form for ID: {params.studentId} will be here.</p>
          {/* <StudentRegistrationForm studentId={params.studentId} /> */}
        </CardContent>
      </Card>
    </div>
  );
}
