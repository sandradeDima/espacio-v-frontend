'use client';

import DashboardShell from '@/components/DashboardShell';
import { useAuth } from '@/app/contexts/AuthContext';
import { useCallback, useEffect, useState } from 'react';
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

type FotoReporte = {
  id: number | string;
  filename: string;
};

type ApiRecord = Record<string, unknown>;
type Scalar = string | number;

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getRecord = (record: ApiRecord | null | undefined, key: string) => {
  const value = record?.[key];
  return isRecord(value) ? value : null;
};

const getScalar = (value: unknown): Scalar | undefined =>
  typeof value === 'string' || typeof value === 'number' ? value : undefined;

const getString = (value: unknown): string | undefined => {
  const scalar = getScalar(value);
  return scalar === undefined ? undefined : String(scalar);
};

const getPayloadData = (payload: unknown): unknown => {
  if (!isRecord(payload)) return payload;
  return payload.data ?? payload;
};

const normalizeReporte = (reporte: ApiRecord, fallbackId: string): ReporteDetalle => {
  const cliente = getRecord(reporte, 'cliente');

  return {
    id: getScalar(reporte.id) ?? fallbackId,
    clienteId: getScalar(reporte.clienteId) ?? getScalar(cliente?.id),
    coloracionId: getScalar(reporte.coloracionId) ?? getScalar(getRecord(reporte, 'coloracion')?.id),
    clienteNombre:
      getString(reporte.clienteNombre) ?? getString(cliente?.nombre) ?? 'Sin nombre',
    clienteTelefono: getString(reporte.clienteTelefono) ?? getString(cliente?.telefono) ?? '',
    clienteEmail: getString(reporte.clienteEmail) ?? getString(cliente?.email) ?? '',
    fecha: getString(reporte.fechaServicio) ?? getString(reporte.fecha) ?? '',
    horaServicio: getString(reporte.horaServicio) ?? '',
    coloracion: getString(reporte.coloracion) ?? getString(reporte.tipo) ?? '',
    coloracion_desc: getString(reporte.coloracion_desc) ?? '',
    formula: getString(reporte.formula) ?? getString(reporte.detalle) ?? '',
    observaciones: getString(reporte.observaciones) ?? getString(reporte.nota) ?? '',
    precio: getScalar(reporte.precio),
    createdAt: getString(reporte.createdAt),
    updatedAt: getString(reporte.updatedAt),
  };
};

const normalizeFotoReporte = (foto: unknown, fallbackId: string): FotoReporte | null => {
  if (!isRecord(foto)) return null;
  const id = getScalar(foto.id);
  const filename = getString(foto.filename);
  if (!id || !filename) return null;
  return { id, filename: filename || fallbackId };
};

const parseCalendarDate = (date: string) => {
  const match = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }

  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toDateInputValue = (date?: string) => {
  if (!date) return '';
  const match = date.match(/^\d{4}-\d{2}-\d{2}/);
  if (match) return match[0];

  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '';
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeTimeValue = (time?: string) => {
  if (!time) return '';
  const match = time.match(/^(\d{2}):(\d{2})/);
  return match ? `${match[1]}:${match[2]}` : '';
};

const hasBeenUpdated = (reporte?: Pick<ReporteDetalle, 'createdAt' | 'updatedAt'> | null) => {
  if (!reporte?.updatedAt || !reporte.createdAt) return false;
  const created = new Date(reporte.createdAt).getTime();
  const updated = new Date(reporte.updatedAt).getTime();
  if (Number.isNaN(created) || Number.isNaN(updated)) return false;
  return updated > created;
};

export default function ReporteDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated, accessToken } = useAuth();

  const [detalle, setDetalle] = useState<ReporteDetalle | null>(null);
  const [fotos, setFotos] = useState<FotoReporte[]>([]);
  const [editableFotos, setEditableFotos] = useState<FotoReporte[]>([]);
  const [clientes, setClientes] = useState<{ id: number | string; nombre: string }[]>([]);
  const [coloraciones, setColoraciones] = useState<
    { id: number | string; nombre: string; descripcion?: string; precio?: number | null }[]
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

  const getPhotoSrc = (filename: string) => `${baseUrl}/images/${filename}`;

  const fetchFotos = useCallback(
    async (reporteId: string) => {
      if (!accessToken) return [];
      const res = await fetch(`${baseUrl}/api/fotos-reportes/reporte/${reporteId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No pudimos cargar las fotos del reporte.');
      }
      const payload: unknown = await res.json();
      const data = getPayloadData(payload);
      const records = Array.isArray(data) ? data : [];
      return records
        .map((foto, idx) => normalizeFotoReporte(foto, `foto-${idx}`))
        .filter((foto): foto is FotoReporte => Boolean(foto));
    },
    [accessToken, baseUrl]
  );

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
        const payload: unknown = await res.json();
        const data = getPayloadData(payload);
        const dataRecord = isRecord(data) ? data : null;
        const reporteRecord = getRecord(dataRecord, 'reporte') ?? dataRecord;
        const nextDetalle = reporteRecord ? normalizeReporte(reporteRecord, id) : null;
        if (!nextDetalle) {
          throw new Error('No pudimos leer el detalle del reporte.');
        }
        const nextFotos = await fetchFotos(id);
        setDetalle(nextDetalle);
        setDraft(nextDetalle);
        setFotos(nextFotos);
        setEditableFotos(nextFotos);
      } catch (err) {
        console.error('Detalle reporte error', err);
        setError(err instanceof Error ? err.message : 'No pudimos cargar el detalle.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetalle();
  }, [accessToken, authLoading, baseUrl, fetchFotos, id, isAuthenticated]);

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
          const cPayload: unknown = await clientesRes.json();
          const cData = getPayloadData(cPayload);
          const cRecord = isRecord(cData) ? cData : null;
          const list =
            (Array.isArray(cRecord?.clients) ? cRecord.clients : null) ??
            (Array.isArray(cRecord?.clientes) ? cRecord.clientes : null) ??
            (Array.isArray(cData) ? cData : []);
          setClientes(
            list.map((item, idx) => {
              const c: ApiRecord = isRecord(item) ? item : {};
              const cliente = getRecord(c, 'cliente');
              return {
                id: getScalar(c.id) ?? getScalar(c.clienteId) ?? `cliente-${idx}`,
                nombre:
                  getString(c.nombre) ??
                  getString(c.clienteNombre) ??
                  getString(cliente?.nombre) ??
                  'Sin nombre',
              };
            })
          );
        }

        if (coloracionesRes.ok) {
          const sPayload: unknown = await coloracionesRes.json();
          const sData = getPayloadData(sPayload);
          const sRecord = isRecord(sData) ? sData : null;
          const list =
            (Array.isArray(sRecord?.coloraciones) ? sRecord.coloraciones : null) ??
            (Array.isArray(sData) ? sData : []);
          setColoraciones(
            list
              .map((item, idx) => {
                const record: ApiRecord = isRecord(item) ? item : {};
                const nombre =
                  getString(record.nombre) ?? getString(record.coloracion) ?? getString(record.tipo);
                if (!nombre) return null;
                return {
                  id: getScalar(record.id) ?? getScalar(record.coloracionId) ?? `coloracion-${idx}`,
                  nombre,
                  descripcion: getString(record.descripcion) ?? getString(record.coloracion_desc) ?? '',
                  precio:
                    typeof record.precio === 'number'
                      ? record.precio
                      : typeof record.precio === 'string'
                        ? Number(record.precio)
                        : null,
                };
              })
              .filter(Boolean) as {
                id: number | string;
                nombre: string;
                descripcion?: string;
                precio?: number | null;
              }[]
          );
        }
      } catch (err) {
        console.error('Error cargando listas', err);
      }
    };

    fetchLookups();
  }, [accessToken, authLoading, baseUrl, isAuthenticated]);

  useEffect(() => {
    if (!editable) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editable]);

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

  const formatServiceTime = (time?: string) => {
    if (!time) return '—';
    const normalizedTime = normalizeTimeValue(time);
    return normalizedTime || time;
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
    setEditableFotos(fotos);
    setNewPhotos([]);
    setEditable(true);
    setSaveError(null);
  };

  const handleCancelEdit = () => {
    setEditable(false);
    setSaveError(null);
    setNewPhotos([]);
    setEditableFotos(fotos);
    setDraft(detalle);
  };

  const handleNewPhotosChange = (files: FileList | null) => {
    if (!files) return;
    setNewPhotos((prev) => [...prev, ...Array.from(files)]);
  };

  const handleRemoveNewPhoto = (index: number) => {
    setNewPhotos((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleRemoveExistingPhoto = (photoId: number | string) => {
    setEditableFotos((prev) => prev.filter((foto) => String(foto.id) !== String(photoId)));
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
    const fechaServicioValue = toDateInputValue(draft.fecha ?? detalle?.fecha);
    if (!fechaServicioValue) {
      setSaveError('Selecciona la fecha del servicio.');
      return;
    }
    const horaServicioValue = normalizeTimeValue(draft.horaServicio ?? detalle?.horaServicio);
    if (!horaServicioValue) {
      setSaveError('Selecciona la hora del servicio.');
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
          fechaServicio: fechaServicioValue,
          horaServicio: horaServicioValue,
          formula: draft.formula ?? '',
          observaciones: draft.observaciones ?? '',
          precio: precioNumber,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'No se pudo guardar el reporte.');
      }
      const payload: unknown = await res.json();
      const data = getPayloadData(payload);
      const dataRecord = isRecord(data) ? data : null;
      const updated = getRecord(dataRecord, 'reporte') ?? dataRecord;
      if (!updated) {
        throw new Error('No pudimos leer el reporte actualizado.');
      }
      const selectedColor = coloraciones.find(
        (c) => String(c.id) === String(updated?.coloracionId ?? coloracionIdValue)
      );
      const nextDetalle: ReporteDetalle = {
        id: getScalar(updated.id) ?? id,
        clienteId: getScalar(updated.clienteId) ?? clienteIdValue,
        coloracionId: getScalar(updated.coloracionId) ?? coloracionIdValue,
        clienteNombre:
          getString(updated.clienteNombre) ??
          getString(getRecord(updated, 'cliente')?.nombre) ??
          draft.clienteNombre,
        clienteTelefono:
          getString(updated.clienteTelefono) ??
          getString(getRecord(updated, 'cliente')?.telefono) ??
          draft.clienteTelefono,
        clienteEmail:
          getString(updated.clienteEmail) ??
          getString(getRecord(updated, 'cliente')?.email) ??
          draft.clienteEmail,
        fecha: getString(updated.fechaServicio) ?? getString(updated.fecha) ?? draft.fecha,
        horaServicio: getString(updated.horaServicio) ?? draft.horaServicio,
        coloracion:
          getString(updated.coloracion) ?? getString(updated.tipo) ?? selectedColor?.nombre ?? draft.coloracion,
        coloracion_desc:
          getString(updated.coloracion_desc) ?? selectedColor?.descripcion ?? draft.coloracion_desc,
        formula: getString(updated.formula) ?? getString(updated.detalle) ?? draft.formula,
        observaciones: getString(updated.observaciones) ?? getString(updated.nota) ?? draft.observaciones,
        precio: getScalar(updated.precio) ?? draft.precio,
        createdAt: getString(updated.createdAt) ?? draft.createdAt,
        updatedAt: getString(updated.updatedAt) ?? draft.updatedAt,
      };
      setDetalle(nextDetalle);
      setDraft(nextDetalle);

      const removedFotos = fotos.filter(
        (foto) => !editableFotos.some((editableFoto) => String(editableFoto.id) === String(foto.id))
      );

      for (const foto of removedFotos) {
        const deleteRes = await fetch(`${baseUrl}/api/fotos-reportes/${foto.id}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!deleteRes.ok) {
          const text = await deleteRes.text();
          throw new Error(text || 'Se actualizó el reporte, pero no pudimos eliminar una foto.');
        }
      }

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
      }

      const latestFotos = await fetchFotos(String(id));
      setFotos(latestFotos);
      setEditableFotos(latestFotos);

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
                      {editable ? (
                        <input
                          type="date"
                          value={toDateInputValue(draft?.fecha)}
                          onChange={(e) =>
                            setDraft((prev) => (prev ? { ...prev, fecha: e.target.value } : prev))
                          }
                          className="mt-1 w-full rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42]"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-[#1A2B42]">{formatServiceDate(detalle?.fecha)}</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                      <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Hora</p>
                      {editable ? (
                        <input
                          type="time"
                          value={normalizeTimeValue(draft?.horaServicio)}
                          onChange={(e) =>
                            setDraft((prev) => (prev ? { ...prev, horaServicio: e.target.value } : prev))
                          }
                          className="mt-1 w-full rounded-lg border border-[#E0E3E7] px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#1A2B42]"
                          step="60"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-[#1A2B42]">
                          {formatServiceTime(detalle?.horaServicio)}
                        </p>
                      )}
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
                                precio:
                                  selected?.precio === null || selected?.precio === undefined
                                    ? prev.precio
                                    : selected.precio,
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
                    {hasBeenUpdated(detalle) && (
                      <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FBFF] px-4 py-3">
                        <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Actualizado</p>
                        <p className="text-sm font-semibold text-[#1A2B42]">{formatDate(detalle?.updatedAt)}</p>
                      </div>
                    )}
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

                  <div className="flex flex-col gap-3">
                    <label className="text-sm font-medium text-[#666666]">Evidencia fotográfica</label>
                    <div className="flex flex-wrap gap-3">
                      {editable && (
                        <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-xs font-semibold text-[#6B7280] hover:border-[#1A2B42] hover:text-[#1A2B42]">
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleNewPhotosChange(e.target.files)}
                          />
                          <svg
                            viewBox="0 0 24 24"
                            className="h-8 w-8"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                          </svg>
                          Agregar
                        </label>
                      )}

                      {(editable ? editableFotos : fotos).map((foto) => (
                        <div
                          key={`saved-${foto.id}`}
                          className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[#E0E3E7] bg-white text-xs text-[#6B7280]"
                        >
                          {editable && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExistingPhoto(foto.id)}
                              className="absolute right-1 top-1 z-10 rounded-full bg-white/90 p-1 text-xs font-bold text-[#1A2B42] shadow hover:bg-white"
                              aria-label={`Eliminar imagen ${foto.filename}`}
                            >
                              ×
                            </button>
                          )}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={getPhotoSrc(foto.filename)}
                            alt={foto.filename}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}

                      {editable &&
                        newPhotos.map((file, idx) => (
                          <div
                            key={`new-${file.name}-${idx}`}
                            className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[#E0E3E7] bg-white text-xs text-[#6B7280]"
                          >
                            <button
                              type="button"
                              onClick={() => handleRemoveNewPhoto(idx)}
                              className="absolute right-1 top-1 z-10 rounded-full bg-white/90 p-1 text-xs font-bold text-[#1A2B42] shadow hover:bg-white"
                              aria-label={`Eliminar imagen nueva ${file.name}`}
                            >
                              ×
                            </button>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                    </div>
                    {!editable && fotos.length === 0 && (
                      <p className="text-sm text-[#4B5563]">No hay fotos asociadas.</p>
                    )}
                    {editable && editableFotos.length === 0 && newPhotos.length === 0 && (
                      <p className="text-sm text-[#4B5563]">Agrega fotos o deja el reporte sin imágenes.</p>
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
