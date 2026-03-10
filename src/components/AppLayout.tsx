import AppSidebar from './AppSidebar';

const AppLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen">
    <AppSidebar />
    <main className="ml-60 min-h-screen bg-background p-8">
      {children}
    </main>
  </div>
);

export default AppLayout;
