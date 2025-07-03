
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { TeacherLayoutClient } from "./TeacherLayoutClient";

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <TeacherLayoutClient>
        {children}
      </TeacherLayoutClient>
    </Suspense>
  );
}
