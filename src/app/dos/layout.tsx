import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DosSidebar } from "@/components/layout/DosSidebar";
import { AppHeader } from "@/components/layout/AppHeader";

export default function DosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <DosSidebar />
      <SidebarInset className="flex flex-col min-h-screen">
        <AppHeader userName="Admin D.O.S." userRole="D.O.S." />
        <main className="flex-1 p-4 md:p-6 lg:p-8 bg-background">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
