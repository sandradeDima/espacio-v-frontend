
'use client';

import DashboardShell from '@/components/DashboardShell';
import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { MensajeApi } from '@/types/api';
import { Cliente } from '@/types/client';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { ClientSearchPagination } from '@/types/apiResponses/clientSearchPagination';

type SortField = 'nombre' | 'created_at';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const LA_PAZ_TIMEZONE = 'America/La_Paz';

export default function ClientesPage() {
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filters, setFilters] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [sortField, setSortField] = useState<SortField>('nombre');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingClient, setDeletingClient] = useState(false);
  const [editError, setEditError] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { isLoading, isAuthenticated, accessToken } = useAuth();
  const api = useApi();
  const fetchClients = useCallback(async () => {
    if (isLoading || !isAuthenticated || !accessToken) {
      return;
    }

    setSearchLoading(true);
    setErrorMessage(null);
    try {
      const query = new URLSearchParams({
        page: String(page),
        size: String(size),
        nombre: appliedFilters.nombre,
        email: appliedFilters.email,
        telefono: appliedFilters.telefono,
        sortField,
        sortOrder: sortDirection,
      });

      const response = await api.get<MensajeApi<ClientSearchPagination>>(
        `/api/clientes/search-pagination?${query.toString()}`
      );

      const clientsData =
        response?.data?.clients ??
        (response?.data as { clientes?: Cliente[] })?.clientes ??
        [];
      setClientes(clientsData);
      setTotal(response?.data?.total ?? clientsData.length);
      setPages(response?.data?.pages ?? (clientsData.length ? 1 : 0));
    } catch (error) {
      console.log(error);
      setErrorMessage('No pudimos cargar los clientes. Intenta nuevamente.');
    } finally {
      setSearchLoading(false);
    }
  }, [
    accessToken,
    api,
    appliedFilters.email,
    appliedFilters.nombre,
    appliedFilters.telefono,
    isAuthenticated,
    isLoading,
    page,
    size,
    sortDirection,
    sortField,
  ]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFilterSubmit = (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    setPage(1);
    setAppliedFilters({ ...filters });
  };

  const handleSortFieldChange = (value: SortField) => {
    setSortField(value);
    setPage(1);
  };

  const toggleSortDirection = () => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage === page || nextPage < 1 || nextPage > pages) {
      return;
    }
    setPage(nextPage);
  };

  const handlePageSizeChange = (value: number) => {
    setSize(value);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (pages <= 1) {
      return [];
    }

    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    const end = Math.min(pages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [page, pages]);

  const startItem = useMemo(() => {
    if (!total) {
      return 0;
    }
    return (page - 1) * size + 1;
  }, [page, size, total]);

  const endItem = useMemo(() => {
    if (!total) {
      return 0;
    }
    return Math.min(page * size, total);
  }, [page, size, total]);

  const formatDate = (date: string) => {
    try {
      const parsedDate = new Date(date);
      if (Number.isNaN(parsedDate.getTime())) return date;
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: LA_PAZ_TIMEZONE,
      }).format(parsedDate);
    } catch {
      return date;
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({ nombre: '', email: '', telefono: '' });
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleSubmitCrearModal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingClient(true);
    setCreateError('');
    try {
      const payload = {
        ...createForm,
        email: createForm.email.trim() || null,
        telefono: onlyDigits(createForm.telefono),
      };
      await api.post<MensajeApi<Cliente>>('/api/clientes/', payload);
      setCreateModalOpen(false);
      setToastMessage('Cliente creado con éxito');
      setTimeout(() => setToastMessage(null), 3000);
      if (page === 1) {
        fetchClients();
      } else {
        setPage(1);
      }
    } catch (error) {
      console.error('Error creating client:', error);
      setCreateError('No pudimos crear el cliente. Intenta nuevamente.');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleEdit = (client: Cliente) => {
    setSelectedClient(client);
    setEditForm({
      nombre: client.nombre ?? '',
      email: client.email ?? '',
      telefono: client.telefono ?? '',
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleDelete = (client: Cliente) => {
    setSelectedClient(client);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleSubmitEditarModal = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedClient) return;
    
    setSavingEdit(true);
    setEditError('');
    try {
      const payload = {
        ...selectedClient,
        ...editForm,
        email: editForm.email.trim() || null,
        telefono: onlyDigits(editForm.telefono),
      };
      const response = await api.put<MensajeApi<Cliente>>(
        `/api/clientes/${selectedClient.id}`,
        payload
      );
      
      if (response?.data) {
        setEditModalOpen(false);
        setSelectedClient(null);
        setToastMessage('Cliente actualizado con éxito');
        setTimeout(() => setToastMessage(null), 3000);
        fetchClients();
      }
    } catch (error) {
      console.error('Error updating client:', error);
      setEditError('Error al actualizar el cliente. Intenta nuevamente.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedClient) return;
    
    setDeletingClient(true);
    setDeleteError('');
    try {
      await api.delete<MensajeApi<null>>(`/api/clientes/${selectedClient.id}`);
      setDeleteModalOpen(false);
      setSelectedClient(null);
      setToastMessage('Cliente eliminado correctamente');
      setTimeout(() => setToastMessage(null), 3000);
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      setDeleteError('No pudimos eliminar el cliente. Intenta nuevamente.');
    } finally {
      setDeletingClient(false);
    }
  };

  return (
    <DashboardShell>
      <section className="min-h-[70vh] w-full">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-[#9AA0A6]">Gestión</p>
              <h1 className="text-3xl font-bold text-[#333333]">Clientes</h1>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="w-full rounded-xl bg-[#fcd34f] px-5 py-3 text-center text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722] sm:w-auto"
            >
              Agregar Cliente
            </button>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <form onSubmit={handleFilterSubmit} className="flex flex-col gap-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="nombre" className="text-sm font-medium text-[#666666]">
                    Buscar por nombre
                  </label>
                  <input
                    id="nombre"
                    value={filters.nombre}
                    onChange={(event) => handleFilterChange('nombre', event.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-[#666666]">
                    Buscar por email
                  </label>
                  <input
                    id="email"
                    type="text"
                    value={filters.email}
                    onChange={(event) => handleFilterChange('email', event.target.value)}
                    placeholder="usuario@correo.com"
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="telefono" className="text-sm font-medium text-[#666666]">
                    Buscar por teléfono
                  </label>
                  <input
                    id="telefono"
                    value={filters.telefono}
                    onChange={(event) => handleFilterChange('telefono', onlyDigits(event.target.value))}
                    placeholder="+52 123 456 7890"
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-[#999999]">
                  Presiona Enter o usa el botón para aplicar la búsqueda. Siempre te mostraremos la primera página.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ nombre: '', email: '', telefono: '' });
                      setAppliedFilters({ nombre: '', email: '', telefono: '' });
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-transparent px-4 py-2 text-sm font-semibold text-[#666666] transition hover:border-[#E0E3E7] sm:w-auto"
                  >
                    Limpiar
                  </button>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-[#fcd34f] px-6 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722] sm:w-auto"
                  >
                    Buscar
                  </button>
                </div>
              </div>
            </form>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            <div className="flex flex-col gap-4 pb-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-[#333333]">
                  {total ? `Resultados: ${total}` : 'Sin resultados'}
                </p>
                <p className="text-xs text-[#999999]">
                  {total ? `Mostrando ${startItem} - ${endItem}` : 'Intenta ajustar los filtros de búsqueda.'}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end lg:items-center">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                  <label htmlFor="pageSize" className="text-xs font-medium text-[#666666]">
                    Resultados por página
                  </label>
                  <select
                    id="pageSize"
                    value={size}
                    onChange={(event) => handlePageSizeChange(Number(event.target.value))}
                    className="rounded-xl border border-[#E0E3E7] px-3 py-2 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f] sm:ml-2"
                  >
                    {PAGE_SIZE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                    <label htmlFor="sortField" className="text-xs font-medium text-[#666666]">
                      Ordenar por
                    </label>
                    <select
                      id="sortField"
                      value={sortField}
                      onChange={(event) => handleSortFieldChange(event.target.value as SortField)}
                      className="rounded-xl border border-[#E0E3E7] px-4 py-2 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                    >
                      <option value="nombre">Nombre</option>
                      <option value="created_at">Fecha de creación</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={toggleSortDirection}
                    className="rounded-xl border border-[#E0E3E7] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:border-[#fcd34f]"
                  >
                    {sortDirection === 'asc' ? 'Ascendente' : 'Descendente'}
                  </button>
                </div>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                {errorMessage}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F1F3F4] text-xs uppercase tracking-wide text-[#9AA0A6]">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Teléfono</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                    {!searchLoading && clientes.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#666666]">
                        No encontramos clientes con los criterios seleccionados.
                      </td>
                    </tr>
                  )}

                  {searchLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center">
                        <div className="inline-flex items-center gap-3 text-sm text-[#666666]">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B42] border-t-transparent" />
                          Cargando clientes...
                        </div>
                      </td>
                    </tr>
                  )}

                  {!searchLoading && 
                    clientes.map((client) => (
                      <tr key={client.id} className="border-b border-[#F7F7F7] text-[#333333]">
                        <td className="px-4 py-4 font-medium">{client.nombre}</td>
                        <td className="px-4 py-4">{client.email || 'N/A'}</td>
                        <td className="px-4 py-4">{client.telefono || 'N/A'}</td>
                        <td className="px-4 py-4 text-sm text-[#666666]">{formatDate(client.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(client)}
                              className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition hover:border-[#fcd34f]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(client)}
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

            {pages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3 border-t border-[#F1F3F4] pt-4 md:flex-row md:justify-between">
                <div className="text-xs text-[#666666]">
                  Página {page} de {pages}
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-[#333333] transition enabled:hover:border-[#1A2B42] disabled:opacity-40"
                  >
                    Anterior
                  </button>

                  {pageNumbers.map((pageNumber) => (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => handlePageChange(pageNumber)}
                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                        pageNumber === page
                          ? 'bg-[#fcd34f] text-[#0B0B0D]'
                          : 'border border-[#E0E3E7] text-[#0B0B0D] hover:border-[#fcd34f]'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === pages}
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

      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-[#0B0B0D] px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {toastMessage}
        </div>
      )}

      {createModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E0E3E7] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Nuevo cliente</p>
                <h3 className="text-xl font-semibold text-[#1A2B42]">Agregar cliente</h3>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-lg p-2 text-[#666666] transition hover:bg-[#f7f3eb]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCrearModal} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[#333333]" htmlFor="create-nombre">
                    Nombre
                  </label>
                  <input
                    id="create-nombre"
                    value={createForm.nombre}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, nombre: event.target.value }))
                    }
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[#333333]" htmlFor="create-email">
                    Email
                  </label>
                  <input
                    id="create-email"
                    type="email"
                    value={createForm.email}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-sm font-semibold text-[#333333]" htmlFor="create-telefono">
                    Teléfono
                  </label>
                  <input
                    id="create-telefono"
                    inputMode="numeric"
                    pattern="\d*"
                    value={createForm.telefono}
                    onChange={(event) =>
                      setCreateForm((prev) => ({ ...prev, telefono: onlyDigits(event.target.value) }))
                    }
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
              </div>

              {createError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {createError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb] sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingClient}
                  className="w-full rounded-lg bg-[#fcd34f] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722] disabled:opacity-60 sm:w-auto"
                >
                  {creatingClient ? 'Guardando...' : 'Crear cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editModalOpen && selectedClient && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E0E3E7] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Editar cliente</p>
                <h3 className="text-xl font-semibold text-[#1A2B42]">{selectedClient.nombre}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setSelectedClient(null);
                }}
                className="rounded-lg p-2 text-[#666666] transition hover:bg-[#F5F7FA]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitEditarModal} className="space-y-4 px-6 py-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-nombre">
                    Nombre
                  </label>
                  <input
                    id="edit-nombre"
                    value={editForm.nombre}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, nombre: event.target.value }))
                    }
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-email">
                    Email
                  </label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editForm.email}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, email: event.target.value }))
                    }
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-telefono">
                    Teléfono
                  </label>
                  <input
                    id="edit-telefono"
                    inputMode="numeric"
                    pattern="\d*"
                    value={editForm.telefono}
                    onChange={(event) =>
                      setEditForm((prev) => ({ ...prev, telefono: onlyDigits(event.target.value) }))
                    }
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
                  />
                </div>
              </div>

              {editError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {editError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditModalOpen(false);
                    setSelectedClient(null);
                  }}
                  className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb] sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="w-full rounded-lg bg-[#fcd34f] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722] disabled:opacity-60 sm:w-auto"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModalOpen && selectedClient && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E0E3E7] px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-[#9AA0A6]">Eliminar cliente</p>
                <h3 className="text-xl font-semibold text-[#1A2B42]">Confirmar acción</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="rounded-lg p-2 text-[#666666] transition hover:bg-[#F5F7FA]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <p className="text-sm text-[#333333]">
                ¿Estás seguro que quieres eliminar a{' '}
                <span className="font-semibold text-[#1A2B42]">{selectedClient.nombre}</span>?
                Esta acción no se puede deshacer.
              </p>

              {deleteError && (
                <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb] sm:w-auto"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deletingClient}
                  className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto"
                >
                  {deletingClient ? 'Eliminando...' : 'Eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  );
}
