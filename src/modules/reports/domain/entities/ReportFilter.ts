/**
 * Report Filter Entity
 * Defines the filtering criteria for report queries
 */
export interface ReportFilter {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  periodLabel?: string;
}

export interface ReportPagination {
  page: number;
  pageSize: number;
}

export type PeriodPreset = 'today' | '7days' | '30days' | 'thisMonth' | 'custom';

export function getDateRangeFromPreset(preset: PeriodPreset, customStart?: Date, customEnd?: Date): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  
  switch (preset) {
    case 'today':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0),
        endDate
      };
    case '7days':
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      return {
        startDate: new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0),
        endDate
      };
    case '30days':
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
      return {
        startDate: new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0),
        endDate
      };
    case 'thisMonth':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
        endDate
      };
    case 'custom':
      return {
        startDate: customStart || endDate,
        endDate: customEnd || endDate
      };
  }
}
