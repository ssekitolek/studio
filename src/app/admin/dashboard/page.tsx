
import { PageHeader } from "@/components/shared/PageHeader";
import { getWebsiteContent } from "@/lib/actions/website-actions";
import { WebsiteContentForm } from "@/components/forms/WebsiteContentForm";
import { Settings } from "lucide-react";

export default async function AdminDashboardPage() {
  const content = await getWebsiteContent();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website Content Management"
        description="Update the content displayed on the public school homepage."
        icon={Settings}
      />
      <WebsiteContentForm initialData={content} />
    </div>
  );
}
