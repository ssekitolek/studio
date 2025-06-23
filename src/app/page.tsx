import PublicLayout from "./(public)/layout";
import SchoolHomePage from "./(public)/page";
import type { Metadata } from "next";

// We are explicitly setting metadata here because this page is at the root,
// and it won't automatically pick up metadata from other layouts.
export const metadata: Metadata = {
  title: "St. Mbaaga's College Naddangira - Home",
  description: "Welcome to St. Mbaaga's College Naddangira. Nurturing Minds, Building Futures.",
};

export default function Page() {
  // This page is at the root and takes precedence.
  // We manually wrap the homepage content component with the public layout
  // to ensure the correct header and footer are displayed.
  return (
    <PublicLayout>
      <SchoolHomePage />
    </PublicLayout>
  );
}
