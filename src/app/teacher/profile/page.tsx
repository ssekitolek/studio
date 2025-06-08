
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCircle, Edit3 } from "lucide-react"; // Assuming UserCircle for profile

export default function TeacherProfilePage() {
  // In a real app, fetch teacher data
  const teacher = {
    name: "Jane Doe",
    email: "jane.doe@example.com",
    employeeId: "TCH001",
    subjects: ["Mathematics - Form 1A", "Physics - Form 2B"]
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="View and manage your personal information and settings."
        icon={UserCircle}
        actionButton={
            <Button variant="outline">
                <Edit3 className="mr-2 h-4 w-4" /> Edit Profile
            </Button>
        }
      />
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-xl text-primary">{teacher.name}</CardTitle>
          <CardDescription>Teacher Profile Details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Email Address</h3>
            <p className="text-foreground">{teacher.email}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Employee ID</h3>
            <p className="text-foreground">{teacher.employeeId}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-muted-foreground">Assigned Subjects/Classes</h3>
            {teacher.subjects.length > 0 ? (
                <ul className="list-disc list-inside text-foreground">
                    {teacher.subjects.map(subject => <li key={subject}>{subject}</li>)}
                </ul>
            ) : (
                <p className="text-muted-foreground italic">No subjects currently assigned.</p>
            )}
          </div>
           {/* Add more profile sections here e.g., change password */}
        </CardContent>
      </Card>
       <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="font-headline text-lg text-primary">Account Settings</CardTitle>
        </CardHeader>
        <CardContent>
            <Button variant="secondary" className="w-full sm:w-auto">Change Password</Button>
            {/* More settings can be added here */}
        </CardContent>
      </Card>
    </div>
  );
}
