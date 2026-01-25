import { KanbanView } from '@/components/kanban/KanbanView';
import { Helmet } from 'react-helmet-async';

const LeadsClientes = () => {
  return (
    <>
      <Helmet>
        <title>Leads e Clientes - New Flow CRM</title>
        <meta name="description" content="Gerencie seus leads e clientes com visualização em Kanban." />
      </Helmet>
      <KanbanView />
    </>
  );
};

export default LeadsClientes;
