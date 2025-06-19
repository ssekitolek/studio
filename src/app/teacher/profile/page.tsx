
"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { UserCircle, Loader2, AlertTriangle, KeyRound, Save } from "lucide-react";
import { getTeacherProfileData, changeTeacherPassword } from "@/lib/actions/teacher-actions";
import { useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle as UIAlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";


interface TeacherProfile {
  name?: string;
  email?: string;
}

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required."),
  newPassword: z.string().min(6, "New password must be at least 6 characters."),
  confirmNewPassword: z.string().min(6, "Please confirm your new password."),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords do not match.",
  path: ["confirmNewPassword"],
});

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function TeacherProfilePage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [isPasswordPending, startPasswordTransition] = useTransition();

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  useEffect(() => {
    if (!searchParams) {
        setPageError("Could not access URL parameters. Please try reloading or logging in again.");
        setIsLoadingProfile(false);
        toast({ title: "Error", description: "URL parameters unavailable.", variant: "destructive" });
        return;
    }

    const teacherIdFromUrl = searchParams.get("teacherId");

    if (!teacherIdFromUrl || teacherIdFromUrl.trim() === "" || teacherIdFromUrl.toLowerCase() === "undefined") {
      const msg = `Teacher ID invalid or missing from URL (received: '${teacherIdFromUrl}'). Cannot load profile. Please login again.`;
      toast({ title: "Access Denied", description: msg, variant: "destructive" });
      setPageError(msg);
      setCurrentTeacherId(null);
      setIsLoadingProfile(false); 
      return;
    }

    setCurrentTeacherId(teacherIdFromUrl);
    setPageError(null); 
    setIsLoadingProfile(true);

    async function fetchData(validTeacherId: string) {
      try {
        const data = await getTeacherProfileData(validTeacherId);
        if (data) {
          setProfile(data);
        } else {
          const notFoundMsg = `Failed to load profile data or profile not found for ID: ${validTeacherId}. Please contact administration if this persists.`;
          setPageError(notFoundMsg);
          toast({ title: "Profile Not Found", description: notFoundMsg, variant: "destructive" });
        }
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : "An unexpected error occurred.";
        setPageError(errorMsg);
        toast({ title: "Error Loading Profile", description: errorMsg, variant: "destructive" });
      } finally {
        setIsLoadingProfile(false);
      }
    }
    fetchData(teacherIdFromUrl);
  }, [searchParams, toast]); 

  const onPasswordSubmit = (data: ChangePasswordFormValues) => {
    if (!currentTeacherId) {
      toast({ title: "Error", description: "Teacher ID not available. Cannot change password.", variant: "destructive" });
      return;
    }
    startPasswordTransition(async () => {
      const result = await changeTeacherPassword(currentTeacherId, data.currentPassword, data.newPassword);
      if (result.success) {
        toast({ title: "Success", description: result.message });
        passwordForm.reset();
      } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
      }
    });
  };

  if (isLoadingProfile && currentTeacherId) { 
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <UIAlertTitle>Error Loading Profile</UIAlertTitle>
          <AlertDescription>
            {pageError}
            {(!currentTeacherId) && <span> You can try to <Link href="/login/teacher" className="underline">login again</Link>.</span>}
            If the issue persists, contact administration.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!profile && !isLoadingProfile && currentTeacherId) { 
     return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Card className="shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">
            Profile data could not be loaded for Teacher ID: {currentTeacherId}. Please contact D.O.S. if you believe this is an error.
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!currentTeacherId && !isLoadingProfile && !pageError) { 
     return (
      <div className="space-y-6">
        <PageHeader
          title="My Profile"
          description="View your personal information."
          icon={UserCircle}
        />
        <Card className="shadow-md">
          <CardContent className="py-8 text-center text-muted-foreground">
             Teacher ID not found. Please <Link href="/login/teacher" className="underline">login</Link> to view your profile.
          </CardContent>
        </Card>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View your personal information and manage your account settings."
        icon={UserCircle}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary">{profile?.name || "N/A"}</CardTitle>
            <CardDescription>Teacher Profile Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Full Name</h3>
              <p className="text-foreground">{profile?.name || "Not specified"}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
              <p className="text-foreground">{profile?.email || "Not specified"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-primary flex items-center">
              <KeyRound className="mr-2 h-5 w-5" /> Change Password
            </CardTitle>
            <CardDescription>Update your login password.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter your current password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password (min. 6 characters)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm your new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isPasswordPending}>
                    {isPasswordPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Change Password
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
