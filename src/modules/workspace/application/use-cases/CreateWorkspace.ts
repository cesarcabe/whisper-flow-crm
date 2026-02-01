import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { ValidationError, InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import { Workspace } from '@/modules/workspace/domain/entities/Workspace';
import { supabase } from '@/integrations/supabase/client';

export interface CreateWorkspaceDTO {
  name: string;
  city?: string;
  state?: string;
  userId: string;
}

export class CreateWorkspaceUseCase {
  async execute(dto: CreateWorkspaceDTO): Promise<Result<Workspace, AppError>> {
    if (!dto.name.trim()) {
      return failure(new ValidationError('Workspace name is required', 'name'));
    }

    if (!dto.userId) {
      return failure(new ValidationError('User ID is required', 'userId'));
    }

    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert({
          name: dto.name.trim(),
          city: dto.city?.trim() || null,
          state: dto.state?.trim() || null,
          created_by: dto.userId,
        })
        .select()
        .single();

      if (error) {
        return failure(new InfrastructureError('Failed to create workspace', error));
      }

      // Create owner membership
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: data.id,
          user_id: dto.userId,
          role: 'owner',
        });

      if (memberError) {
        return failure(new InfrastructureError('Failed to create workspace membership', memberError));
      }

      const workspace = Workspace.create({
        id: data.id,
        name: data.name,
        city: data.city,
        state: data.state,
        createdBy: data.created_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        subscriptionTier: data.subscription_tier,
        subscriptionStatus: data.subscription_status,
        subscriptionEndsAt: data.subscription_ends_at ? new Date(data.subscription_ends_at) : null,
        stripeCustomerId: data.stripe_customer_id,
        stripeSubscriptionId: data.stripe_subscription_id,
      });

      return success(workspace);
    } catch (error) {
      return failure(new InfrastructureError('Unexpected error creating workspace', error));
    }
  }
}
