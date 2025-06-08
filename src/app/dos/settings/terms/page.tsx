
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { CalendarDays, CalendarPlus } from "lucide-react";
import { getTerms } from "@/lib/actions/dos-actions";
import type { Term } from "@/lib/types";

export default async function ManageTermsPage() {
  const terms: Term[] = await getTerms();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academic Terms"
        description="Manage academic terms, set start and end dates, and define school years."
        icon={CalendarDays}
        actionButton={
          <Button asChild>
            <Link href="/dos/settings/terms/new">
              <CalendarPlus className="mr-2 h-4 w-4" /> Add New Term
            </Link>
          </Button>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Term List</CardTitle>
          <CardDescription>All academic terms defined in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {terms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {terms.map((term) => (
                <Card key={term.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{term.name}</CardTitle>
                    <CardDescription>Year: {term.year}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Start Date: {new Date(term.startDate).toLocaleDateString()}</p>
                    <p className="text-sm">End Date: {new Date(term.endDate).toLocaleDateString()}</p>
                     <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                        <Link href={`/dos/settings/terms/${term.id}/edit`}>Edit Term</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No terms found. Add a new term to get started.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

    
