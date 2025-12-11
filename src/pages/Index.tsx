import { CRMLayout } from '@/components/crm/CRMLayout';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>CRM WhatsApp - Gerenciamento de Conversas</title>
        <meta name="description" content="Sistema CRM integrado com WhatsApp para gerenciamento de conversas e contatos. Envie e receba mensagens em tempo real." />
      </Helmet>
      <CRMLayout />
    </>
  );
};

export default Index;
