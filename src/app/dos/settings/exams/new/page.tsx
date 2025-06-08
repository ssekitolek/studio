
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";

// This will eventually be a form component
// import { ExamTypeForm } from "@/components/forms/ExamTypeForm";

export default function AddNewExamTypePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Exam Type"
        description="Define a new type of examination for the system."
        icon={FileText}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/settings/exams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exams & Grading
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">New Exam Type Form</CardTitle>
          <CardDescription>Provide the details for the new exam type.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for ExamTypeForm */}
          <p className="text-muted-foreground">Exam type creation form will be here.</p>
          {/* <ExamTypeForm /> */}
        </CardContent>
      </Card>
    </div>
  );
}
