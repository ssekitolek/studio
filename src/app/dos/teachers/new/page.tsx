
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, ArrowLeft } from "lucide-react";

// This will eventually be a form component
// import { TeacherForm } from "@/components/forms/TeacherForm";

export default function AddNewTeacherPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Teacher"
        description="Create a new teacher account and assign roles."
        icon={UserPlus}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/teachers">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Teachers
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">New Teacher Form</CardTitle>
          <CardDescription>Enter the teacher's information below.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for TeacherForm */}
          <p className="text-muted-foreground">Teacher creation form will be here.</p>
          {/* <TeacherForm /> */}
        </CardContent>
      </Card>
    </div>
  );
}
