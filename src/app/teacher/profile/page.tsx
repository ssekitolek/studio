
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
import { UserCircle, Loader2, KeyRound, Save } from "lucide-react";
import { getAuth, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/lib/firebase";
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
  const { toast } = useToast();
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
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
    if (auth) {
        const unsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                setProfile({
                    name: user.displayName || user.email || 'Teacher',
                    email: user.email || 'No email associated'
                });
            } else {
                setProfile(null);
            }
            setIsLoadingProfile(false);
        });
        return () => unsubscribe();
    } else {
        setIsLoadingProfile(false);
    }
  }, []);

  const onPasswordSubmit = (data: ChangePasswordFormValues) => {
    startPasswordTransition(async () => {
        if (!auth || !auth.currentUser) {
            toast({ title: "Error", description: "Not logged in. Cannot change password.", variant: "destructive" });
            return;
        }

        const user = auth.currentUser;
        const credential = EmailAuthProvider.credential(user.email!, data.currentPassword);
        
        try {
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, data.newPassword);
            toast({ title: "Success", description: "Password updated successfully." });
            passwordForm.reset();
        } catch (error: any) {
            let message = "An error occurred while changing your password.";
            if(error.code === 'auth/wrong-password') {
                message = "The current password you entered is incorrect.";
            }
            console.error("Password change error:", error);
            toast({ title: "Error", description: message, variant: "destructive" });
        }
    });
  };

  if (isLoadingProfile) { 
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
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
