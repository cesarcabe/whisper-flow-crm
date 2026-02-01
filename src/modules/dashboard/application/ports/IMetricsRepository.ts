/**
 * Re-export the dashboard repository port for module-level usage and DI container.
 */
export type { DashboardRepository as IMetricsRepository } from '@/modules/dashboard/domain/ports/DashboardRepository';
export type { DashboardRepository } from '@/modules/dashboard/domain/ports/DashboardRepository';
