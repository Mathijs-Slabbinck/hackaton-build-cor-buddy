import { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  action?: ReactNode;
}

const PageHeader = ({ title, subtitle, action }: PageHeaderProps) => (
  <div className="flex items-start justify-between mb-6">
    <div>
      <h1 className="text-[28px] font-bold text-foreground">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
    {action}
  </div>
);

export default PageHeader;
