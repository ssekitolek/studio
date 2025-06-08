
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, ArrowLeft } from "lucide-react";
import { TeacherForm } from "@/components/forms/TeacherForm";

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
          <TeacherForm />
        </CardContent>
      </Card>
    </div>
  );
}
