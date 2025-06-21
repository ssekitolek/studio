
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, AlertTriangle } from "lucide-react";
import { getGradingPolicyById } from "@/lib/actions/dos-actions";
import { Alert, AlertDescription, AlertTitle as ShadcnAlertTitle } from "@/components/ui/alert";
import { GradingPolicyEditView } from "./GradingPolicyEditView";

interface EditGradingPolicyPageProps {
  params: { policyId: string };
  searchParams?: { action?: string };
}

export default async function EditGradingPolicyPage({ params, searchParams }: EditGradingPolicyPageProps) {
  const policyData = await getGradingPolicyById(params.policyId);
  const showDeletePrompt = searchParams?.action === 'delete_prompt';

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

  return <GradingPolicyEditView policy={policyData} showDeletePromptInitially={showDeletePrompt} />;
}
