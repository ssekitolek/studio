
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileText, PlusCircle, Scale, CalendarClock, UserCircle, BookOpen, Tag, Edit3, Trash2, MoreHorizontal } from "lucide-react";
import { getExams, getGradingPolicies, getTeachers, getClasses, getSubjects } from "@/lib/actions/dos-actions";
import type { Exam, GradingPolicy, Teacher, ClassInfo, Subject } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";


export default async function ManageExamsAndGradingPage() {
  const [exams, gradingPolicies, teachers, classes, subjects] = await Promise.all([
    getExams(),
    getGradingPolicies(),
    getTeachers(),
    getClasses(),
    getSubjects(),
  ]);

  const getTeacherName = (teacherId?: string) => teachers.find(t => t.id === teacherId)?.name || 'N/A';
  const getClassName = (classId?: string) => classes.find(c => c.id === classId)?.name || 'N/A';
  const getSubjectName = (subjectId?: string) => subjects.find(s => s.id === subjectId)?.name || 'N/A';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exams & Grading"
        description="Define examination types, grading policies, and assessment structures."
        icon={FileText}
        actionButton={
          <div className="flex gap-2">
            <Button asChild variant="outline">
                <Link href="/dos/settings/grading/new">
                <Scale className="mr-2 h-4 w-4" /> Add Grading Policy
                </Link>
            </Button>
            <Button asChild>
                <Link href="/dos/settings/exams/new"> 
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Exam
                </Link>
            </Button>
          </div>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Exam List</CardTitle>
          <CardDescription>All defined exams in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {exams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {exams.map((exam) => (
                <Card key={exam.id} className="hover:shadow-lg transition-shadow flex flex-col justify-between">
                    <CardHeader className="flex-row items-start justify-between">
                        <div>
                            <CardTitle>{exam.name}</CardTitle>
                            <CardDescription>Term ID: {exam.termId} - Max: {exam.maxMarks}</CardDescription>
                        </div>
                        <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dos/settings/exams/${exam.id}/edit`}>
                              <Edit3 className="mr-2 h-4 w-4" /> Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator/>
                           <DropdownMenuItem 
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            asChild
                           >
                             <Link href={`/dos/settings/exams/${exam.id}/edit?action=delete_prompt`}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                             </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm flex-grow">
                    {exam.description && <p className="text-muted-foreground italic text-xs line-clamp-2">{exam.description}</p>}
                    {exam.examDate && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarClock className="h-4 w-4"/> Exam Date: {new Date(exam.examDate).toLocaleDateString()}
                        </div>
                    )}
                    {exam.marksSubmissionDeadline && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <CalendarClock className="h-4 w-4 text-accent"/> Marks Deadline: {new Date(exam.marksSubmissionDeadline).toLocaleDateString()}
                        </div>
                    )}
                     {exam.classId && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <Tag className="h-4 w-4"/> Class: {getClassName(exam.classId)}
                        </div>
                    )}
                    {exam.subjectId && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <BookOpen className="h-4 w-4"/> Subject: {getSubjectName(exam.subjectId)}
                        </div>
                    )}
                    {exam.teacherId && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                            <UserCircle className="h-4 w-4"/> Teacher: {getTeacherName(exam.teacherId)}
                        </div>
                    )}
                   
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">No exams found. Add a new exam to get started.</p>
          )}
        </CardContent>
      </Card>

       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Grading Policies</CardTitle>
          <CardDescription>Define how scores translate to grades.</CardDescription>
        </CardHeader>
        <CardContent>
           {gradingPolicies.length > 0 ? gradingPolicies.map(policy => (
             <Card key={policy.id} className="mb-4 hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="text-lg">{policy.name} {policy.isDefault && <span className="text-xs font-normal text-green-600 ml-2">(Default)</span>}</CardTitle>
                </CardHeader>
                <CardContent>
                    {Array.isArray(policy.scale) && policy.scale.length > 0 ? (
                        <ul className="text-sm space-y-1">
                            {policy.scale.map((s, index) => <li key={`${s.grade}-${index}`}>{s.grade}: {s.minScore}% - {s.maxScore}%</li>)}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground italic">No grade tiers defined for this policy.</p>
                    )}
                     <Button variant="link" size="sm" className="p-0 h-auto mt-2 self-start text-xs" asChild>
                        <Link href={`/dos/settings/grading/${policy.id}/edit`}>Edit Policy</Link>
                    </Button>
                </CardContent>
             </Card>
           )) : (
                <p className="text-center text-muted-foreground py-8">No grading policies found. Add a new policy to get started.</p>
           )}
        </CardContent>
      </Card>
    </div>
  );
}
