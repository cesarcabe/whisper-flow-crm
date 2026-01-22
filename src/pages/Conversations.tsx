import { CRMLayout } from '@/components/crm/CRMLayout';
import { Helmet } from 'react-helmet-async';

const Conversations = () => {
  return (
    <>
      <Helmet>
        <title>Conversas - New Flow CRM</title>
        <meta name="description" content="Gerencie suas conversas do WhatsApp. Visualize e responda mensagens em tempo real." />
      </Helmet>
      <CRMLayout />
    </>
  );
};

export default Conversations;
