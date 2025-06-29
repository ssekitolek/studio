
import PublicLayout from "@/app/(public)/layout";
import SchoolHomePage from "@/app/(public)/page";

/**
 * This page now directly renders the correct public homepage component
 * and wraps it in the public layout to resolve routing conflicts and
 * restore the header/footer.
 */
export default async function Page() {
  return (
      <PublicLayout>
          <SchoolHomePage />
      </PublicLayout>
  )
}
