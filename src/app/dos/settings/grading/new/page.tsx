
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, ArrowLeft, Scale } from "lucide-react";
import { GradingPolicyForm } from "@/components/forms/GradingPolicyForm";

export default function AddGradingPolicyPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Add Grading Policy"
        description="Create a new grading scale or policy."
        icon={Scale} 
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
          <CardTitle className="font-headline text-xl text-primary">New Grading Policy Form</CardTitle>
          <CardDescription>Define the grades and their corresponding score ranges.</CardDescription>
        </CardHeader>
        <CardContent>
          <GradingPolicyForm />
        </CardContent>
      </Card>
    </div>
  );
}
