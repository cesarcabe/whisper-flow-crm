import { ArrowLeft, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceMembersList } from '@/components/workspace/WorkspaceMembersList';

export default function WorkspaceAdmin() {
  const { workspace } = useWorkspace();

  return (
    <>
      <Helmet>
        <title>Admin do Workspace - {workspace?.name || 'CRM'}</title>
        <meta name="description" content="Gerencie os membros e configurações do seu workspace." />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
          <div className="container max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link to="/">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    Admin do Workspace
                  </h1>
                  {workspace && (
                    <p className="text-sm text-muted-foreground">{workspace.name}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="container max-w-4xl mx-auto px-4 py-8">
          <WorkspaceMembersList />
        </main>
      </div>
    </>
  );
}
