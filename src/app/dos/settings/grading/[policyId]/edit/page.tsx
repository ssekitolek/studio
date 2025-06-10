
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle, Scale } from "lucide-react";
import { GradingPolicyForm } from "@/components/forms/GradingPolicyForm";
import { getGradingPolicyById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";

interface EditGradingPolicyPageProps {
  params: { policyId: string };
}

export default async function EditGradingPolicyPage({ params }: EditGradingPolicyPageProps) {
  const policyData = await getGradingPolicyById(params.policyId);

  if (!policyData) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Edit Grading Policy"
          description="Modify this grading scale or policy."
          icon={Edit3}
          actionButton={
            <Button variant="outline" asChild>
              <Link href="/dos/settings/exams">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Exams & Grading
              </Link>
            </Button>
          }
        />
        <Alert variant="destructive" className="shadow-md">
          <AlertTriangle className="h-4 w-4" />
          <ShadcnAlertTitle>Grading Policy Not Found</ShadcnAlertTitle>
          <AlertDescription>
            The grading policy with ID "{params.policyId}" could not be found. It may have been deleted or the ID is incorrect.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Edit Grading Policy: ${policyData.name}`}
        description="Modify this grading scale or policy."
        icon={Edit3}
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
          <CardTitle className="font-headline text-xl text-primary">Edit Grading Policy Form</CardTitle>
          <CardDescription>Update grades and score ranges for policy "{policyData.name}" (ID: {params.policyId}).</CardDescription>
        </CardHeader>
        <CardContent>
          <GradingPolicyForm policyId={params.policyId} initialData={policyData} />
        </CardContent>
      </Card>
    </div>
  );
}
