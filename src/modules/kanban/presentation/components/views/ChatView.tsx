import { CRMLayout } from '@/components/crm/CRMLayout';

export function ChatView() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 min-h-0 overflow-hidden">
        <CRMLayout />
      </div>
    </div>
  );
}
