
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { SubjectForm } from "@/components/forms/SubjectForm";

export default function AddNewSubjectPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add New Subject"
        description="Define a new subject that can be taught."
        icon={PlusCircle}
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
          <CardTitle className="font-headline text-xl text-primary">New Subject Form</CardTitle>
          <CardDescription>Provide the details for the new subject.</CardDescription>
        </CardHeader>
        <CardContent>
          <SubjectForm />
        </CardContent>
      </Card>
    </div>
  );
}
