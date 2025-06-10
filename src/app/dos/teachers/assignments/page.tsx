
"use client";

import * as React from "react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Users, RefreshCw } from "lucide-react";
import { TeacherAssignmentForm } from "@/components/forms/TeacherAssignmentForm";
import { getTeachers, getClasses, getSubjects, getTeacherById } from "@/lib/actions/dos-actions";
import type { Teacher, ClassInfo, Subject as SubjectType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function TeacherAssignmentsPage() {
  const { toast } = useToast();
  const [isLoadingInitialData, setIsLoadingInitialData] = React.useState(true);
  const [isLoadingTeacherDetails, setIsLoadingTeacherDetails] = React.useState(false);
  
  const [allTeachers, setAllTeachers] = React.useState<Teacher[]>([]);
  const [allClasses, setAllClasses] = React.useState<ClassInfo[]>([]);
  const [allSubjects, setAllSubjects] = React.useState<SubjectType[]>([]);
  
  const [selectedTeacherId, setSelectedTeacherId] = React.useState<string | null>(null);
  const [selectedTeacherDetails, setSelectedTeacherDetails] = React.useState<Teacher | null>(null);

  const fetchInitialData = React.useCallback(async () => {
    setIsLoadingInitialData(true);
    try {
      const [teachersData, classesData, subjectsData] = await Promise.all([
        getTeachers(),
        getClasses(),
        getSubjects(),
      ]);
      setAllTeachers(teachersData);
      setAllClasses(classesData);
      setAllSubjects(subjectsData);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load initial data for assignments.", variant: "destructive" });
    } finally {
      setIsLoadingInitialData(false);
    }
  }, [toast]);

  React.useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleTeacherSelectionChange = async (teacherId: string) => {
    setSelectedTeacherId(teacherId);
    if (teacherId) {
      setIsLoadingTeacherDetails(true);
      try {
        const teacherDetails = await getTeacherById(teacherId); // Fetch full details including subjectsAssigned
        setSelectedTeacherDetails(teacherDetails);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load teacher details.", variant: "destructive" });
        setSelectedTeacherDetails(null);
      } finally {
        setIsLoadingTeacherDetails(false);
      }
    } else {
      setSelectedTeacherDetails(null);
    }
  };

  const handleFormSuccess = async () => {
    toast({ title: "Assignments Updated", description: "Teacher assignments have been successfully updated."});
    // Optionally re-fetch selected teacher details to reflect changes immediately
    if (selectedTeacherId) {
      setIsLoadingTeacherDetails(true);
      const teacherDetails = await getTeacherById(selectedTeacherId);
      setSelectedTeacherDetails(teacherDetails);
      setIsLoadingTeacherDetails(false);
    }
  }

  if (isLoadingInitialData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading assignment data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teacher Assignments"
        description="Assign classes and subjects to teachers."
        icon={Users}
        actionButton={
            <Button variant="outline" onClick={fetchInitialData} disabled={isLoadingInitialData}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingInitialData ? 'animate-spin' : ''}`} />
                Refresh Data
            </Button>
        }
      />

      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">Select Teacher</CardTitle>
          <CardDescription>Choose a teacher to manage their assignments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedTeacherId || ""}
            onValueChange={handleTeacherSelectionChange}
            disabled={allTeachers.length === 0}
          >
            <SelectTrigger className="w-full md:w-1/2">
              <SelectValue placeholder={allTeachers.length > 0 ? "Select a teacher" : "No teachers available"} />
            </SelectTrigger>
            <SelectContent>
              {allTeachers.map((teacher) => (
                <SelectItem key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoadingTeacherDetails && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading teacher's current assignments...</p>
        </div>
      )}

      {!isLoadingTeacherDetails && selectedTeacherId && selectedTeacherDetails && (
        <TeacherAssignmentForm
          key={selectedTeacherId} // Ensure form re-renders with new initial data when teacher changes
          teacher={selectedTeacherDetails}
          allClasses={allClasses}
          allSubjects={allSubjects}
          onSuccess={handleFormSuccess}
        />
      )}
      {!isLoadingTeacherDetails && selectedTeacherId && !selectedTeacherDetails && (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="text-destructive">Error</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Could not load details for the selected teacher. They might have been deleted or an error occurred.</p>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
