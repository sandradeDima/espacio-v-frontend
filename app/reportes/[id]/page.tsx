'use client';

import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/app/contexts/AuthContext';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/app/lib/api/base-url';

type ReporteDetalle = {
  id: number | string;
  clienteId?: number | string;
  coloracionId?: number | string;
  clienteNombre: string;
  clienteTelefono?: string;
  clienteEmail?: string;
  fecha?: string;
  horaServicio?: string;
  coloracion?: string;
  coloracion_desc?: string;
  formula?: string;
  observaciones?: string;
  precio?: string | number;
  createdAt?: string;
  updatedAt?: string;
};

const parseCalendarDate = (date: string) => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function ReporteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, accessToken } = useAuth();

  const [detalle, setDetalle] = useState<ReporteDetalle | null>(null);
  const [fotoNames, setFotoNames] = useState<string[]>([]);
  const [clientes, setClientes] = useState<{ id: number | string; nombre: string }[]>([]);
  const [coloraciones, setColoraciones] = useState<
    { id: number | string; nombre: string; descripcion?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editable, setEditable] = useState(false);
  const [draft, setDraft] = useState<ReporteDetalle | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const baseUrl = API_BASE_URL;

  useEffect(() => {
    const fetchDetalle = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      if (authLoading) return;
      if (!isAuthenticated || !accessToken) {
        setLoading(false);
        setError('No hay sesión activa. Vuelve a iniciar sesión.');
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${baseUrl}/api/reportes/${id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'No pudimos obtener el detalle.');
        }
        const payload = await res.json();
        const data = (payload?.data as any) ?? payload;
        const reporte = (data?.reporte as any) ?? data;
        setDetalle({
          id: reporte?.id ?? id,
          clienteId: reporte?.clienteId ?? reporte?.cliente?.id,
          coloracionId: reporte?.coloracionId ?? reporte?.coloracion?.id,
          clienteNombre: reporte?.clienteNombre ?? reporte?.cliente?.nombre ?? 'Sin nombre',
          clienteTelefono: reporte?.clienteTelefono ?? reporte?.cliente?.telefono ?? '',
          clienteEmail: reporte?.clienteEmail ?? reporte?.cliente?.email ?? '',
          fecha: reporte?.fechaServicio ?? reporte?.fecha ?? reporte?.createdAt ?? '',
          horaServicio: reporte?.horaServicio ?? '',
          coloracion: reporte?.coloracion ?? reporte?.tipo ?? '',
          coloracion_desc: reporte?.coloracion_desc ?? '',
          formula: reporte?.formula ?? reporte?.detalle ?? '',
          observaciones: reporte?.observaciones ?? reporte?.nota ?? '',
          precio: reporte?.precio,
          createdAt: reporte?.createdAt,
          updatedAt: reporte?.updatedAt,
        });
        setDraft({
          id: reporte?.id ?? id,
          clienteId: reporte?.clienteId ?? reporte?.cliente?.id,
          coloracionId: reporte?.coloracionId ?? reporte?.coloracion?.id,
          clienteNombre: reporte?.clienteNombre ?? reporte?.cliente?.nombre ?? 'Sin nombre',
          clienteTelefono: reporte?.clienteTelefono ?? reporte?.cliente?.telefono ?? '',
          clienteEmail: reporte?.clienteEmail ?? reporte?.cliente?.email ?? '',
          fecha: reporte?.fechaServicio ?? reporte?.fecha ?? reporte?.createdAt ?? '',
          horaServicio: reporte?.horaServicio ?? '',
          coloracion: reporte?.coloracion ?? reporte?.tipo ?? '',
          coloracion_desc: reporte?.coloracion_desc ?? '',
          formula: reporte?.formula ?? reporte?.detalle ?? '',
          observaciones: reporte?.observaciones ?? reporte?.nota ?? '',
          precio: reporte?.precio,
          createdAt: reporte?.createdAt,
          updatedAt: reporte?.updatedAt,
        });
        setFotoNames(Array.isArray(data?.fotoNames) ? data.fotoNames : []);
      } catch (err) {
        console.error('Detalle reporte error', err);
        setError(err instanceof Error ? err.message : 'No pudimos cargar el detalle.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
  }, [accessToken, authLoading, baseUrl, id, isAuthenticated]);

  useEffect(() => {
    const fetchLookups = async () => {
      if (authLoading || !isAuthenticated || !accessToken) return;

      try {
        const [clientesRes, coloracionesRes] = await Promise.all([
          fetch(`${baseUrl}/api/clientes/`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }),
          fetch(`${baseUrl}/api/coloraciones/`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            cache: 'no-store',
          }),
        ]);

        if (clientesRes.ok) {
          const cPayload = await clientesRes.json();
          const cData = (cPayload?.data as any) ?? cPayload;
          const list =
            (cData?.clients as any[]) ||
            (cData?.clientes as any[]) ||
            (Array.isArray(cData) ? cData : []);
          setClientes(
            list.map((c: any, idx: number) => ({
              id: c?.id ?? c?.clienteId ?? `cliente-${idx}`,
              nombre: c?.nombre ?? c?.clienteNombre ?? c?.cliente?.nombre ?? 'Sin nombre',
            }))
          );
        }

        if (coloracionesRes.ok) {
          const sPayload = await coloracionesRes.json();
          const sData = (sPayload?.data as any) ?? sPayload;
          const list =
            (sData?.coloraciones as any[]) || (Array.isArray(sData) ? sData : []);
          setColoraciones(
            list
              .map((item: any, idx: number) => {
                const nombre = item?.nombre ?? item?.coloracion ?? item?.tipo;
                if (!nombre) return null;
                return {
                  id: item?.id ?? item?.coloracionId ?? `coloracion-${idx}`,
                  nombre,
                  descripcion: item?.descripcion ?? item?.coloracion_desc ?? '',
                };
              })
              .filter(Boolean) as { id: number | string; nombre: string; descripcion?: string }[]
          );
        }
      } catch (err) {
        console.error('Error cargando listas', err);
      }
    };

    fetchLookups();
  }, [accessToken, authLoading, baseUrl, isAuthenticated]);

  const formatDate = (date?: string) => {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(date));
    } catch {
      return date;
    }
  };

  const formatServiceDate = (date?: string) => {
    if (!date) return '—';
    try {
      const parsedDate = parseCalendarDate(date);
      if (!parsedDate) return date;
      return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(parsedDate);
    } catch {
      return date;
    }
  };

  const handleExport = async (documentType: 'pdf' | 'excel') => {
    setExportError(null);
    if (!id) return;
    if (!accessToken) {
      setExportError('No hay sesión activa. Vuelve a iniciar sesión.');
      return;
    }
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      setExportError('El identificador no es válido.');
      return;
    }
    try {
      setExporting(documentType);
      const res = await fetch(`${baseUrl}/api/reportes/generarDocumento`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          reportesIds: [numericId],
          documentType,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo generar el documento.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const ext = documentType === 'pdf' ? 'pdf' : 'csv';
      link.href = url;
      link.download = `reporte-${id}-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exportando documento', err);
      setExportError(err instanceof Error ? err.message : 'Error al exportar el documento.');
    } finally {
      setExporting(null);
    }
  };

  const handleEditStart = () => {
    if (!detalle) return;
    setDraft(detalle);
    setNewPhotos([]);
    setEditable(true);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditable(false);
    setSaveError(null);
    setNewPhotos([]);
    setDraft(detalle);
  };

  const handleNewPhotosChange = (files: FileList | null) => {
    if (!files) return;
    setNewPhotos((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDeleteReporte = async () => {
    if (!id) return;
    if (!accessToken) {
      setDeleteError('No hay sesión activa. Vuelve a iniciar sesión.');
      return;
    }
    const confirmed = window.confirm('¿Seguro que quieres eliminar este reporte? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${baseUrl}/api/reportes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo eliminar el reporte.');
      }
      router.push('/reportes');
    } catch (err) {
      console.error('Error eliminando reporte', err);
      setDeleteError(err instanceof Error ? err.message : 'No se pudo eliminar el reporte.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!draft || !id) return;
    if (!accessToken) {
      setSaveError('No hay sesión activa. Vuelve a iniciar sesión.');
      return;
    }
    const clienteIdValue = draft.clienteId ?? detalle?.clienteId;
    const coloracionIdValue = draft.coloracionId ?? detalle?.coloracionId;
    if (!clienteIdValue || !coloracionIdValue) {
      setSaveError('Selecciona cliente y servicio.');
      return;
    }
    const precioNumber =
      draft.precio !== undefined && draft.precio !== null && draft.precio !== ''
        ? Number(draft.precio)
        : 0;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`${baseUrl}/api/reportes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          idReporte: Number(draft.id ?? id),
          clienteId: Number(clienteIdValue),
          coloracion: Number(coloracionIdValue),
          formula: draft.formula ?? '',
          observaciones: draft.observaciones ?? '',
          precio: precioNumber,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo guardar el reporte.');
      }
      const payload = await res.json();
      const data = (payload?.data as any) ?? payload;
      const updated = (data?.reporte as any) ?? data;
      const selectedColor = coloraciones.find(
        (c) => String(c.id) === String(updated?.coloracionId ?? coloracionIdValue)
      );
      const nextDetalle: ReporteDetalle = {
        id: updated?.id ?? id,
        clienteId: updated?.clienteId ?? clienteIdValue,
        coloracionId: updated?.coloracionId ?? coloracionIdValue,
        clienteNombre: updated?.clienteNombre ?? updated?.cliente?.nombre ?? draft.clienteNombre,
        clienteTelefono: updated?.clienteTelefono ?? updated?.cliente?.telefono ?? draft.clienteTelefono,
        clienteEmail: updated?.clienteEmail ?? updated?.cliente?.email ?? draft.clienteEmail,
        fecha: updated?.fechaServicio ?? updated?.fecha ?? updated?.createdAt ?? draft.fecha,
        horaServicio: updated?.horaServicio ?? draft.horaServicio,
        coloracion:
          updated?.coloracion ?? updated?.tipo ?? selectedColor?.nombre ?? draft.coloracion,
        coloracion_desc: updated?.coloracion_desc ?? selectedColor?.descripcion ?? draft.coloracion_desc,
        formula: updated?.formula ?? updated?.detalle ?? draft.formula,
        observaciones: updated?.observaciones ?? updated?.nota ?? draft.observaciones,
        precio: updated?.precio ?? draft.precio,
        createdAt: updated?.createdAt ?? draft.createdAt,
        updatedAt: updated?.updatedAt ?? draft.updatedAt,
      };
      setDetalle(nextDetalle);
      setDraft(nextDetalle);

      if (newPhotos.length > 0) {
        const formData = new FormData();
        newPhotos.forEach((file) => formData.append('fotos', file));

        const photosRes = await fetch(`${baseUrl}/api/reportes/${id}/fotos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          body: formData,
        });
        if (!photosRes.ok) {
          const text = await photosRes.text();
          throw new Error(text || 'Se actualizó el reporte, pero no pudimos subir las fotos.');
        }

        const photosPayload = await photosRes.json();
        const photosData = (photosPayload?.data as any) ?? photosPayload;
        const uploadedNames =
          (Array.isArray(photosData?.fotoNames) ? photosData.fotoNames : null) ??
          (Array.isArray(photosData?.fotos)
            ? photosData.fotos.map((foto: { filename?: string }) => foto.filename).filter(Boolean)
            : []);

        if (uploadedNames.length > 0) {
          setFotoNames((prev) => [...prev, ...uploadedNames]);
        }
      }

      setEditable(false);
      setNewPhotos([]);
    } catch (err) {
      console.error('Error guardando reporte', err);
      setSaveError(err instanceof Error ? err.message : 'Error al guardar el reporte.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <section className="min-h-[70vh] w-full">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 pb-8">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6" />
              </svg>
              Volver
            </button>
            <Link
              href="/reportes"
              className="hidden items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb] sm:inline-flex"
            >
              Lista de reportes
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#1A2B42]">Modo edición</span>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={editable}
                  onChange={(e) => (e.target.checked ? handleEditStart() : handleCancelEdit())}
                />
                <div className="peer h-6 w-11 rounded-full bg-[#E5E7EB] after:absolute after:left-1 after:top-1 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:bg-[#1A2B42] peer-checked:after:translate-x-5" />
              </label>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Reporte #{id}</p>
                <h1 className="text-2xl font-bold text-[#1A2B42]">{detalle?.clienteNombre || 'Detalle'}</h1>
                <p className="text-sm text-[#4B5563]">Consulta la información completa del servicio.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleExport('excel')}
                  disabled={exporting === 'excel'}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition enabled:hover:bg-[#f7f3eb] disabled:opacity-60"
                >
                  {exporting === 'excel' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0B0D] border-t-transparent" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 2H7a2 2 0 0 0-2 2v16l7-3 7 3V4a2 2 0 0 0-2-2Z" />
                    </svg>
                  )}
                  Excel
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  disabled={exporting === 'pdf'}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition enabled:hover:bg-[#f7f3eb] disabled:opacity-60"
                >
                  {exporting === 'pdf' ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0B0B0D] border-t-transparent" />
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 2h9l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z" />
                      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      <path d="M12 18v-6" />
                      <path d="M9 15h6" />
                    </svg>
                  )}
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handleDeleteReporte}
                  disabled={deleting}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#FECACA] px-3 py-2 text-xs font-semibold text-red-700 transition enabled:hover:bg-red-50 disabled:opacity-60"
                >
                  {deleting ? 'Eliminando...' : 'Eliminar reporte'}
                </button>
              </div>
            </div>

            {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}
            {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            {loading ? (
              <div className="mt-6 flex items-center gap-3 text-sm text-[#666666]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B42] border-t-transparent" />
                Cargando detalle...
              </div>
            ) : (
              detalle && (
                <div className="mt-6 space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Cliente</p>
                      {editable ? (
                        <select
                          value={draft?.clienteId ?? ''}
                          onChange={(e) =>
                            setDraft((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    clienteId: e.target.value,
                                    clienteNombre:
                                      clientes.find((c) => String(c.id) === e.target.value)?.nombre ??
                                      prev.clienteNombre,
                                  }
                                : prev
                            )
                          }
                          className="mt-1 w-full rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42]"
                        >
                          <option value="">Selecciona cliente</option>
                          {clientes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-semibold text-[#1A2B42]">{detalle.clienteNombre || '—'}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Contacto</p>
                      <p className="text-sm font-semibold text-[#1A2B42]">
                        {[detalle?.clienteTelefono, detalle?.clienteEmail].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Fecha</p>
                      <p className="text-sm font-semibold text-[#1A2B42]">{formatServiceDate(detalle?.fecha)}</p>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Hora</p>
                      <p className="text-sm font-semibold text-[#1A2B42]">{detalle?.horaServicio || '—'}</p>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Servicio</p>
                      {editable ? (
                        <select
                          value={draft?.coloracionId ?? ''}
                          onChange={(e) =>
                            setDraft((prev) => {
                              if (!prev) return prev;
                              const selected = coloraciones.find((c) => String(c.id) === e.target.value);
                              return {
                                ...prev,
                                coloracionId: selected?.id ?? e.target.value,
                                coloracion: selected?.nombre ?? prev.coloracion,
                                coloracion_desc: selected?.descripcion ?? prev.coloracion_desc,
                              };
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42]"
                        >
                          <option value="">Selecciona tipo de Servicio</option>
                          {coloraciones.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <p className="text-sm font-semibold text-[#1A2B42]">{detalle?.coloracion || '—'}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Descripción</p>
                      <p className="text-sm font-semibold text-[#1A2B42]">
                        {editable ? draft?.coloracion_desc || '—' : detalle?.coloracion_desc || '—'}
                      </p>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Precio</p>
                      {editable ? (
                        <input
                          type="number"
                          step="0.01"
                          value={
                            draft?.precio !== undefined && draft?.precio !== null ? String(draft.precio) : ''
                          }
                          onChange={(e) =>
                            setDraft((prev) => (prev ? { ...prev, precio: e.target.value } : prev))
                          }
                          className="mt-1 w-full rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42]"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-[#1A2B42]">
                          {detalle?.precio ? `$${detalle.precio}` : '—'}
                        </p>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Creado</p>
                      <p className="text-sm font-semibold text-[#1A2B42]">{formatDate(detalle?.createdAt)}</p>
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Actualizado</p>
                      <p className="text-sm font-semibold text-[#1A2B42]">{formatDate(detalle?.updatedAt)}</p>
                    </div>
                  </div>

                  <div className="grid gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#666666]">Fórmula</label>
                      <textarea
                        value={editable ? draft?.formula ?? '' : detalle?.formula ?? ''}
                        disabled={!editable}
                        onChange={(e) =>
                          setDraft((prev) => (prev ? { ...prev, formula: e.target.value } : prev))
                        }
                        className="min-h-[72px] rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42] disabled:bg-[#F3F4F6]"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-[#666666]">Observaciones</label>
                      <textarea
                        value={editable ? draft?.observaciones ?? '' : detalle?.observaciones ?? ''}
                        disabled={!editable}
                        onChange={(e) =>
                          setDraft((prev) => (prev ? { ...prev, observaciones: e.target.value } : prev))
                        }
                        className="min-h-[96px] rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42] disabled:bg-[#F3F4F6]"
                      />
                    </div>
                    {editable && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold text-[#666666]">Agregar más fotos</label>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={(e) => handleNewPhotosChange(e.target.files)}
                          className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] file:mr-3 file:rounded-md file:border-0 file:bg-[#EEF2FF] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1A2B42]"
                        />
                        {newPhotos.length > 0 && (
                          <ul className="space-y-1">
                            {newPhotos.map((file, idx) => (
                              <li
                                key={`${file.name}-${idx}`}
                                className="flex items-center justify-between rounded-md bg-[#F5F7FA] px-3 py-2 text-xs text-[#334155]"
                              >
                                <span className="truncate pr-2">{file.name}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveNewPhoto(idx)}
                                  className="rounded border border-[#E5E7EB] px-2 py-1 text-[11px] font-semibold text-[#334155] transition hover:bg-white"
                                >
                                  Quitar
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>

                  {saveError && <p className="text-sm text-red-600">{saveError}</p>}

                  {editable && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-[#1A2B42] px-3 py-2 text-xs font-semibold text-white transition enabled:hover:bg-[#0f1c30] disabled:opacity-60"
                      >
                        {saving ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        ) : (
                          <svg
                            viewBox="0 0 24 24"
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M5 12l5 5L20 7" />
                          </svg>
                        )}
                        Guardar
                      </button>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Fotos</p>
                    {fotoNames.length === 0 ? (
                      <p className="text-sm text-[#4B5563]">No hay fotos asociadas.</p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-4">
                        {fotoNames.map((name) => {
                          const src = `${baseUrl}/images/${name}`;
                          return (
                            <div
                              key={name}
                              className="group relative overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-sm"
                            >
                              <div className="relative h-40 w-full bg-[#F5F7FA]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={src}
                                  alt={name}
                                  className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02]"
                                  loading="lazy"
                                />
                              </div>
                              <div className="flex items-center gap-2 truncate px-3 py-2 text-xs font-semibold text-[#1A2B42]">
                                📎 <span className="truncate">{name}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </section>
    </DashboardShell>
  );
}
