'use client';

import DashboardShell from '@/components/DashboardShell';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { MensajeApi } from '@/types/api';
import Link from 'next/link';
import { API_BASE_URL } from '@/app/lib/api/base-url';

type Reporte = {
  id: number | string;
  clienteNombre: string;
  clienteTelefono?: string;
  fecha: string;
  horaServicio?: string;
  coloracion?: string;
  coloracion_desc?: string;
  formula?: string;
  observaciones?: string;
};

type ApiRecord = Record<string, unknown>;

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseCalendarDate = (date: string) => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function ReportesPage() {
  const api = useApi();
  const { isLoading, isAuthenticated, accessToken } = useAuth();

  const [filters, setFilters] = useState({
    cliente: '',
    startDate: '',
    endDate: '',
    coloracion: '',
    formula: '',
  });
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatDate = (date: string, time?: string) => {
    try {
      const parsedDate = parseCalendarDate(date);
      if (!parsedDate) return date;
      const formattedDate = new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
      }).format(parsedDate);
      const timeMatch = time?.match(/^(\d{2}):(\d{2})/);
      const formattedTime = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '';
      return formattedTime ? `${formattedDate}, ${formattedTime}` : formattedDate;
    } catch {
      return date;
    }
  };

  const chipColor = (label?: string) => {
    if (!label) return 'bg-[#F2F4F7] text-[#4B5563]';
    const key = label.toLowerCase();
    if (key.includes('balayage')) return 'bg-[#FFF6E5] text-[#C47A00]';
    if (key.includes('correccion')) return 'bg-[#FFE8E6] text-[#D14343]';
    if (key.includes('tinte')) return 'bg-[#E6F0FF] text-[#1E4FD6]';
    return 'bg-[#ECFDF3] text-[#15803D]';
  };

  const fetchReportes = useCallback(async () => {
    if (isLoading || !isAuthenticated || !accessToken) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.get<MensajeApi<Reporte[]>>('/api/reportes/');
      const raw =
        (response?.data as { reportes?: unknown[] })?.reportes ??
        (response?.data as unknown[]) ??
        [];

      const normalized: Reporte[] = raw.map((item, idx) => {
        const record = isRecord(item) ? item : {};
        const cliente = isRecord(record.cliente) ? record.cliente : null;

        return {
          id:
            (typeof record.id === 'string' || typeof record.id === 'number' ? record.id : undefined) ??
            (typeof record.reporteId === 'string' || typeof record.reporteId === 'number'
              ? record.reporteId
              : undefined) ??
            `reporte-${idx}`,
          clienteNombre:
            (typeof record.clienteNombre === 'string' ? record.clienteNombre : undefined) ??
            (typeof cliente?.nombre === 'string' ? cliente.nombre : undefined) ??
            'Sin nombre',
          clienteTelefono:
            (typeof record.clienteTelefono === 'string' ? record.clienteTelefono : undefined) ??
            (typeof cliente?.telefono === 'string' ? cliente.telefono : undefined) ??
            '',
          fecha:
            (typeof record.fecha === 'string' ? record.fecha : undefined) ??
            (typeof record.fechaServicio === 'string' ? record.fechaServicio : undefined) ??
            (typeof record.createdAt === 'string' ? record.createdAt : undefined) ??
            '',
          horaServicio: typeof record.horaServicio === 'string' ? record.horaServicio : '',
          coloracion:
            (typeof record.coloracion === 'string' ? record.coloracion : undefined) ??
            (typeof record.tipo === 'string' ? record.tipo : undefined) ??
            '',
          formula:
            (typeof record.formula === 'string' ? record.formula : undefined) ??
            (typeof record.detalle === 'string' ? record.detalle : undefined) ??
            '',
          observaciones:
            (typeof record.observaciones === 'string' ? record.observaciones : undefined) ??
            (typeof record.nota === 'string' ? record.nota : undefined) ??
            '',
        };
      });

      setReportes(normalized);
      setPage(1);
    } catch (error) {
      console.error('Error fetching reportes:', error);
      setErrorMessage('No pudimos cargar los reportes. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, api, isAuthenticated, isLoading]);

  useEffect(() => {
    fetchReportes();
  }, [fetchReportes]);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    fetchReportes();
  };

  const handleReset = () => {
    setFilters({ cliente: '', startDate: '', endDate: '', coloracion: '', formula: '' });
    setPage(1);
    fetchReportes();
  };

  useEffect(() => {
    const validIds = new Set(reportes.map((r) => String(r.id)));
    setSelectedIds((prev) => prev.filter((id) => validIds.has(id)));
  }, [reportes]);

  const toggleSelect = (id: Reporte['id']) => {
    const idStr = String(id);
    setSelectedIds((prev) => (prev.includes(idStr) ? prev.filter((v) => v !== idStr) : [...prev, idStr]));
  };

  const toggleSelectAllPage = () => {
    const pageIds = pageData.map((r) => String(r.id));
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleExport = async (documentType: 'pdf' | 'excel', customIds?: (string | number)[]) => {
    setExportError(null);
    const idsSource = customIds ?? selectedIds;
    if (!idsSource.length) {
      setExportError('Selecciona al menos un reporte para exportar.');
      return;
    }
    if (!accessToken) {
      setExportError('No hay sesión activa. Vuelve a iniciar sesión.');
      return;
    }

    const numericIds = idsSource.map((id) => Number(id)).filter((num) => !Number.isNaN(num));
    if (!numericIds.length) {
      setExportError('Los identificadores seleccionados no son válidos.');
      return;
    }

    try {
      setExporting(documentType);
      const res = await fetch(
        `${API_BASE_URL}/api/reportes/generarDocumento`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            reportesIds: numericIds,
            documentType,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo generar el documento.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = documentType === 'pdf' ? 'pdf' : 'xlsx';
      link.href = url;
      link.download = `reportes-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando documento', error);
      setExportError(error instanceof Error ? error.message : 'Error al exportar el documento.');
    } finally {
      setExporting(null);
    }
  };

  const handleDeleteReporte = async (reporte: Reporte) => {
    if (!accessToken) {
      setErrorMessage('No hay sesión activa. Vuelve a iniciar sesión.');
      return;
    }

    const reporteId = String(reporte.id);
    const confirmed = window.confirm(
      `¿Eliminar el reporte de ${reporte.clienteNombre || 'este cliente'}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(reporteId);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/reportes/${reporteId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo eliminar el reporte.');
      }

      setReportes((prev) => prev.filter((item) => String(item.id) !== reporteId));
      setSelectedIds((prev) => prev.filter((id) => id !== reporteId));
    } catch (error) {
      console.error('Error deleting reporte:', error);
      setErrorMessage(error instanceof Error ? error.message : 'No se pudo eliminar el reporte.');
    } finally {
      setDeletingId(null);
    }
  };

  const normalizeText = (value?: string) =>
    value
      ? value
          .toString()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
      : '';

  const filteredReportes = useMemo(() => {
    const startDateObj = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
    const endDateObj = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : null;

    const byCliente = filters.cliente
      ? reportes.filter((r) =>
          normalizeText(`${r.clienteNombre} ${r.clienteTelefono ?? ''}`).includes(
            normalizeText(filters.cliente)
          )
        )
      : reportes;

    const byColoracion = filters.coloracion
      ? byCliente.filter((r) =>
          normalizeText(r.coloracion).includes(normalizeText(filters.coloracion))
        )
      : byCliente;

    const byFormula = filters.formula
      ? byColoracion.filter((r) => normalizeText(r.formula).includes(normalizeText(filters.formula)))
      : byColoracion;

    const byDate = startDateObj || endDateObj
      ? byFormula.filter((r) => {
          const fecha = r.fecha ? parseCalendarDate(r.fecha) : null;
          if (!fecha || Number.isNaN(fecha.getTime())) return false;
          const afterStart = startDateObj ? fecha >= startDateObj : true;
          const beforeEnd = endDateObj ? fecha <= endDateObj : true;
          return afterStart && beforeEnd;
        })
      : byFormula;

    return byDate;
  }, [filters.cliente, filters.coloracion, filters.formula, filters.startDate, filters.endDate, reportes]);

  const coloracionOptions = useMemo(() => {
    const set = new Set<string>();
    reportes.forEach((r) => {
      if (r.coloracion) set.add(r.coloracion);
    });
    return Array.from(set);
  }, [reportes]);

  const pageCount = useMemo(() => {
    if (!filteredReportes.length) return 1;
    return Math.max(1, Math.ceil(filteredReportes.length / size));
  }, [filteredReportes.length, size]);

  const pageData = useMemo(() => {
    const start = (page - 1) * size;
    return filteredReportes.slice(start, start + size);
  }, [filteredReportes, page, size]);

  const startItem = useMemo(() => {
    if (!filteredReportes.length) return 0;
    return (page - 1) * size + 1;
  }, [filteredReportes.length, page, size]);

  const endItem = useMemo(() => {
    if (!filteredReportes.length) return 0;
    return Math.min(page * size, filteredReportes.length);
  }, [filteredReportes.length, page, size]);

  return (
    <>
      <DashboardShell>
        <section className="min-h-[70vh] w-full">
          <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
            <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2">
                <p className="text-sm uppercase tracking-wide text-[#9AA0A6]">Reportes</p>
                <h1 className="text-3xl font-bold text-[#1A2B42]">Reportes de servicios</h1>
                <p className="text-sm text-[#6B7280]">
                  Consulta y filtra los servicios de coloración realizados en el salón.
                </p>
              </div>
              <Link
                href="/registros"
                className="inline-flex items-center gap-2 rounded-xl bg-[#059669] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#047857]"
              >
                + Nuevo registro
              </Link>
            </header>

            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <form onSubmit={handleFilterSubmit} className="flex flex-col gap-6">
                <div className="grid gap-4 lg:grid-cols-5">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#666666]">Cliente</label>
                    <div className="flex items-center gap-2 rounded-xl border border-[#E0E3E7] px-3 py-2">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5 text-[#9AA0A6]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <circle cx="11" cy="11" r="7" />
                        <path d="m16.5 16.5 3 3" />
                      </svg>
                      <input
                        value={filters.cliente}
                        onChange={(e) => handleFilterChange('cliente', e.target.value)}
                        placeholder="Buscar cliente..."
                        className="w-full bg-transparent text-sm text-[#333333] outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#666666]">Desde</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      className="rounded-xl border border-[#E0E3E7] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#666666]">Hasta</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      className="rounded-xl border border-[#E0E3E7] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#666666]">Tipo de coloración</label>
                    <input
                      list="coloracion-options"
                      value={filters.coloracion}
                      onChange={(e) => handleFilterChange('coloracion', e.target.value)}
                      placeholder="Ej. Balayage, Raíz..."
                      className="rounded-xl border border-[#E0E3E7] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                    />
                    <datalist id="coloracion-options">
                      {coloracionOptions.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-[#666666]">Fórmula</label>
                    <input
                      value={filters.formula}
                      onChange={(e) => handleFilterChange('formula', e.target.value)}
                      placeholder="Ej. 7.1 + 20 vol"
                      className="rounded-xl border border-[#E0E3E7] px-3 py-2 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#111827] transition hover:bg-[#f7f3eb]"
                    >
                      Limpiar
                    </button>
                    <button
                      type="submit"
                      className="flex items-center justify-center gap-2 rounded-xl bg-[#fcd34f] px-5 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722]"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="m21 21-6-6" />
                        <circle cx="10" cy="10" r="6" />
                      </svg>
                      Buscar
                    </button>
                  </div>

                  {/* <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleExport('excel')}
                        disabled={exporting === 'excel'}
                        className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition enabled:hover:bg-[#f7f3eb] disabled:opacity-60"
                      >
                        {exporting === 'excel' ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0B0D] border-t-transparent" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M17 2H7a2 2 0 0 0-2 2v16l7-3 7 3V4a2 2 0 0 0-2-2Z" />
                          </svg>
                        )}
                        Exportar Excel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('pdf')}
                        disabled={exporting === 'pdf'}
                        className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition enabled:hover:bg-[#f7f3eb] disabled:opacity-60"
                      >
                        {exporting === 'pdf' ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0B0D] border-t-transparent" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M6 2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                            <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                            <path d="M12 18v-6" />
                            <path d="M9 15h6" />
                          </svg>
                        )}
                        Exportar PDF
                      </button>
                    </div>
                    {exportError && <p className="text-sm text-red-600">{exportError}</p>}
                  </div> */}
                </div>
              </form>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-sm font-semibold text-[#333333]">Resultados</p>
                  <span className="rounded-full bg-[#E9F5FF] px-3 py-1 text-xs font-semibold text-[#1A2B42]">
                    {filteredReportes.length}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleExport('excel')}
                      disabled={exporting === 'excel'}
                      className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition enabled:hover:bg-[#f7f3eb] disabled:opacity-60"
                    >
                      {exporting === 'excel' ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0B0D] border-t-transparent" />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M17 2H7a2 2 0 0 0-2 2v16l7-3 7 3V4a2 2 0 0 0-2-2Z" />
                        </svg>
                      )}
                      Exportar Excel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleExport('pdf')}
                      disabled={exporting === 'pdf'}
                      className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition enabled:hover:bg-[#f7f3eb] disabled:opacity-60"
                    >
                      {exporting === 'pdf' ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0B0D] border-t-transparent" />
                      ) : (
                        <svg
                          viewBox="0 0 24 24"
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M6 2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                          <path d="M12 18v-6" />
                          <path d="M9 15h6" />
                        </svg>
                      )}
                      Exportar PDF
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[#666666]">
                  <label htmlFor="pageSize">Por página</label>
                  <select
                    id="pageSize"
                    value={size}
                    onChange={(e) => {
                      setSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="rounded-lg border border-[#E0E3E7] px-2 py-1 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                  >
                    {PAGE_SIZE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {errorMessage}
                </div>
              )}

              {exportError && (
                <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                  {exportError}
                </div>
              )}

              <div className="space-y-3 md:hidden">
                {loading && (
                  <div className="rounded-xl border border-[#F1F3F4] px-4 py-6 text-center">
                    <div className="inline-flex items-center gap-3 text-sm text-[#666666]">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B42] border-t-transparent" />
                      Cargando reportes...
                    </div>
                  </div>
                )}

                {!loading && pageData.length === 0 && (
                  <div className="rounded-xl border border-[#F1F3F4] px-4 py-6 text-center text-sm text-[#666666]">
                    No encontramos reportes con los filtros aplicados.
                  </div>
                )}

                {!loading &&
                  pageData.map((reporte) => {
                    const reporteId = String(reporte.id);
                    const isDeleting = deletingId === reporteId;
                    return (
                      <article key={reporte.id} className="rounded-xl border border-[#E5E7EB] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#4B5563]">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(reporteId)}
                              onChange={() => toggleSelect(reporte.id)}
                              className="h-4 w-4 rounded border-[#CBD5E1] text-[#1A2B42] focus:ring-[#1A2B42]"
                            />
                            Seleccionar
                          </label>
                          <span className="text-xs text-[#6B7280]">{formatDate(reporte.fecha, reporte.horaServicio)}</span>
                        </div>

                        <div className="mt-3 flex flex-col gap-2">
                          <p className="text-sm font-semibold text-[#1A2B42]">{reporte.clienteNombre}</p>
                          {reporte.clienteTelefono && (
                            <p className="text-xs text-[#6B7280]">{reporte.clienteTelefono}</p>
                          )}
                          <span
                            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${chipColor(
                              reporte.coloracion?.toLowerCase()
                            )}`}
                          >
                            {reporte.coloracion?.toLowerCase() || '—'}
                          </span>
                          <p className="text-xs text-[#4B5563]">{reporte.formula || 'Sin fórmula'}</p>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            href={`/reportes/${reporte.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb]"
                          >
                            Ver detalle
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDeleteReporte(reporte)}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center rounded-lg border border-[#FECACA] px-3 py-2 text-xs font-semibold text-red-700 transition enabled:hover:bg-red-50 disabled:opacity-60"
                          >
                            {isDeleting ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#F1F3F4] text-xs uppercase tracking-wide text-[#9AA0A6]">
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={pageData.length > 0 && pageData.every((r) => selectedIds.includes(String(r.id)))}
                          onChange={toggleSelectAllPage}
                          className="h-4 w-4 rounded border-[#CBD5E1] text-[#1A2B42] focus:ring-[#1A2B42]"
                        />
                      </th>
                      <th className="px-4 py-3">Cliente</th>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Tipo de Coloración</th>
                      <th className="px-4 py-3">Fórmula</th>
                      <th className="px-4 py-3">Observaciones</th>
                      <th className="px-4 py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && pageData.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#666666]">
                          No encontramos reportes con los filtros aplicados.
                        </td>
                      </tr>
                    )}

                    {loading && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center">
                          <div className="inline-flex items-center gap-3 text-sm text-[#666666]">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B42] border-t-transparent" />
                            Cargando reportes...
                          </div>
                        </td>
                      </tr>
                    )}

                    {!loading &&
                      pageData.map((reporte) => {
                        const reporteId = String(reporte.id);
                        const isDeleting = deletingId === reporteId;
                        return (
                          <tr key={reporte.id} className="border-b border-[#F7F7F7] text-[#333333]">
                            <td className="px-4 py-4">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(reporteId)}
                                onChange={() => toggleSelect(reporte.id)}
                                className="h-4 w-4 rounded border-[#CBD5E1] text-[#1A2B42] focus:ring-[#1A2B42]"
                              />
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col">
                                <span className="font-semibold">{reporte.clienteNombre}</span>
                                {reporte.clienteTelefono && (
                                  <span className="text-xs text-[#6B7280]">{reporte.clienteTelefono}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#4B5563]">{formatDate(reporte.fecha, reporte.horaServicio)}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${chipColor(
                                  reporte.coloracion?.toLowerCase()
                                )}`}
                              >
                                {reporte.coloracion?.toLowerCase() || '—'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-[#4B5563]">{reporte.formula || '—'}</td>
                            <td className="px-4 py-4 text-sm text-[#4B5563]">{reporte.observaciones || '—'}</td>
                            <td className="px-4 py-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <Link
                                  href={`/reportes/${reporte.id}`}
                                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb]"
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                  >
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 16v.01" />
                                    <path d="M12 12V8" />
                                  </svg>
                                  Ver detalle
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReporte(reporte)}
                                  disabled={isDeleting}
                                  className="inline-flex items-center gap-2 rounded-lg border border-[#FECACA] px-3 py-2 text-xs font-semibold text-red-700 transition enabled:hover:bg-red-50 disabled:opacity-60"
                                >
                                  {isDeleting ? 'Eliminando...' : 'Eliminar'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {pageCount > 1 && (
                <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#F1F3F4] pt-4 md:flex-row md:justify-between">
                  <div className="text-xs text-[#666666]">
                    Mostrando {startItem} a {endItem} de {reportes.length} resultados
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-[#333333] transition enabled:hover:border-[#1A2B42] disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <span className="text-xs text-[#666666]">
                      Página {page} de {pageCount}
                    </span>
                    <button
                      type="button"
                      disabled={page === pageCount}
                      onClick={() => setPage((prev) => Math.min(pageCount, prev + 1))}
                      className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-[#333333] transition enabled:hover:border-[#1A2B42] disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </DashboardShell>

    </>
  );
}
