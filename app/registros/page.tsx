'use client';

import { useState, useEffect, useCallback, FormEvent, useMemo } from 'react';
import DashboardShell from '@/components/DashboardShell';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../contexts/AuthContext';
import { MensajeApi } from '@/types/api';
import { Cliente } from '@/types/client';
import Modal from '@/app/components/Modal';
import { API_BASE_URL } from '@/app/lib/api/base-url';
import { useRouter } from 'next/navigation';

type Coloracion = {
  id: number | string;
  nombre: string;
  descripcion?: string;
};

type RegistroForm = {
  clienteId: number | null;
  coloracionId: number | string | null;
  fecha: string;
  tipoServicio: string;
  precio: string;
  formula: string;
  observaciones: string;
  evidencias: File[];
};

type CreatedReportePayload = {
  id?: number | string;
  reporteId?: number | string;
  reporte?: {
    id?: number | string;
    reporteId?: number | string;
  };
};

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const toLocalDateTimeInputValue = (date = new Date()) => {
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

const getCreatedReporteId = (payload?: CreatedReportePayload) =>
  payload?.reporte?.id ?? payload?.reporte?.reporteId ?? payload?.id ?? payload?.reporteId;

export default function RegistroServicioPage() {
  const api = useApi();
  const router = useRouter();
  const { isLoading, isAuthenticated, accessToken } = useAuth();

  const [clientQuery, setClientQuery] = useState('');
  const [clients, setClients] = useState<Cliente[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState('');
  const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [serviceQuery, setServiceQuery] = useState('');
  const [services, setServices] = useState<Coloracion[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState('');
  const [selectedService, setSelectedService] = useState<Coloracion | null>(null);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);

  const [showCreateService, setShowCreateService] = useState(false);
  const [createServiceForm, setCreateServiceForm] = useState({ nombre: '', descripcion: '' });
  const [creatingService, setCreatingService] = useState(false);
  const [createServiceError, setCreateServiceError] = useState('');

  const [form, setForm] = useState<RegistroForm>({
    clienteId: null,
    coloracionId: null,
    fecha: toLocalDateTimeInputValue(),
    tipoServicio: '',
    precio: '',
    formula: '',
    observaciones: '',
    evidencias: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitMessage, setSubmitMessage] = useState('');
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [createClientForm, setCreateClientForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [createClientError, setCreateClientError] = useState('');

  const fetchClients = useCallback(
    async (search: string) => {
      if (isLoading || !isAuthenticated || !accessToken) return;
      setClientsLoading(true);
      setClientsError('');
      try {
        const params = new URLSearchParams({
          page: '1',
          size: '10',
          nombre: search,
          email: search,
          telefono: search,
        });
        const response = await api.get<MensajeApi<{ clientes?: Cliente[]; clients?: Cliente[] }>>(
          `/api/clientes/search-pagination?${params.toString()}`
        );
        const data = response?.data;
        const list = (data?.clientes ?? data?.clients ?? []) as Cliente[];
        setClients(list);
      } catch (error) {
        console.error('Error loading clients', error);
        setClientsError('No pudimos cargar clientes.');
      } finally {
        setClientsLoading(false);
      }
    },
    [accessToken, api, isAuthenticated, isLoading]
  );

  useEffect(() => {
    if (!showClientDropdown) return;
    const delay = setTimeout(() => {
      fetchClients(clientQuery);
    }, 300);
    return () => clearTimeout(delay);
  }, [clientQuery, fetchClients, showClientDropdown]);

  const fetchServices = useCallback(
    async (search: string) => {
      if (isLoading || !isAuthenticated || !accessToken) return;
      setServicesLoading(true);
      setServicesError('');
      try {
        const path = search
          ? `/api/coloraciones/search?query=${encodeURIComponent(search)}`
          : '/api/coloraciones/';
        const response = await api.get<MensajeApi<Coloracion[]>>(path);
        const data =
          (response?.data as { coloraciones?: Coloracion[] })?.coloraciones ??
          ((response?.data as unknown) as Coloracion[]) ??
          [];
        setServices(data);
      } catch (error) {
        console.error('Error loading services', error);
        setServicesError('No pudimos cargar servicios.');
      } finally {
        setServicesLoading(false);
      }
    },
    [accessToken, api, isAuthenticated, isLoading]
  );

  useEffect(() => {
    if (!showServiceDropdown) return;
    const delay = setTimeout(() => {
      fetchServices(serviceQuery);
    }, 300);
    return () => clearTimeout(delay);
  }, [fetchServices, serviceQuery, showServiceDropdown]);

  const handleSelectClient = (client: Cliente) => {
    setSelectedClient(client);
    setForm((prev) => ({ ...prev, clienteId: client.id }));
    setShowClientDropdown(false);
  };

  const handleSelectService = (service: Coloracion) => {
    setSelectedService(service);
    setForm((prev) => ({
      ...prev,
      coloracionId: service.id,
      tipoServicio: service.nombre,
    }));
    setServiceQuery(service.nombre);
    setShowServiceDropdown(false);
  };

  const handleInputChange = (field: keyof RegistroForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFilesChange = (files: FileList | null) => {
    if (!files) return;
    setForm((prev) => ({
      ...prev,
      evidencias: [...prev.evidencias, ...Array.from(files)],
    }));
  };

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedService(null);
    setClientQuery('');
    setServiceQuery('');
    setForm({
      clienteId: null,
      coloracionId: null,
      fecha: toLocalDateTimeInputValue(),
      tipoServicio: '',
      precio: '',
      formula: '',
      observaciones: '',
      evidencias: [],
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');
    setSubmitMessage('');
    try {
      if (!form.clienteId || !form.coloracionId) {
        throw new Error('Selecciona un cliente y un servicio.');
      }
      const [fechaServicio, horaServicio = ''] = form.fecha.split('T');
      const formData = new FormData();
      formData.append('clienteId', String(form.clienteId));
      formData.append('fechaServicio', fechaServicio);
      formData.append('horaServicio', horaServicio);
      formData.append('coloracionId', String(form.coloracionId));
      formData.append('formula', form.formula);
      formData.append('observaciones', form.observaciones || 'Sin observaciones');
      formData.append('precio', form.precio || '0');
      form.evidencias.forEach((file) => formData.append('fotos', file));

      const res = await fetch(`${API_BASE_URL}/api/reportes/completo`, {
        method: 'POST',
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const data = (await res.json()) as MensajeApi<CreatedReportePayload>;
      if (!res.ok || data.error) {
        throw new Error(data.message || 'No pudimos guardar el reporte.');
      }
      const createdReporteId = getCreatedReporteId(data.data ?? (data as unknown as CreatedReportePayload));
      if (!createdReporteId) {
        throw new Error('El reporte se guardó, pero no pudimos abrir el detalle automáticamente.');
      }
      router.push(`/reportes/${encodeURIComponent(String(createdReporteId))}`);
    } catch (error) {
      console.error('Error creando reporte', error);
      setSubmitError(error instanceof Error ? error.message : 'No pudimos guardar el reporte.');
    } finally {
      setSubmitting(false);
    }
  };

  const clienteLabel = useMemo(() => {
    if (!selectedClient) return 'Buscar cliente...';
    return `${selectedClient.nombre}${selectedClient.telefono ? ` · ${selectedClient.telefono}` : ''}`;
  }, [selectedClient]);

  const serviceLabel = useMemo(() => {
    if (!selectedService) return 'Buscar servicio...';
    return `${selectedService.nombre}${selectedService.descripcion ? ` · ${selectedService.descripcion}` : ''}`;
  }, [selectedService]);

  const handleCreateClient = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingClient(true);
    setCreateClientError('');
    try {
      const payload = {
        ...createClientForm,
        email: createClientForm.email.trim() || null,
        telefono: onlyDigits(createClientForm.telefono),
      };
      const resp = await api.post<MensajeApi<Cliente>>('/api/clientes/', payload);
      const newClient =
        (resp?.data as any)?.cliente || (resp?.data as any) || (resp as unknown as Cliente);
      if (newClient) {
        setSelectedClient(newClient);
        setForm((prev) => ({ ...prev, clienteId: newClient.id }));
        setClientQuery(newClient.nombre || '');
        setClients([newClient, ...clients]);
      }
      setShowCreateClient(false);
      setCreateClientForm({ nombre: '', email: '', telefono: '' });
    } catch (error) {
      console.error('Error creating client', error);
      setCreateClientError('No pudimos crear el cliente. Intenta nuevamente.');
    } finally {
      setCreatingClient(false);
    }
  };

  const handleCreateService = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCreatingService(true);
    setCreateServiceError('');
    try {
      const resp = await api.post<MensajeApi<Coloracion>>('/api/coloraciones/', createServiceForm);
      const newService =
        (resp?.data as any)?.coloracion || (resp?.data as any) || (resp as unknown as Coloracion);
      if (newService) {
        setSelectedService(newService);
        setForm((prev) => ({
          ...prev,
          coloracionId: newService.id,
          tipoServicio: newService.nombre,
        }));
        setServiceQuery(newService.nombre || '');
        setServices((prev) => [newService, ...prev]);
      }
      setShowCreateService(false);
      setCreateServiceForm({ nombre: '', descripcion: '' });
    } catch (error) {
      console.error('Error creating service', error);
      setCreateServiceError('No pudimos crear el servicio. Intenta nuevamente.');
    } finally {
      setCreatingService(false);
    }
  };

  const formatMoneyInput = (raw: string) => {
    const onlyDigits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
    if (!onlyDigits) return '';
    // Insert decimal before last two digits (ATM style)
    const padded = onlyDigits.padStart(3, '0');
    const intPart = padded.slice(0, -2);
    const decPart = padded.slice(-2);
    return `${intPart}.${decPart}`;
  };

  useEffect(() => {
    setForm((prev) => ({ ...prev, precio: formatMoneyInput(prev.precio) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <DashboardShell>
      <section className="min-h-[70vh] w-full">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4">
          <header className="flex flex-col gap-2">
            <p className="text-sm uppercase tracking-wide text-[#9AA0A6]">Registro</p>
            <h1 className="text-3xl font-bold text-[#1A2B42]">Registro de servicios</h1>
            <p className="text-sm text-[#6B7280]">
              Registra los servicios de coloración realizados a tus clientes.
            </p>
          </header>

          <div className="rounded-2xl bg-white p-6 shadow-lg">
            {submitError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {submitError}
              </div>
            )}
            {submitMessage && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {submitMessage}
              </div>
            )}
            <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#666666]">Cliente</label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#1A2B42] hover:underline"
                      onClick={() => setShowCreateClient(true)}
                    >
                      + Nuevo cliente
                    </button>
                  </div>
                  <div className="relative">
                    <div className="rounded-xl border border-[#E0E3E7] px-3 py-2">
                      <div className="flex items-center gap-2">
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
                          value={clientQuery}
                          onChange={(e) => setClientQuery(e.target.value)}
                          placeholder="Buscar cliente..."
                          className="w-full bg-transparent text-sm text-[#333333] outline-none"
                          onFocus={() => setShowClientDropdown(true)}
                          onBlur={() => setTimeout(() => setShowClientDropdown(false), 120)}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      {showClientDropdown && (clientsLoading || clientsError || clients.length > 0) && (
                        <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-[#E0E3E7] bg-white shadow-xl">
                          {clientsLoading && (
                            <div className="px-3 py-2 text-xs text-[#666666]">Buscando clientes...</div>
                          )}
                          {clientsError && (
                            <div className="px-3 py-2 text-xs text-red-600">{clientsError}</div>
                          )}
                          {!clientsLoading && !clientsError && clients.length === 0 && (
                            <div className="px-3 py-2 text-xs text-[#666666]">Sin resultados</div>
                          )}
                          {clients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleSelectClient(client)}
                              className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm text-[#1F2937] transition hover:bg-[#F5F7FA] ${
                                selectedClient?.id === client.id ? 'bg-[#EEF2FF] font-semibold' : ''
                              }`}
                            >
                              <span>{client.nombre}</span>
                              <span className="text-xs text-[#6B7280]">{client.telefono || '—'}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="mt-2 rounded-lg bg-[#F5F7FA] px-3 py-2 text-sm text-[#333333]">
                      {clienteLabel}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#666666]">Fecha y hora</label>
                  <div className="flex items-center gap-2 rounded-xl border border-[#E0E3E7] px-3 py-2">
                    <input
                      type="datetime-local"
                      value={form.fecha}
                      onChange={(e) => handleInputChange('fecha', e.target.value)}
                      className="w-full bg-transparent text-sm text-[#333333] outline-none"
                      step="60"
                    />
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5 text-[#9AA0A6]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <rect x="4" y="5" width="16" height="16" rx="2" />
                      <path d="M4 11h16" />
                      <path d="M9 3v4" />
                      <path d="M15 3v4" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-[#666666]">Servicio</label>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[#1A2B42] hover:underline"
                      onClick={() => {
                        setCreateServiceForm({ nombre: '', descripcion: '' });
                        setCreateServiceError('');
                        setShowCreateService(true);
                      }}
                    >
                      + Nuevo tipo de servicio
                    </button>
                  </div>
                  <div className="relative">
                    <div className="rounded-xl border border-[#E0E3E7] px-3 py-2">
                      <div className="flex items-center gap-2">
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
                          value={serviceQuery}
                          onChange={(e) => {
                            setServiceQuery(e.target.value);
                            setForm((prev) => ({ ...prev, tipoServicio: e.target.value }));
                          }}
                          placeholder="Buscar servicio..."
                          className="w-full bg-transparent text-sm text-[#333333] outline-none"
                          onFocus={() => setShowServiceDropdown(true)}
                          onBlur={() => setTimeout(() => setShowServiceDropdown(false), 120)}
                        />
                      </div>
                    </div>
                    <div className="relative">
                      {showServiceDropdown &&
                        (servicesLoading || servicesError || services.length > 0) && (
                          <div className="absolute left-0 right-0 z-30 mt-1 max-h-52 overflow-y-auto rounded-xl border border-[#E0E3E7] bg-white shadow-xl">
                            {servicesLoading && (
                              <div className="px-3 py-2 text-xs text-[#666666]">
                                Buscando servicios...
                              </div>
                            )}
                            {servicesError && (
                              <div className="px-3 py-2 text-xs text-red-600">{servicesError}</div>
                            )}
                            {!servicesLoading && !servicesError && services.length === 0 && (
                              <div className="px-3 py-2 text-xs text-[#666666]">Sin resultados</div>
                            )}
                            {services.map((service) => (
                              <button
                                key={service.id}
                                type="button"
                                onClick={() => handleSelectService(service)}
                                className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm text-[#1F2937] transition hover:bg-[#F5F7FA] ${
                                  selectedService?.id === service.id ? 'bg-[#EEF2FF] font-semibold' : ''
                                }`}
                              >
                                <span>{service.nombre}</span>
                                <span className="text-xs text-[#6B7280]">
                                  {service.descripcion || '—'}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                    <div className="mt-2 rounded-lg bg-[#F5F7FA] px-3 py-2 text-sm text-[#333333]">
                      {serviceLabel}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-[#666666]">Precio estimado (Bs.)</label>
                  <input
                    inputMode="numeric"
                    value={form.precio}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        precio: formatMoneyInput(e.target.value),
                      }))
                    }
                    placeholder="0.00"
                    className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#666666]">Fórmula de color</label>
                <textarea
                  rows={3}
                  value={form.formula}
                  onChange={(e) => handleInputChange('formula', e.target.value)}
                  placeholder="Ej: Raíz: 6.1 (20g) + 10 vol. Largos: 7.1 (30g) + 20 vol..."
                  className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-[#666666]">Observaciones</label>
                <textarea
                  rows={3}
                  value={form.observaciones}
                  onChange={(e) => handleInputChange('observaciones', e.target.value)}
                  placeholder="Notas sobre estado del cabello, sensibilidad, reacciones previas..."
                  className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none focus:border-[#1A2B42]"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-[#666666]">Evidencia fotográfica</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#D1D5DB] bg-[#F9FAFB] text-xs font-semibold text-[#6B7280] hover:border-[#1A2B42] hover:text-[#1A2B42]">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFilesChange(e.target.files)}
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
                  {form.evidencias.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-[#E0E3E7] bg-white text-xs text-[#6B7280]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            evidencias: prev.evidencias.filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute right-1 top-1 z-10 rounded-full bg-white/90 p-1 text-xs font-bold text-[#1A2B42] shadow hover:bg-white"
                        aria-label="Eliminar imagen"
                      >
                        ×
                      </button>
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm font-semibold text-[#333333] transition hover:bg-[#F5F7FA] sm:w-auto"
                >
                  Limpiar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-[#059669] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#047857] disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? 'Guardando...' : 'Guardar servicio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      <Modal open={showCreateClient} onClose={() => setShowCreateClient(false)} title="Nuevo cliente">
        <form className="space-y-4" onSubmit={handleCreateClient}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#333333]" htmlFor="new-nombre">
              Nombre
            </label>
            <input
              id="new-nombre"
              value={createClientForm.nombre}
              onChange={(e) => setCreateClientForm((p) => ({ ...p, nombre: e.target.value }))}
              className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#333333]" htmlFor="new-email">
              Email
            </label>
            <input
              id="new-email"
              type="email"
              value={createClientForm.email}
              onChange={(e) => setCreateClientForm((p) => ({ ...p, email: e.target.value }))}
              className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#333333]" htmlFor="new-telefono">
              Teléfono
            </label>
            <input
              id="new-telefono"
              inputMode="numeric"
              pattern="\d*"
              value={createClientForm.telefono}
              onChange={(e) => setCreateClientForm((p) => ({ ...p, telefono: onlyDigits(e.target.value) }))}
              className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
            />
          </div>

          {createClientError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {createClientError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateClient(false)}
              className="w-full rounded-lg border border-[#E0E3E7] px-4 py-2 text-sm font-semibold text-[#333333] transition hover:bg-[#F5F7FA] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingClient}
              className="w-full rounded-lg bg-[#1A2B42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#223552] disabled:opacity-60 sm:w-auto"
            >
              {creatingClient ? 'Creando...' : 'Crear cliente'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showCreateService}
        onClose={() => setShowCreateService(false)}
        title="Nuevo tipo de servicio"
      >
        <form className="space-y-4" onSubmit={handleCreateService}>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#333333]" htmlFor="new-servicio-nombre">
              Nombre
            </label>
            <input
              id="new-servicio-nombre"
              value={createServiceForm.nombre}
              onChange={(e) => setCreateServiceForm((p) => ({ ...p, nombre: e.target.value }))}
              className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-[#333333]" htmlFor="new-servicio-desc">
              Descripción
            </label>
            <textarea
              id="new-servicio-desc"
              rows={3}
              value={createServiceForm.descripcion}
              onChange={(e) => setCreateServiceForm((p) => ({ ...p, descripcion: e.target.value }))}
              className="rounded-xl border border-[#E0E3E7] px-4 py-3 text-sm text-[#333333] outline-none transition focus:border-[#1A2B42]"
            />
          </div>

          {createServiceError && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{createServiceError}</div>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setShowCreateService(false)}
              className="w-full rounded-lg border border-[#E0E3E7] px-4 py-2 text-sm font-semibold text-[#333333] transition hover:bg-[#F5F7FA] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creatingService}
              className="w-full rounded-lg bg-[#1A2B42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#223552] disabled:opacity-60 sm:w-auto"
            >
              {creatingService ? 'Creando...' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </Modal>
    </DashboardShell>
  );
}
