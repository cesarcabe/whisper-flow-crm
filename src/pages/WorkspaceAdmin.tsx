import { ArrowLeft, Settings, Users, Smartphone, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { WorkspaceMembersList } from '@/components/workspace/WorkspaceMembersList';
import { WhatsappSettingsTab } from '@/components/whatsapp/WhatsappSettingsTab';
import { WorkspaceSettingsTab } from '@/components/workspace/WorkspaceSettingsTab';

export default function WorkspaceAdmin() {
  const { workspace } = useWorkspace();

  return (
    <>
      <Helmet>
        <title>Configurações - {workspace?.name || 'New Flow CRM'}</title>
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
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Geral
              </TabsTrigger>
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Membros
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            </TabsList>
            <TabsContent value="settings">
              <WorkspaceSettingsTab />
            </TabsContent>
            <TabsContent value="members">
              <WorkspaceMembersList />
            </TabsContent>
            <TabsContent value="whatsapp">
              <WhatsappSettingsTab />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}