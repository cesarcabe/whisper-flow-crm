import { KanbanView } from '@/components/kanban/KanbanView';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>CRM Kanban - Pipelines e WhatsApp</title>
        <meta name="description" content="Sistema CRM com múltiplos pipelines Kanban e integração WhatsApp. Gerencie seus leads e conversas em tempo real." />
      </Helmet>
      <KanbanView />
    </>
  );
};

export default Index;
