'use client';

import { useEffect, useMemo, useState, useCallback, FormEvent } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import Modal from '@/app/components/Modal';
import { MensajeApi } from '@/types/api';

type Coloracion = {
  id: number | string;
  nombre: string;
  descripcion?: string;
  precio?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20];

const formatMoneyInput = (raw: string) => {
  const digitsOnly = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  if (!digitsOnly) return '';
  const padded = digitsOnly.padStart(3, '0');
  const intPart = padded.slice(0, -2);
  const decPart = padded.slice(-2);
  return `${intPart}.${decPart}`;
};

export default function ConfiguracionesPage() {
  const api = useApi();
  const { isLoading, isAuthenticated, accessToken } = useAuth();

  const [coloraciones, setColoraciones] = useState<Coloracion[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);

  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [selected, setSelected] = useState<Coloracion | null>(null);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '' });
  const [saving, setSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const formatDate = (date?: string) => {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(date)
      );
    } catch {
      return date;
    }
  };

  const fetchColoraciones = useCallback(async () => {
    if (isLoading || !isAuthenticated || !accessToken) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const path = search
        ? `/api/coloraciones/search?query=${encodeURIComponent(search)}`
        : '/api/coloraciones/';
      console.log(path);
      const response = await api.get<MensajeApi<Coloracion[]>>(path);
      const data =
        (response?.data as { coloraciones?: Coloracion[] })?.coloraciones ??
        ((response?.data as unknown) as Coloracion[]) ??
        [];
      console.log(data);
      setColoraciones(data);
      setPage(1);
    } catch (error) {
      console.error('Error cargando coloraciones', error);
      setErrorMessage('No pudimos cargar los servicios. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, api, isAuthenticated, isLoading, search]);

  useEffect(() => {
    fetchColoraciones();
  }, [fetchColoraciones]);

  const pageCount = useMemo(() => {
    if (!coloraciones.length) return 1;
    return Math.max(1, Math.ceil(coloraciones.length / size));
  }, [coloraciones.length, size]);

  const pageData = useMemo(() => {
    const start = (page - 1) * size;
    return coloraciones.slice(start, start + size);
  }, [coloraciones, page, size]);

  const startItem = useMemo(() => {
    if (!coloraciones.length) return 0;
    return (page - 1) * size + 1;
  }, [coloraciones.length, page, size]);

  const endItem = useMemo(() => {
    if (!coloraciones.length) return 0;
    return Math.min(page * size, coloraciones.length);
  }, [coloraciones.length, page, size]);

  const openCreate = () => {
    setForm({ nombre: '', descripcion: '', precio: '' });
    setSelected(null);
    setModalMode('create');
  };

  const openEdit = (item: Coloracion) => {
    setSelected(item);
    setForm({
      nombre: item.nombre,
      descripcion: item.descripcion ?? '',
      precio:
        item.precio === null || item.precio === undefined
          ? ''
          : formatMoneyInput(String(item.precio)),
    });
    setModalMode('edit');
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        precio: form.precio.trim() === '' ? null : Number(form.precio),
      };
      if (modalMode === 'create') {
        await api.post<MensajeApi<Coloracion>>('/api/coloraciones/', payload);
        setToastMessage('Servicio creado con éxito');
      } else if (modalMode === 'edit' && selected) {
        await api.put<MensajeApi<Coloracion>>(`/api/coloraciones/${selected.id}`, payload);
        setToastMessage('Servicio actualizado');
      }
      setTimeout(() => setToastMessage(null), 2500);
      setModalMode(null);
      fetchColoraciones();
    } catch (error) {
      console.error('Error guardando servicio', error);
      setErrorMessage('No pudimos guardar el servicio. Intenta nuevamente.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setDeleting(true);
    try {
      await api.delete<MensajeApi<null>>(`/api/coloraciones/${selected.id}`);
      setToastMessage('Servicio eliminado');
      setTimeout(() => setToastMessage(null), 2500);
      setDeleteOpen(false);
      setSelected(null);
      fetchColoraciones();
    } catch (error) {
      console.error('Error eliminando servicio', error);
      setErrorMessage('No pudimos eliminar el servicio. Intenta nuevamente.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardShell>
      <section className="min-h-[70vh] w-full">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
          <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm uppercase tracking-wide text-[#9AA0A6]">Configuraciones</p>
              <h1 className="text-3xl font-bold text-[#1A2B42]">Servicios</h1>
              <p className="text-sm text-[#6B7280]">
                Gestiona las coloraciones y servicios disponibles en tu salón.
              </p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 rounded-xl bg-[#1A2B42] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#223552]"
            >
              + Nuevo servicio
            </button>
          </header>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#666666]">Buscar servicios</label>
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
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Nombre o descripción"
                    className="w-full bg-transparent text-sm text-[#333333] outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    fetchColoraciones();
                  }}
                  className="rounded-xl border border-[#E0E3E7] px-4 py-2 text-sm font-semibold text-[#333333] transition hover:bg-[#F5F7FA]"
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  onClick={fetchColoraciones}
                  className="rounded-xl bg-[#059669] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#047857]"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-[#333333]">Servicios</p>
                <span className="rounded-full bg-[#E9F5FF] px-3 py-1 text-xs font-semibold text-[#1A2B42]">
                  {coloraciones.length}
                </span>
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
              <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F1F3F4] text-xs uppercase tracking-wide text-[#9AA0A6]">
                    <th className="px-4 py-3">ID</th>
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Descripción</th>
                    <th className="px-4 py-3">Precio</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3">Actualizado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && pageData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-[#666666]">
                        No hay servicios. Crea uno nuevo para comenzar.
                      </td>
                    </tr>
                  )}

                  {loading && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center">
                        <div className="inline-flex items-center gap-3 text-sm text-[#666666]">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B42] border-t-transparent" />
                          Cargando servicios...
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    pageData.map((item) => (
                      <tr key={item.id} className="border-b border-[#F7F7F7] text-[#333333]">
                        <td className="px-4 py-4 text-sm text-[#6B7280]">{item.id}</td>
                        <td className="px-4 py-4 font-semibold">{item.nombre}</td>
                        <td className="px-4 py-4 text-sm text-[#4B5563]">
                          {item.descripcion || '—'}
                        </td>
                        <td className="px-4 py-4 text-sm text-[#4B5563]">
                          {item.precio === null || item.precio === undefined ? '—' : `Bs. ${item.precio}`}
                        </td>
                        <td className="px-4 py-4 text-xs text-[#6B7280]">
                          {formatDate(item.createdAt)}
                        </td>
                        <td className="px-4 py-4 text-xs text-[#6B7280]">
                          {formatDate(item.updatedAt)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-[#1A2B42] transition hover:border-[#1A2B42]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setSelected(item);
                                setDeleteOpen(true);
                              }}
                              className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-600"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {pageCount > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#F1F3F4] pt-4 md:flex-row md:justify-between">
                <div className="text-xs text-[#666666]">
                  Mostrando {startItem} a {endItem} de {coloraciones.length} resultados
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

      {modalMode && (
        <Modal
          open={!!modalMode}
          onClose={() => {
            setModalMode(null);
            setSelected(null);
          }}
          title={modalMode === 'create' ? 'Nuevo servicio' : 'Editar servicio'}
        >
          <form className="space-y-4" onSubmit={handleSave}>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="serv-nombre">
                Nombre
              </label>
              <input
                id="serv-nombre"
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                required
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="serv-desc">
                Descripción
              </label>
              <textarea
                id="serv-desc"
                rows={3}
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="serv-precio">
                Precio opcional (Bs.)
              </label>
              <input
                id="serv-precio"
                type="text"
                inputMode="numeric"
                value={form.precio}
                onChange={(e) => setForm((p) => ({ ...p, precio: formatMoneyInput(e.target.value) }))}
                placeholder="0.00"
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setModalMode(null);
                  setSelected(null);
                }}
                className="w-full rounded-lg border border-[#E0E3E7] px-4 py-2 text-sm font-semibold text-[#333333] transition hover:bg-[#F5F7FA] sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-[#1A2B42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#223552] disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Guardando...' : modalMode === 'create' ? 'Crear' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteOpen && selected && (
        <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Eliminar servicio">
          <div className="space-y-4">
            <p className="text-sm text-[#333333]">
              ¿Seguro que deseas eliminar <span className="font-semibold">{selected.nombre}</span>?
              Esta acción no se puede deshacer.
            </p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="w-full rounded-lg border border-[#E0E3E7] px-4 py-2 text-sm font-semibold text-[#333333] transition hover:bg-[#F5F7FA] sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDelete}
                className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-[#1A2B42] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toastMessage}
        </div>
      )}
    </DashboardShell>
  );
}
