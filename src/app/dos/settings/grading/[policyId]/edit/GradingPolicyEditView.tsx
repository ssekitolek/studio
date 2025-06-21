
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { GradingPolicy } from "@/lib/types";
import { GradingPolicyForm } from "@/components/forms/GradingPolicyForm";
import { DeleteGradingPolicyConfirmationDialog } from "@/components/dialogs/DeleteGradingPolicyConfirmationDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Edit3, Trash2 } from "lucide-react";

interface GradingPolicyEditViewProps {
  policy: GradingPolicy;
  showDeletePromptInitially: boolean;
}

export function GradingPolicyEditView({ policy, showDeletePromptInitially }: GradingPolicyEditViewProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(showDeletePromptInitially);
  const router = useRouter();

  useEffect(() => {
    setIsDeleteDialogOpen(showDeletePromptInitially);
  }, [showDeletePromptInitially]);

  const handleDialogClose = () => {
    setIsDeleteDialogOpen(false);
    if (router && policy?.id) {
        const currentSearchParams = new URLSearchParams(window.location.search);
        if(currentSearchParams.get('action') === 'delete_prompt') {
             router.replace(`/dos/settings/grading/${policy.id}/edit`);
        }
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={isDeleteDialogOpen ? `Confirm Deletion: ${policy.name}` : `Edit Grading Policy: ${policy.name}`}
        description={isDeleteDialogOpen ? "Please confirm you want to delete this policy." : "Modify this grading scale or policy."}
        icon={isDeleteDialogOpen ? Trash2 : Edit3}
        actionButton={
          <Button variant="outline" asChild>
            <Link href="/dos/settings/exams">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Exams & Grading
            </Link>
          </Button>
        }
      />
      {isDeleteDialogOpen ? (
        <DeleteGradingPolicyConfirmationDialog
          policyId={policy.id}
          policyName={policy.name}
          isDefault={policy.isDefault || false}
          open={isDeleteDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleDialogClose();
            } else {
              setIsDeleteDialogOpen(true);
            }
          }}
        />
      ) : (
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">Edit Grading Policy Form</CardTitle>
            <CardDescription>Update grades and score ranges for policy "{policy.name}" (ID: {policy.id}).</CardDescription>
          </CardHeader>
          <CardContent>
            <GradingPolicyForm policyId={policy.id} initialData={policy} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
