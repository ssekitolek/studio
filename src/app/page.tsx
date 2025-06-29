
import SchoolHomePage from "@/app/(public)/page";

/**
 * This page now directly renders the correct public homepage component
 * to resolve the routing conflict that was causing a blank screen.
 */
export default function Page() {
  return <SchoolHomePage />;
}
