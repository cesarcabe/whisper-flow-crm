import { DashboardPage } from '@/modules/dashboard';
import { Helmet } from 'react-helmet-async';

const Dashboard = () => {
  return (
    <>
      <Helmet>
        <title>Dashboard - CRM WhatsApp</title>
        <meta name="description" content="Visão geral do seu CRM. Acompanhe novos leads, mensagens não lidas e o status do seu pipeline." />
      </Helmet>
      <DashboardPage />
    </>
  );
};

export default Dashboard;
