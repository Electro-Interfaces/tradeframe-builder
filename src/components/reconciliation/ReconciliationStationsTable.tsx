/**
 * Таблица станций с разбивкой по топливу и сменам
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import type {
  ReconciliationByStation,
  ReconciliationTransaction,
  ReconciliationTransactionStatus
} from '@/types/reconciliation';
import { formatDate, formatDateTime, formatDiff, hasDiff, getStatusColorClass, getStatusText } from './reconciliationUtils';

interface ReconciliationStationsTableProps {
  filteredByStation: ReconciliationByStation[];
  transactions: ReconciliationTransaction[];
  expandedStations: Set<number>;
  expandedShifts: Set<string>;
  onToggleStation: (stationId: number) => void;
  onToggleShift: (key: string) => void;
}

function StatusBadge({ status }: { status: ReconciliationTransactionStatus }) {
  return (
    <Badge className={`${getStatusColorClass(status)} text-white`}>
      {getStatusText(status)}
    </Badge>
  );
}

export function ReconciliationStationsTable({
  filteredByStation,
  transactions,
  expandedStations,
  expandedShifts,
  onToggleStation,
  onToggleShift
}: ReconciliationStationsTableProps) {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="py-3">
        <CardTitle className="text-white text-sm flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          По станциям и топливу
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Заголовок таблицы станций */}
        <div className="grid grid-cols-[auto_1fr_80px_80px_80px_80px_80px_60px] gap-2 px-3 py-2 text-xs text-slate-400 border-b border-slate-700">
          <div className="w-4"></div>
          <div>Станция</div>
          <div className="text-right">Corp (л)</div>
          <div className="text-right">TF (л)</div>
          <div className="text-right">Смена (л)</div>
          <div className="text-right">Corp-TF</div>
          <div className="text-right">TF-Смена</div>
          <div className="text-center">Статус</div>
        </div>
        <div className="space-y-1 mt-1">
          {filteredByStation.map((station, stationIndex) => {
            const stationCorpVsTf = station.corpLitersTotal - station.tfLitersTotal;
            const stationTfVsShift = station.tfLitersTotal - station.shiftLitersTotal;
            return (
              <div key={`station_${station.stationId}_${stationIndex}`} className="border border-slate-700 rounded-lg overflow-hidden">
                {/* Заголовок станции */}
                <div
                  className={`grid grid-cols-[auto_1fr_80px_80px_80px_80px_80px_60px] gap-2 items-center px-3 py-2 cursor-pointer transition-colors ${
                    station.status === 'error' ? 'bg-red-900/20 hover:bg-red-900/30' : 'bg-slate-700/30 hover:bg-slate-700/50'
                  }`}
                  onClick={() => onToggleStation(station.stationId)}
                >
                  <div className="w-4">
                    {expandedStations.has(station.stationId) ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <div className="text-white font-medium text-sm">{station.stationName}</div>
                  <div className="text-purple-400 text-sm text-right">{station.corpLitersTotal}</div>
                  <div className="text-blue-400 text-sm text-right">{station.tfLitersTotal}</div>
                  <div className="text-green-400 text-sm text-right">{station.shiftLitersTotal}</div>
                  <div className={`text-sm text-right ${hasDiff(stationCorpVsTf) ? 'text-red-400' : 'text-slate-500'}`}>
                    {formatDiff(stationCorpVsTf)}
                  </div>
                  <div className={`text-sm text-right ${hasDiff(stationTfVsShift) ? 'text-red-400' : 'text-slate-500'}`}>
                    {formatDiff(stationTfVsShift)}
                  </div>
                  <div className="text-center">
                    {station.status === 'error' ? (
                      <XCircle className="h-4 w-4 text-red-400 inline" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-green-400 inline" />
                    )}
                  </div>
                </div>

                {/* Топлива станции */}
                {expandedStations.has(station.stationId) && (
                  <div className="border-t border-slate-700">
                    <div className="bg-slate-900/30 p-3">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400 text-xs py-1 w-8"></TableHead>
                            <TableHead className="text-slate-400 text-xs py-1">Топливо</TableHead>
                            <TableHead className="text-slate-400 text-xs py-1 text-right">Corp (л)</TableHead>
                            <TableHead className="text-slate-400 text-xs py-1 text-right">TF (л)</TableHead>
                            <TableHead className="text-slate-400 text-xs py-1 text-right">Смена (л)</TableHead>
                            <TableHead className="text-slate-400 text-xs py-1 text-right">Corp-TF</TableHead>
                            <TableHead className="text-slate-400 text-xs py-1 text-right">TF-Смена</TableHead>
                            <TableHead className="text-slate-400 text-xs py-1 text-center">Статус</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {station.byFuel.map((fuel, fuelIdx) => {
                            const fuelKey = `${station.stationId}_fuel_${fuelIdx}`;
                            const corpVsTfDiff = fuel.corpLitersTotal - fuel.tfLitersTotal;
                            const tfVsShiftDiff = fuel.tfLitersTotal - fuel.shiftLitersTotal;

                            return (
                              <>
                                <TableRow
                                  key={fuelKey}
                                  className={`border-slate-700/50 cursor-pointer hover:bg-slate-800/50 ${
                                    fuel.status === 'error' ? 'bg-red-900/10' : ''
                                  }`}
                                  onClick={() => onToggleShift(fuelKey)}
                                >
                                  <TableCell className="py-1 w-8">
                                    {expandedShifts.has(fuelKey) ? (
                                      <ChevronDown className="h-3 w-3 text-slate-400" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3 text-slate-400" />
                                    )}
                                  </TableCell>
                                  <TableCell className="text-white text-xs py-1 font-medium">{fuel.fuelName}</TableCell>
                                  <TableCell className="text-purple-400 text-xs py-1 text-right">{fuel.corpLitersTotal}</TableCell>
                                  <TableCell className="text-blue-400 text-xs py-1 text-right">{fuel.tfLitersTotal}</TableCell>
                                  <TableCell className="text-green-400 text-xs py-1 text-right">{fuel.shiftLitersTotal}</TableCell>
                                  <TableCell className={`text-xs py-1 text-right ${hasDiff(corpVsTfDiff) ? 'text-red-400' : 'text-slate-500'}`}>
                                    {formatDiff(corpVsTfDiff)}
                                  </TableCell>
                                  <TableCell className={`text-xs py-1 text-right ${hasDiff(tfVsShiftDiff) ? 'text-red-400' : 'text-slate-500'}`}>
                                    {formatDiff(tfVsShiftDiff)}
                                  </TableCell>
                                  <TableCell className="text-center py-1">
                                    {fuel.status === 'error' ? (
                                      <XCircle className="h-3 w-3 text-red-400 inline" />
                                    ) : (
                                      <CheckCircle2 className="h-3 w-3 text-green-400 inline" />
                                    )}
                                  </TableCell>
                                </TableRow>

                                {/* Смены для этого топлива */}
                                {expandedShifts.has(fuelKey) && fuel.byShift.length > 0 && (
                                  <TableRow key={`${fuelKey}_shifts`}>
                                    <TableCell colSpan={8} className="p-0 border-0">
                                      <div className="bg-slate-950/50 pl-8 pr-2 py-2">
                                        <Table>
                                          <TableHeader>
                                            <TableRow className="border-slate-700/50">
                                              <TableHead className="text-slate-500 text-xs py-1">Смена</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1">Дата</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1">Время</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1 text-right">Corp</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1 text-right">TF</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1 text-right">Смена</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1 text-right">Corp-TF</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1 text-right">TF-Смена</TableHead>
                                              <TableHead className="text-slate-500 text-xs py-1 text-center">Статус</TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {fuel.byShift.map((shift) => {
                                              const shiftCorpVsTf = shift.corpLiters - shift.tfLiters;
                                              const shiftTfVsShift = shift.tfLiters - shift.shiftLiters;
                                              const shiftKey = `${station.stationId}-${fuel.fuelName}-${shift.shiftId}`;
                                              return (
                                                <TableRow key={shiftKey} className="border-slate-700/30">
                                                  <TableCell className="text-slate-300 text-xs py-1">
                                                    {shift.shiftId === 0 ? (
                                                      <span className="text-orange-400">Без смены</span>
                                                    ) : (
                                                      `#${shift.shiftId}`
                                                    )}
                                                  </TableCell>
                                                  <TableCell className="text-slate-400 text-xs py-1">{formatDate(shift.shiftDate)}</TableCell>
                                                  <TableCell className="text-slate-500 text-xs py-1">
                                                    {shift.shiftOpenedAt && shift.shiftClosedAt ? (
                                                      `${shift.shiftOpenedAt.substring(11, 16)}—${shift.shiftClosedAt.substring(11, 16)}`
                                                    ) : shift.shiftId === 0 ? '—' : 'открыта'}
                                                  </TableCell>
                                                  <TableCell className="text-purple-400 text-xs py-1 text-right">{shift.corpLiters}</TableCell>
                                                  <TableCell className="text-blue-400 text-xs py-1 text-right">{shift.tfLiters}</TableCell>
                                                  <TableCell className="text-green-400 text-xs py-1 text-right">{shift.shiftLiters}</TableCell>
                                                  <TableCell className={`text-xs py-1 text-right ${hasDiff(shiftCorpVsTf) ? 'text-red-400' : 'text-slate-500'}`}>
                                                    {formatDiff(shiftCorpVsTf)}
                                                  </TableCell>
                                                  <TableCell className={`text-xs py-1 text-right ${hasDiff(shiftTfVsShift) ? 'text-red-400' : 'text-slate-500'}`}>
                                                    {formatDiff(shiftTfVsShift)}
                                                  </TableCell>
                                                  <TableCell className="text-center py-1">
                                                    {shift.status === 'error' ? (
                                                      <XCircle className="h-3 w-3 text-red-400 inline" />
                                                    ) : (
                                                      <CheckCircle2 className="h-3 w-3 text-green-400 inline" />
                                                    )}
                                                  </TableCell>
                                                </TableRow>
                                              );
                                            })}
                                          </TableBody>
                                        </Table>

                                        {/* Транзакции без смены */}
                                        {fuel.byShift.some(s => s.shiftId === 0) && (
                                          <div className="mt-2 pt-2 border-t border-slate-700/50">
                                            <div className="text-xs text-slate-500 mb-1">Транзакции без привязки к смене:</div>
                                            {transactions
                                              .filter(tx => tx.stationId === station.stationId && tx.shiftId === null && tx.fuelType === fuel.fuelName)
                                              .map(tx => (
                                                <div key={tx.id} className="flex items-center gap-4 text-xs py-0.5">
                                                  <span className="text-slate-400 w-24">{formatDateTime(tx.date)}</span>
                                                  <span className="text-slate-500 font-mono w-32 truncate">{tx.cardNumber || '—'}</span>
                                                  <span className="text-purple-400 w-16 text-right">{tx.corpLiters ?? '—'}</span>
                                                  <span className="text-blue-400 w-16 text-right">{tx.tfLiters ?? '—'}</span>
                                                  <StatusBadge status={tx.status} />
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )}
                              </>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
