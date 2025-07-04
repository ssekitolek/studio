'use client'; 

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { AlertTriangle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
       <PageHeader
        title="Something Went Wrong"
        description="We're sorry, but an unexpected error occurred while loading this page."
        icon={AlertTriangle}
      />
      <div className="mt-8 text-center">
        <p className="text-muted-foreground mb-4">You can try to load the page again.</p>
        <Button onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
