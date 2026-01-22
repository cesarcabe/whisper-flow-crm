import { KanbanView } from '@/components/kanban/KanbanView';
import { Helmet } from 'react-helmet-async';

const Kanban = () => {
  return (
    <>
      <Helmet>
        <title>Kanban - New Flow CRM</title>
        <meta name="description" content="Gerencie seus pipelines e estágios de vendas no formato Kanban." />
      </Helmet>
      <KanbanView />
    </>
  );
};

export default Kanban;
