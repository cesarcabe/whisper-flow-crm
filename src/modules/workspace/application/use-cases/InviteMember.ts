import { success, failure } from '@/core/either';
import type { Result } from '@/core/either';
import { ValidationError, InfrastructureError } from '@/core/errors';
import type { AppError } from '@/core/errors';
import { supabase } from '@/integrations/supabase/client';
import type { WorkspaceRole } from '@/modules/workspace/domain/entities/WorkspaceMember';

export interface InviteMemberDTO {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedByUserId: string;
}

export interface InviteMemberResult {
  invitationId: string;
  email: string;
}

export class InviteMemberUseCase {
  async execute(dto: InviteMemberDTO): Promise<Result<InviteMemberResult, AppError>> {
    if (!dto.email.trim()) {
      return failure(new ValidationError('Email is required', 'email'));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(dto.email)) {
      return failure(new ValidationError('Invalid email format', 'email'));
    }

    if (dto.role === 'owner') {
      return failure(new ValidationError('Cannot invite as owner', 'role'));
    }

    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: dto.workspaceId,
          email: dto.email.trim().toLowerCase(),
          role: dto.role,
          invited_by: dto.invitedByUserId,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return failure(new ValidationError('This email has already been invited', 'email'));
        }
        return failure(new InfrastructureError('Failed to create invitation', error));
      }

      return success({
        invitationId: data.id,
        email: data.email,
      });
    } catch (error) {
      return failure(new InfrastructureError('Unexpected error inviting member', error));
    }
  }
}
