import type { LucideIcon } from 'lucide-react';
import type React from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionButton?: React.ReactNode;
}

export function PageHeader({ title, description, icon: Icon, actionButton }: PageHeaderProps) {
  return (
    <div className="mb-6 pb-4 border-b border-border/60">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {Icon && <Icon className="h-8 w-8 text-primary" />}
          <div>
            <h1 className="text-3xl font-headline font-semibold text-primary">{title}</h1>
            {description && <p className="text-muted-foreground mt-1">{description}</p>}
          </div>
        </div>
        {actionButton && <div>{actionButton}</div>}
      </div>
    </div>
  );
}
