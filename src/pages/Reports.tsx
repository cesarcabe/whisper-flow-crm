import { ReportsPage } from '@/modules/reports';
import { Helmet } from 'react-helmet-async';

const Reports = () => {
  return (
    <>
      <Helmet>
        <title>Relatórios - New Flow CRM</title>
        <meta name="description" content="Visualize relatórios e métricas do seu CRM. Acompanhe o volume de mensagens e conversões." />
      </Helmet>
      <ReportsPage />
    </>
  );
};

export default Reports;
