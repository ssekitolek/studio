
import Image from "next/image";

export default function EmploymentPage() {
  return (
    <div className="animate-fade-in-up">
      <div className="relative h-[30vh] w-full">
        <Image 
          src="https://placehold.co/1920x1080.png" 
          alt="Employment Opportunities" 
          fill 
          className="object-cover" 
          priority 
          data-ai-hint="job interview professional"
        />
        <div className="absolute inset-0 bg-primary/60" />
        <div className="relative z-10 flex h-full flex-col items-center justify-center text-center text-primary-foreground p-4">
          <h1 className="text-4xl md:text-6xl font-headline font-bold">Employment</h1>
          <p className="mt-4 max-w-3xl text-lg text-primary-foreground/90">Join our dedicated team of educators and staff.</p>
        </div>
      </div>
      <div className="container mx-auto px-4 md:px-6 py-16">
        <p className="text-center text-muted-foreground">Content for the Employment page will go here.</p>
      </div>
    </div>
  );
}
