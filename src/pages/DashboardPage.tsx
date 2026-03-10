import { LayoutDashboard } from 'lucide-react';
import AppLayout from '@/components/AppLayout';
import PageHeader from '@/components/PageHeader';

const DashboardPage = () => (
  <AppLayout>
    <PageHeader title="Dashboard" subtitle="Overview coming soon." />
    <div className="flex flex-col items-center justify-center mt-32">
      <LayoutDashboard size={64} className="text-border mb-4" />
      <p className="text-muted-foreground">Analytics dashboard will appear here</p>
    </div>
  </AppLayout>
);

export default DashboardPage;
