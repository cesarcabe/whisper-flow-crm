/**
 * Ad Table Component
 * Paginated table showing ad lead events
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
import { ChevronLeft, ChevronRight, Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AdReportRow } from '../../domain/entities/AdReportData';
import { EmptyState } from './EmptyState';

interface AdTableProps {
  rows: AdReportRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
}

export function AdTable({
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  loading
}: AdTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leads de Anúncios</CardTitle>
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
          <CardTitle>Leads de Anúncios</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState 
            title="Nenhum lead de anúncio" 
            description="Nenhum lead originado de anúncios no período." 
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
        <CardTitle>Leads de Anúncios</CardTitle>
        <span className="text-sm text-muted-foreground">
          {totalCount.toLocaleString('pt-BR')} registros
        </span>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Fonte</TableHead>
                <TableHead>App</TableHead>
                <TableHead>Anúncio</TableHead>
                <TableHead className="text-center">Atribuição</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(parseISO(row.timestamp), 'dd/MM HH:mm', { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {row.pushName || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {formatPhone(row.remoteJid)}
                  </TableCell>
                  <TableCell>
                    {row.conversionSource ? (
                      <Badge variant="outline" className="text-xs">
                        {row.conversionSource}
                      </Badge>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {row.entryPointApp || '-'}
                  </TableCell>
                  <TableCell className="text-sm max-w-[150px] truncate" title={row.adTitle || undefined}>
                    {row.adTitle || row.adSourceId || '-'}
                  </TableCell>
                  <TableCell className="text-center">
                    {row.showAdAttribution ? (
                      <Check className="h-4 w-4 text-primary mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mx-auto" />
                    )}
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
