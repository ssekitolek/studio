
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { useToast } from "@/hooks/use-toast";
import { createStudent, getClasses, updateStudent } from "@/lib/actions/dos-actions"; // Added updateStudent
import type { ClassInfo, Student } from "@/lib/types";
import { Loader2, Save, UserPlus, Edit3 } from "lucide-react"; // Added Edit3
import { useRouter } from "next/navigation";

const studentRegistrationFormSchema = z.object({
  studentIdNumber: z.string().min(1, "Student ID Number is required."),
  firstName: z.string().min(2, "First name must be at least 2 characters."),
  lastName: z.string().min(2, "Last name must be at least 2 characters."),
  classId: z.string().min(1, "Please select a class."),
  dateOfBirth: z.date().optional(),
  gender: z.enum(["Male", "Female", "Other", ""]).optional(), // Added "" for unselected
});

type StudentFormValues = z.infer<typeof studentRegistrationFormSchema>;

interface StudentRegistrationFormProps {
  initialData?: Student | null; 
  studentDocumentId?: string; 
  onSuccess?: () => void;
}

export function StudentRegistrationForm({ initialData, studentDocumentId, onSuccess }: StudentRegistrationFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [classes, setClasses] = React.useState<ClassInfo[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = React.useState(true);

  const isEditMode = !!studentDocumentId && !!initialData;

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentRegistrationFormSchema),
    defaultValues: {
      studentIdNumber: initialData?.studentIdNumber || "",
      firstName: initialData?.firstName || "",
      lastName: initialData?.lastName || "",
      classId: initialData?.classId || "",
      dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
      gender: initialData?.gender || "",
    },
  });

  React.useEffect(() => {
    async function fetchClassesData() {
      setIsLoadingClasses(true);
      try {
        const classesData = await getClasses();
        setClasses(classesData);
      } catch (error) {
        toast({ title: "Error", description: "Failed to load classes.", variant: "destructive" });
      } finally {
        setIsLoadingClasses(false);
      }
    }
    fetchClassesData();
  }, [toast]);

  React.useEffect(() => {
    if (initialData) {
      form.reset({
        studentIdNumber: initialData.studentIdNumber,
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        classId: initialData.classId,
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
        gender: initialData.gender || "",
      });
    }
  }, [initialData, form]);


  const onSubmit = (data: StudentFormValues) => {
    startTransition(async () => {
      const studentDataToSave = {
        ...data,
        dateOfBirth: data.dateOfBirth?.toISOString().split('T')[0], 
        gender: data.gender === "" ? undefined : data.gender,
      };

      try {
        if (isEditMode && studentDocumentId) {
          const result = await updateStudent(studentDocumentId, studentDataToSave as Partial<Student>);
          if (result.success) {
            toast({ title: "Student Updated", description: `Student "${data.firstName} ${data.lastName}" updated successfully.`});
            if (onSuccess) onSuccess(); else router.push("/dos/students");
          } else {
            toast({ title: "Error", description: result.message || "Failed to update student.", variant: "destructive"});
          }
        } else {
          const result = await createStudent(studentDataToSave as Omit<Student, 'id'>);
          if (result.success && result.student) {
            toast({
              title: "Student Registered",
              description: `Student "${result.student.firstName} ${result.student.lastName}" has been successfully registered.`,
            });
            form.reset({ studentIdNumber: "", firstName: "", lastName: "", classId: "", dateOfBirth: undefined, gender: "" });
            if (onSuccess) {
              onSuccess();
            } else {
              router.push("/dos/students"); 
            }
          } else {
            toast({
              title: "Error",
              description: result.message || "Failed to register student.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        toast({
          title: "Submission Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="studentIdNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student ID Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., S1001, ADM001" {...field} />
                </FormControl>
                <FormDescription>The official unique ID for the student.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="classId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingClasses}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingClasses ? "Loading classes..." : "Select class"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!isLoadingClasses && classes.map(cls => (
                      <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormDescription>Assign the student to a class.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="dateOfBirth"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Birth (Optional)</FormLabel>
                 <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                    placeholder="Select date of birth"
                  />
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender (Optional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || isLoadingClasses} size="lg">
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : isEditMode ? (
              <Edit3 className="mr-2 h-4 w-4" />
            ) : (
              <UserPlus className="mr-2 h-4 w-4" />
            )}
            {isEditMode ? "Update Student" : "Register Student"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
