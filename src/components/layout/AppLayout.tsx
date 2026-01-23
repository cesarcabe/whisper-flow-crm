import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { ConnectedWorkspaceSelector } from "@/modules/workspace/presentation/components/ConnectedWorkspaceSelector";
import { useLocation } from "react-router-dom";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const isConversationsRoute = location.pathname.startsWith('/conversations');

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full overflow-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 h-full">
          <header className="h-14 flex-shrink-0 flex items-center justify-between gap-4 border-b border-border bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-8 w-8" />
            </div>
            <div className="flex items-center gap-4">
              <ConnectedWorkspaceSelector />
            </div>
          </header>
          <main className="flex-1 min-h-0 overflow-hidden">
            {isConversationsRoute ? (
              <div className="h-full w-full overflow-hidden">
                {children}
              </div>
            ) : (
              <div className="h-full w-full overflow-auto">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
