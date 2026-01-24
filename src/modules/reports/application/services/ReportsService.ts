/**
 * Reports Service
 * Coordinates report data retrieval through the repository
 */
import type { ReportsRepository } from '../../domain/ports/ReportsRepository';
import type { ReportFilter, ReportPagination } from '../../domain/entities/ReportFilter';

export class ReportsService {
  constructor(private repository: ReportsRepository) {}

  // Message Reports
  async getMessageKpis(filter: ReportFilter) {
    return this.repository.getMessageKpis(filter);
  }

  async getMessageTimeseries(filter: ReportFilter) {
    return this.repository.getMessageTimeseries(filter);
  }

  async getMessageTable(filter: ReportFilter, pagination: ReportPagination) {
    return this.repository.getMessageTable(filter, pagination);
  }

  // Ad Reports
  async getAdKpis(filter: ReportFilter) {
    return this.repository.getAdKpis(filter);
  }

  async getAdTimeseries(filter: ReportFilter) {
    return this.repository.getAdTimeseries(filter);
  }

  async getTopAds(filter: ReportFilter, limit?: number) {
    return this.repository.getTopAds(filter, limit);
  }

  async getAdTable(filter: ReportFilter, pagination: ReportPagination) {
    return this.repository.getAdTable(filter, pagination);
  }
}
