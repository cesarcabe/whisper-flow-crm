/**
 * Message Table Component
 * Paginated table showing message events
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { MessageReportRow } from '../../domain/entities/MessageReportData';
import { EmptyState } from './EmptyState';

interface MessageTableProps {
  rows: MessageReportRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function MessageTable({
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  loading
}: MessageTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!rows.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Eventos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            title="Nenhum evento" 
            description="Nenhum evento de mensagem no período." 
          />
        </CardContent>
      </Card>
    );
  }

  const formatPhone = (jid: string) => {
    if (!jid) return '-';
    return jid.replace('@s.whatsapp.net', '').replace('@g.us', ' (grupo)');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Eventos Recentes</CardTitle>
        <span className="text-sm text-muted-foreground">
          {totalCount.toLocaleString('pt-BR')} registros
        </span>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Direção</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm">
                    {format(parseISO(row.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.pushName || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatPhone(row.remoteJid)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {row.messageType || 'text'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.status || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.fromMe ? 'secondary' : 'default'} className="text-xs">
                      {row.fromMe ? 'Enviada' : 'Recebida'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4">
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
