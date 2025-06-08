
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Edit3, ArrowLeft } from "lucide-react";

// This will eventually be a form component for editing a subject
// import { SubjectForm } from "@/components/forms/SubjectForm";

export default function EditSubjectPage({ params }: { params: { subjectId: string } }) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Subject ${params.subjectId}`}
        description="Modify the details of the selected subject."
        icon={Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classes & Subjects
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Edit Subject Form</CardTitle>
          <CardDescription>Update the information for subject {params.subjectId}.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for SubjectForm with initialData */}
          <p className="text-muted-foreground">Subject editing form for ID: {params.subjectId} will be here.</p>
          {/* <SubjectForm subjectId={params.subjectId} /> */}
        </CardContent>
      </Card>
    </div>
  );
}
