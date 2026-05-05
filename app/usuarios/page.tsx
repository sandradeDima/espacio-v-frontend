'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import DashboardShell from '@/components/DashboardShell';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { MensajeApi } from '@/types/api';
import { User } from '@/types/user';
import { UserSearchPagination } from '@/types/apiResponses/userSearchPagination';

type SortField = 'name' | 'email' | 'createdAt';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];
const USERS_BASE = '/api/user';
const ADMIN_ROLE_ID = 2;
const USER_ROLE_ID = 1;

export default function UsuariosPage() {
  const api = useApi();
  const { isAuthenticated, isLoading, user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === ADMIN_ROLE_ID;

  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchLoading, setSearchLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    nombre: '',
    email: '',
    role: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);

  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLE_ID,
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');

  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: USER_ROLE_ID,
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  const [deletingUser, setDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const isStrongPassword = (value: string) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value);

  const fetchUsers = useCallback(async () => {
    if (isLoading || !isAuthenticated) {
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
        role: appliedFilters.role,
        sortField,
        sortOrder: sortDirection,
      });

      const response = await api.get<MensajeApi<UserSearchPagination>>(
        `${USERS_BASE}/search-pagination?${query.toString()}`
      );

      const usersData =
        response?.data?.users ??
        (response as unknown as { users?: User[] })?.users ??
        [];

      setUsers(usersData);
      setTotal(response?.data?.total ?? usersData.length);
      setPages(response?.data?.pages ?? (usersData.length ? 1 : 0));
    } catch (error) {
      console.error('Error loading users', error);
      setErrorMessage('No pudimos cargar los usuarios. Intenta nuevamente.');
    } finally {
      setSearchLoading(false);
    }
  }, [
    api,
    appliedFilters.email,
    appliedFilters.nombre,
    appliedFilters.role,
    isAuthenticated,
    isLoading,
    page,
    size,
    sortDirection,
    sortField,
  ]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
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
    if (nextPage === page || nextPage < 1 || nextPage > pages) return;
    setPage(nextPage);
  };

  const handlePageSizeChange = (value: number) => {
    setSize(value);
    setPage(1);
  };

  const pageNumbers = useMemo(() => {
    if (pages <= 1) return [];

    const maxButtons = 5;
    const half = Math.floor(maxButtons / 2);
    let start = Math.max(1, page - half);
    let end = Math.min(pages, start + maxButtons - 1);

    if (end - start + 1 < maxButtons) {
      start = Math.max(1, end - maxButtons + 1);
    }

    return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
  }, [page, pages]);

  const startItem = useMemo(() => {
    if (!total) return 0;
    return (page - 1) * size + 1;
  }, [page, size, total]);

  const endItem = useMemo(() => {
    if (!total) return 0;
    return Math.min(page * size, total);
  }, [page, size, total]);

  const formatDate = (date?: string) => {
    if (!date) return '—';
    try {
      return new Intl.DateTimeFormat('es-MX', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(date));
    } catch {
      return date;
    }
  };

  const handleOpenCreate = () => {
    setCreateForm({ name: '', email: '', password: '', confirmPassword: '', role: USER_ROLE_ID });
    setCreateError('');
    setCreateModalOpen(true);
  };

  const handleSubmitCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (createForm.password !== createForm.confirmPassword) {
      setCreateError('Las contraseñas no coinciden.');
      return;
    }
    if (!isStrongPassword(createForm.password)) {
      setCreateError('La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.');
      return;
    }
    setCreatingUser(true);
    setCreateError('');
    try {
      const payload = {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        role: Number(createForm.role),
      };
      await api.post<MensajeApi<User>>(`${USERS_BASE}/create-user`, payload);
      setCreateModalOpen(false);
      setToastMessage('Usuario creado con éxito');
      setTimeout(() => setToastMessage(null), 2500);
      if (page === 1) {
        fetchUsers();
      } else {
        setPage(1);
      }
    } catch (error) {
      console.error('Error creating user', error);
      setCreateError('No pudimos crear el usuario. Intenta nuevamente.');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name ?? '',
      email: user.email ?? '',
      password: '',
      confirmPassword: '',
      role: user.role ?? 1,
    });
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSubmitEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;
    if (editForm.password !== editForm.confirmPassword) {
      setEditError('Las contraseñas no coinciden.');
      return;
    }
    if (editForm.password.trim() && !isStrongPassword(editForm.password)) {
      setEditError('La contraseña debe tener al menos 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.');
      return;
    }

    setSavingEdit(true);
    setEditError('');

    try {
      const payload: {
        id: number;
        name: string;
        email: string;
        role: number;
        password?: string;
      } = {
        id: selectedUser.id,
        name: editForm.name,
        email: editForm.email,
        role: Number(editForm.role),
      };
      if (editForm.password.trim()) {
        payload.password = editForm.password;
      }

      await api.put<MensajeApi<User>>(`${USERS_BASE}/update-user`, payload);
      setEditModalOpen(false);
      setSelectedUser(null);
      setToastMessage('Usuario actualizado con éxito');
      setTimeout(() => setToastMessage(null), 2500);
      fetchUsers();
    } catch (error) {
      console.error('Error updating user', error);
      setEditError('No pudimos actualizar el usuario. Intenta nuevamente.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;
    setDeletingUser(true);
    setDeleteError('');
    try {
      await api.delete<MensajeApi<null>>(`${USERS_BASE}/delete-user/${selectedUser.id}`);
      setDeleteModalOpen(false);
      setSelectedUser(null);
      setToastMessage('Usuario eliminado correctamente');
      setTimeout(() => setToastMessage(null), 2500);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user', error);
      setDeleteError('No pudimos eliminar el usuario. Intenta nuevamente.');
    } finally {
      setDeletingUser(false);
    }
  };

  if (!isAdmin) {
    return (
      <DashboardShell>
        <section className="min-h-[60vh] flex items-center justify-center">
          <div className="rounded-2xl bg-white px-8 py-10 shadow-lg max-w-xl text-center">
            <p className="text-lg font-semibold text-[#1F2937]">Acceso restringido</p>
            <p className="text-sm text-[#6B7280] mt-2">
              Solo los administradores pueden gestionar usuarios.
            </p>
          </div>
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <section className="min-h-[70vh] w-full">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-[#9AA0A6]">Gestión</p>
              <h1 className="text-3xl font-bold text-[#333333]">Usuarios</h1>
              <p className="text-sm text-[#6B7280]">Buscar, crear, editar y eliminar usuarios.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              className="w-full rounded-xl bg-[#fcd34f] px-5 py-3 text-center text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722] sm:w-auto"
            >
              Agregar usuario
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
                    onChange={(e) => handleFilterChange('nombre', e.target.value)}
                    placeholder="Ej. Ana López"
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="email" className="text-sm font-medium text-[#666666]">
                    Buscar por email
                  </label>
                  <input
                    id="email"
                    value={filters.email}
                    onChange={(e) => handleFilterChange('email', e.target.value)}
                    placeholder="usuario@correo.com"
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="role" className="text-sm font-medium text-[#666666]">
                    Rol
                  </label>
                  <select
                    id="role"
                    value={filters.role}
                    onChange={(e) => handleFilterChange('role', e.target.value)}
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                  >
                    <option value="">Todos</option>
                    <option value={ADMIN_ROLE_ID}>Administrador</option>
                    <option value={USER_ROLE_ID}>Usuario</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <p className="text-xs text-[#999999]">
                  Presiona Enter o usa el botón para aplicar la búsqueda. Siempre te mostraremos la primera
                  página.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ nombre: '', email: '', role: '' });
                      setAppliedFilters({ nombre: '', email: '', role: '' });
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
                  {total ? `Mostrando ${startItem} - ${endItem}` : 'Ajusta los filtros para encontrar usuarios.'}
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
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
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
                      onChange={(e) => handleSortFieldChange(e.target.value as SortField)}
                      className="rounded-xl border border-[#E0E3E7] px-4 py-2 text-sm text-[#333333] outline-none transition focus:border-[#fcd34f]"
                    >
                      <option value="nombre">Nombre</option>
                      <option value="email">Email</option>
                      <option value="createdAt">Fecha de creación</option>
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
              <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{errorMessage}</div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#F1F3F4] text-xs uppercase tracking-wide text-[#9AA0A6]">
                    <th className="px-4 py-3">Nombre</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Rol</th>
                    <th className="px-4 py-3">Creado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {!searchLoading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-[#666666]">
                        No encontramos usuarios con los criterios seleccionados.
                      </td>
                    </tr>
                  )}

                  {searchLoading && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center">
                        <div className="inline-flex items-center gap-3 text-sm text-[#666666]">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#1A2B42] border-t-transparent" />
                          Cargando usuarios...
                        </div>
                      </td>
                    </tr>
                  )}

                  {!searchLoading &&
                    users.map((user) => (
                      <tr key={user.id} className="border-b border-[#F7F7F7] text-[#333333]">
                        <td className="px-4 py-4 font-medium">{user.name}</td>
                        <td className="px-4 py-4">{user.email}</td>
                        <td className="px-4 py-4 text-xs">
                          <span
                            className={`rounded-full px-3 py-1 font-semibold ${
                              user.role === ADMIN_ROLE_ID
                                ? 'bg-[#0B0B0D] text-white'
                                : 'bg-[#fcd34f]/50 text-[#7a5b00]'
                            }`}
                          >
                            {user.role === ADMIN_ROLE_ID ? 'Administrador' : 'Usuario'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-[#666666]">{formatDate(user.createdAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(user)}
                              className="rounded-lg border border-[#E0E3E7] px-3 py-2 text-xs font-semibold text-[#0B0B0D] transition hover:border-[#fcd34f]"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
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

      <Modal open={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Agregar usuario">
        <form onSubmit={handleSubmitCreate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="create-name">
                Nombre
              </label>
              <input
                id="create-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
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
                onChange={(e) => setCreateForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="create-password">
                Contraseña
              </label>
              <input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, password: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="create-confirm-password">
                Confirmar contraseña
              </label>
              <input
                id="create-confirm-password"
                type="password"
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="create-role">
                Rol
              </label>
              <select
                id="create-role"
                value={createForm.role}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, role: Number(e.target.value) }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              >
                <option value={USER_ROLE_ID}>Usuario</option>
                <option value={ADMIN_ROLE_ID}>Administrador</option>
              </select>
            </div>
          </div>

          {createError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{createError}</div>
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
              disabled={creatingUser}
              className="w-full rounded-lg bg-[#fcd34f] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#c19722] disabled:opacity-60 sm:w-auto"
            >
              {creatingUser ? 'Guardando...' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={editModalOpen && !!selectedUser}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedUser(null);
        }}
        title="Editar usuario"
      >
        <form onSubmit={handleSubmitEdit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-name">
                Nombre
              </label>
              <input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
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
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-password">
                Nueva contraseña (opcional)
              </label>
              <input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-confirm-password">
                Confirmar nueva contraseña
              </label>
              <input
                id="edit-confirm-password"
                type="password"
                value={editForm.confirmPassword}
                onChange={(e) => setEditForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-semibold text-[#333333]" htmlFor="edit-role">
                Rol
              </label>
              <select
                id="edit-role"
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: Number(e.target.value) }))}
                className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              >
                <option value={USER_ROLE_ID}>Usuario</option>
                <option value={ADMIN_ROLE_ID}>Administrador</option>
              </select>
            </div>
          </div>

          {editError && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{editError}</div>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedUser(null);
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
      </Modal>

      <Modal
        open={deleteModalOpen && !!selectedUser}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        title="Eliminar usuario"
      >
        <div className="space-y-4">
          <p className="text-sm text-[#333333]">
            ¿Estás seguro que quieres eliminar a{' '}
            <span className="font-semibold text-[#1A2B42]">{selectedUser?.name}</span>? Esta acción no se
            puede deshacer.
          </p>

          {deleteError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{deleteError}</div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setDeleteModalOpen(false);
                setSelectedUser(null);
              }}
              className="w-full rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#0B0B0D] transition hover:bg-[#f7f3eb] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deletingUser}
              className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 sm:w-auto"
            >
              {deletingUser ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </Modal>
    </DashboardShell>
  );
}
