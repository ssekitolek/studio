
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, ArrowLeft } from "lucide-react";
import { StudentRegistrationForm } from "@/components/forms/StudentRegistrationForm";

export default function RegisterStudentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Register New Student"
        description="Add a new student to the GradeCentral system."
        icon={UserPlus}
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
          <CardTitle className="font-headline text-xl text-primary">Student Registration Form</CardTitle>
          <CardDescription>Enter the student's details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <StudentRegistrationForm />
        </CardContent>
      </Card>
    </div>
  );
}
