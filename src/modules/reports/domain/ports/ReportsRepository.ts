/**
 * Reports Repository Port
 * Interface for reports data access
 */
import type { ReportFilter, ReportPagination } from '../entities/ReportFilter';
import type { MessageKpis, MessageTimeseriesPoint, MessageReportTableResult } from '../entities/MessageReportData';
import type { AdKpis, AdTimeseriesPoint, TopAdData, AdReportTableResult } from '../entities/AdReportData';

export interface ReportsRepository {
  // Message Reports (non-ad)
  getMessageKpis(filter: ReportFilter): Promise<MessageKpis>;
  getMessageTimeseries(filter: ReportFilter): Promise<MessageTimeseriesPoint[]>;
  getMessageTable(filter: ReportFilter, pagination: ReportPagination): Promise<MessageReportTableResult>;
  
  // Ad Reports
  getAdKpis(filter: ReportFilter): Promise<AdKpis>;
  getAdTimeseries(filter: ReportFilter): Promise<AdTimeseriesPoint[]>;
  getTopAds(filter: ReportFilter, limit?: number): Promise<TopAdData[]>;
  getAdTable(filter: ReportFilter, pagination: ReportPagination): Promise<AdReportTableResult>;
}
