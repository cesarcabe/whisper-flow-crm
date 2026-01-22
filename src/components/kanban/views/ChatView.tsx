import { PipelineHeader } from '../PipelineHeader';
import { CRMLayout } from '@/components/crm/CRMLayout';
import type { KanbanView } from '@/hooks/useKanbanState';
import { Tables } from '@/integrations/supabase/types';

type Pipeline = Tables<'pipelines'>;

interface ChatViewProps {
  pipelines: Pipeline[];
  activePipeline: Pipeline | null;
  onSelectPipeline: (pipeline: Pipeline) => void;
  onCreatePipeline: () => void;
  onDeletePipeline: () => void;
  onViewChange: (view: KanbanView) => void;
  currentView: KanbanView;
  userName?: string;
  onSignOut: () => void;
}

export function ChatView({
  pipelines,
  activePipeline,
  onSelectPipeline,
  onCreatePipeline,
  onDeletePipeline,
  onViewChange,
  currentView,
  userName,
  onSignOut,
}: ChatViewProps) {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <PipelineHeader
        pipelines={pipelines}
        activePipeline={activePipeline}
        onSelectPipeline={onSelectPipeline}
        onCreatePipeline={onCreatePipeline}
        onEditPipeline={() => {}}
        onDeletePipeline={onDeletePipeline}
        onViewChange={onViewChange}
        currentView={currentView}
        userName={userName}
        onSignOut={onSignOut}
      />
      <div className="flex-1 min-h-0 overflow-hidden">
        <CRMLayout />
      </div>
    </div>
  );
}
