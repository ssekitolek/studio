
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { ClassForm } from "@/components/forms/ClassForm"; // Updated import

export default function CreateNewClassPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Create New Class"
        description="Fill in the details to add a new class to the system."
        icon={PlusCircle}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/classes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Classes
            </Link>
          </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">New Class Form</CardTitle>
          <CardDescription>Provide the necessary information for the new class.</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassForm />
        </CardContent>
      </Card>
    </div>
  );
}

    