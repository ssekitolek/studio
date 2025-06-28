
import SchoolHomePage from './(public)/page';
import PublicLayout from './(public)/layout';

/**
 * This page acts as a wrapper to resolve a routing conflict between
 * `src/app/page.tsx` and `src/app/(public)/page.tsx`.
 * It manually composes the intended homepage with its public layout.
 */
export default async function Page() {
    return (
        <PublicLayout>
            <SchoolHomePage />
        </PublicLayout>
    )
}
