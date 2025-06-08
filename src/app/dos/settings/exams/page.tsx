
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, PlusCircle } from "lucide-react";

// Mock data - replace with actual data fetching
const examsData = [
  { id: "exam1", name: "Midterm Exam", term: "Term 1 2024", maxMarks: 100, description: "Covers first half of syllabus." },
  { id: "exam2", name: "Final Exam", term: "Term 1 2024", maxMarks: 100, description: "Comprehensive final exam." },
  { id: "exam3", name: "CAT 1", term: "Term 2 2024", maxMarks: 30, description: "Continuous Assessment Test 1." },
];

const gradingPolicies = [
    {id: "gp1", name: "Standard Grading Scale", default: true, scale: [
        {grade: "A", min: 80, max: 100}, {grade: "B", min: 70, max: 79}, {grade: "C", min: 60, max: 69}
    ]}
]

export default function ManageExamsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams & Grading"
        description="Define examination types, grading policies, and assessment structures."
        icon={FileText}
        actionButton={
          <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/dos/settings/grading/new"> {/* Placeholder Link */}
                <PlusCircle className="mr-2 h-4 w-4" /> Add Grading Policy
                </Link>
            </Button>
            <Button asChild>
                <Link href="/dos/settings/exams/new"> {/* Placeholder Link */}
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Exam Type
                </Link>
            </Button>
          </div>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Exam Types</CardTitle>
          <CardDescription>All defined examination types in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {examsData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {examsData.map((exam) => (
                <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CardTitle>{exam.name}</CardTitle>
                    <CardDescription>Term: {exam.term} - Max Marks: {exam.maxMarks}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{exam.description}</p>
                    <Button variant="outline" size="sm" className="w-full" asChild>
                        <Link href={`/dos/settings/exams/${exam.id}/edit`}>Edit Exam</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No exam types found. Add a new exam type to get started.</p>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Grading Policies</CardTitle>
          <CardDescription>Define how scores translate to grades.</CardDescription>
        </CardHeader>
        <CardContent>
           {gradingPolicies.map(policy => (
             <Card key={policy.id} className="mb-4">
                <CardHeader>
                    <CardTitle className="text-lg">{policy.name} {policy.default && <span className="text-xs font-normal text-green-600">(Default)</span>}</CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="text-sm space-y-1">
                        {policy.scale.map(s => <li key={s.grade}>{s.grade}: {s.min}% - {s.max}%</li>)}
                    </ul>
                     <Button variant="link" size="sm" className="p-0 h-auto mt-2 self-start text-xs" asChild>
                        <Link href={`/dos/settings/grading/${policy.id}/edit`}>Edit Policy</Link>
                    </Button>
                </CardContent>
             </Card>
           ))}
            {gradingPolicies.length === 0 && (
                 <p className="text-center text-muted-foreground py-8">No grading policies found.</p>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

    