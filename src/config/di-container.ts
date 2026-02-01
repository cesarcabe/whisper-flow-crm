import type { ContactRepository } from '@/core/ports/repositories/ContactRepository';
import type { ConversationRepository } from '@/core/ports/repositories/ConversationRepository';
import type { MessageRepository } from '@/core/ports/repositories/MessageRepository';
import type { PipelineRepository } from '@/core/ports/repositories/PipelineRepository';
import type { StageRepository } from '@/core/ports/repositories/StageRepository';
import type { IWhatsAppProvider } from '@/modules/conversation/application/ports/IWhatsAppProvider';
import type { DashboardRepository } from '@/modules/dashboard/domain/ports/DashboardRepository';
import type { ReportsRepository } from '@/modules/reports/domain/ports/ReportsRepository';
import type { WorkspaceRepository } from '@/modules/workspace/domain/ports/WorkspaceRepository';

import { SupabaseContactRepository } from '@/infra/supabase/repositories/SupabaseContactRepository';
import { SupabaseConversationRepository } from '@/infra/supabase/repositories/SupabaseConversationRepository';
import { SupabaseMessageRepository } from '@/infra/supabase/repositories/SupabaseMessageRepository';
import { SupabasePipelineRepository } from '@/infra/supabase/repositories/SupabasePipelineRepository';
import { SupabaseStageRepository } from '@/infra/supabase/repositories/SupabaseStageRepository';
import { EvolutionAPIAdapter } from '@/modules/conversation/infrastructure/adapters/EvolutionAPIAdapter';
import { SupabaseDashboardRepository } from '@/modules/dashboard/infrastructure/repositories/SupabaseDashboardRepository';
import { SupabaseReportsRepository } from '@/modules/reports/infrastructure/repositories/SupabaseReportsRepository';
import { SupabaseWorkspaceRepository } from '@/modules/workspace/infrastructure/repositories/SupabaseWorkspaceRepository';

export interface Container {
  contactRepository: ContactRepository;
  conversationRepository: ConversationRepository;
  messageRepository: MessageRepository;
  pipelineRepository: PipelineRepository;
  stageRepository: StageRepository;
  whatsAppProvider: IWhatsAppProvider;
  metricsRepository: DashboardRepository;
  reportsRepository: ReportsRepository;
  workspaceRepository: WorkspaceRepository;
}

let containerInstance: Container | null = null;

export function createContainer(): Container {
  if (containerInstance) return containerInstance;

  containerInstance = {
    contactRepository: new SupabaseContactRepository(),
    conversationRepository: new SupabaseConversationRepository(),
    messageRepository: new SupabaseMessageRepository(),
    pipelineRepository: new SupabasePipelineRepository(),
    stageRepository: new SupabaseStageRepository(),
    whatsAppProvider: new EvolutionAPIAdapter(),
    metricsRepository: new SupabaseDashboardRepository(),
    reportsRepository: new SupabaseReportsRepository(),
    workspaceRepository: new SupabaseWorkspaceRepository(),
  };

  return containerInstance;
}

export function getContainer(): Container {
  if (!containerInstance) {
    return createContainer();
  }
  return containerInstance;
}

export function resetContainer(): void {
  containerInstance = null;
}
