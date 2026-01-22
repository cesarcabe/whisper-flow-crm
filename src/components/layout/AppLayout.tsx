import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ConnectedWorkspaceSelector } from "@/modules/workspace/presentation/components/ConnectedWorkspaceSelector";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between gap-4 border-b border-border bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8" />
            </div>
            <div className="flex items-center gap-4">
              <ConnectedWorkspaceSelector />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
