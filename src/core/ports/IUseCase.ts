import type { Result } from '@/core/either';
import type { AppError } from '@/core/errors';

export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, AppError>>;
}

export interface IUseCaseNoInput<TOutput> {
  execute(): Promise<Result<TOutput, AppError>>;
}
