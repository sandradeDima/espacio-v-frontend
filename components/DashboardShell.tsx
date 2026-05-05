'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import ProtectedRoute from '@/app/components/ProtectedRoute';
import { useAuth } from '@/app/contexts/AuthContext';

type NavItem = {
  key: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
};

const ChartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <path d="M4 20h16" />
    <rect x="6" y="11" width="3" height="5" rx="1" />
    <rect x="11" y="7" width="3" height="9" rx="1" />
    <rect x="16" y="4" width="3" height="12" rx="1" />
  </svg>
);

const UsersIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <circle cx="9" cy="8" r="3" />
    <path d="M3 20c0-3 2.5-5 6-5s6 2 6 5" />
    <circle cx="18" cy="9" r="2.5" />
    <path d="M15.5 20c0-1.8 1.5-3.3 3.5-3.5" />
  </svg>
);

const UserIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" />
  </svg>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

const SettingsIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 12a7.4 7.4 0 0 0-.1-1l1.8-1.4-1.7-2.9-2.1.7a7.3 7.3 0 0 0-1.7-1l-.3-2.2h-3.4l-.3 2.2c-.6.2-1.1.6-1.7 1l-2.1-.7-1.7 2.9 1.8 1.4a7.4 7.4 0 0 0 0 2l-1.8 1.4 1.7 2.9 2.1-.7c.5.4 1.1.7 1.7 1l.3 2.2h3.4l.3-2.2c.6-.2 1.1-.6 1.7-1l2.1.7 1.7-2.9-1.8-1.4c.1-.3.1-.7.1-1Z" />
  </svg>
);

const HomeIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className={className}
  >
    <path d="M4 9.5 12 4l8 5.5V20a1 1 0 0 1-1 1h-4.5a.5.5 0 0 1-.5-.5V14h-4v6.5a.5.5 0 0 1-.5.5H5a1 1 0 0 1-1-1V9.5Z" />
  </svg>
);

const navItems: NavItem[] = [
  { key: 'registros', label: 'Registro', href: '/registros', icon: PlusIcon },
  { key: 'reportes', label: 'Reportes', href: '/reportes', icon: ChartIcon },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: UsersIcon },
  { key: 'usuarios', label: 'Usuarios', href: '/usuarios', icon: UserIcon },
  { key: 'configuraciones', label: 'Configuraciones', href: '/configuraciones', icon: SettingsIcon },
  { key: 'inicio', label: 'Inicio', href: '/home', icon: HomeIcon },
];

const ADMIN_ROLE_ID = 2;

interface DashboardShellProps {
  children: ReactNode;
}

export default function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAdmin = user?.role === ADMIN_ROLE_ID;

  const filteredNavItems = isAdmin
    ? navItems
    : navItems.filter((item) => ['registros', 'reportes', 'clientes'].includes(item.key));

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#f7f3eb] flex flex-col lg:flex-row">
        <aside className="hidden lg:flex lg:w-64 xl:w-72 bg-[#0B0B0D] border-r border-[#1F1F23] min-h-screen flex-col p-6 lg:sticky lg:top-0 lg:self-start lg:h-screen lg:overflow-y-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="relative h-10 w-40">
              <Image
                src="/Assets/Images/logo espacio sobre negro.jpg"
                alt="Espacio V"
                fill
                className="object-contain"
                sizes="160px"
                priority
              />
            </div>
          </div>
          <nav className="flex flex-col gap-2 text-[#F4F4F5]">
            {filteredNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-xl px-4 py-3 font-medium transition-colors flex items-center gap-3 ${
                    isActive
                      ? 'bg-[#D4AF31] text-[#0B0B0D]'
                      : 'hover:bg-[#15151A] text-[#F4F4F5]'
                  }`}
                >
                  {item.icon && <item.icon className="h-5 w-5" />}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex-1 flex flex-col min-h-screen pb-24 lg:pb-0">
          {/* Mobile compact header */}
          <header className="lg:hidden sticky top-0 z-30 bg-[#f7f3eb]/95 backdrop-blur-sm px-4 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0B0B0D] text-xs font-semibold text-white">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'EV'}
                </div>
                <span className="text-sm font-semibold text-[#1F2937] truncate max-w-[120px]">{user?.name ?? 'Usuario'}</span>
                <span className="rounded-full bg-[#fcd34f]/40 px-2 py-0.5 text-[10px] font-semibold text-[#7a5b00]">
                  {isAdmin ? 'Admin' : 'User'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#D14343] text-white transition hover:bg-[#b23535]"
                aria-label="Cerrar sesión"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </header>
          {/* Desktop header */}
          <header className="hidden lg:block w-full max-w-6xl mx-auto px-4 pt-4 lg:px-8 xl:px-10 sticky top-0 z-30">
            <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0B0B0D] text-sm font-semibold text-white">
                  {user?.name ? user.name.slice(0, 2).toUpperCase() : 'EV'}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-[#1F2937]">{user?.name ?? 'Usuario'}</span>
                  <span className="text-xs text-[#6B7280]">{user?.email ?? 'correo no disponible'}</span>
                </div>
                <span className="rounded-full bg-[#fcd34f]/40 px-3 py-1 text-xs font-semibold text-[#7a5b00]">
                  {isAdmin ? 'Administrador' : 'Usuario'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-[#D14343] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#b23535]"
              >
                Cerrar sesión
              </button>
            </div>
          </header>
          <main className="flex-1 w-full max-w-6xl mx-auto p-4 lg:p-8 xl:p-10">
            {children}
          </main>
        </div>

        <MobileBottomNav pathname={pathname} isAdmin={isAdmin} navItems={filteredNavItems} />

      </div>
    </ProtectedRoute>
  );
}

function MobileBottomNav({
  pathname,
  isAdmin,
  navItems,
}: {
  pathname: string;
  isAdmin: boolean;
  navItems: NavItem[];
}) {
  const reportesItem = navItems.find((item) => item.key === 'reportes');
  const registroItem = navItems.find((item) => item.key === 'registros');
  const clientesItem = navItems.find((item) => item.key === 'clientes');
  const usuariosItem = navItems.find((item) => item.key === 'usuarios');
  const configuracionesItem = navItems.find((item) => item.key === 'configuraciones');

  if (!reportesItem || !registroItem || !clientesItem) return null;

  const slots = isAdmin
    ? [
        { key: 'reportes', item: reportesItem },
        { key: 'clientes', item: clientesItem },
        null, // espacio central para el botón flotante
        { key: 'usuarios', item: usuariosItem },
        { key: 'configuraciones', item: configuracionesItem },
      ]
    : [
        { key: 'reportes', item: reportesItem },
        null, // espacio central para el botón flotante
        { key: 'clientes', item: clientesItem },
      ];
  const gridColsClass = slots.length === 5 ? 'grid-cols-5' : 'grid-cols-3';

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-inset-bottom">
      <nav className="relative mx-auto max-w-xl sm:max-w-2xl md:max-w-3xl rounded-t-3xl bg-linear-to-t from-[#0B0B0D] to-[#151518] shadow-[0_-16px_40px_rgba(0,0,0,0.35)] border-t border-[#2A2A2E] px-4 sm:px-6 pt-3 pb-5">
        <div className={`grid ${gridColsClass} items-end text-center text-[11px] sm:text-xs font-semibold`}>
          {slots.map((slot, idx) =>
            slot && slot.item ? (
              <Link
                key={slot.key}
                href={slot.item.href}
                className={`group flex flex-col items-center gap-1 sm:gap-1.5 py-2 rounded-xl transition-all duration-200 ${
                  pathname === slot.item.href
                    ? 'text-[#D4AF31] scale-105'
                    : 'text-[#9CA3AF] hover:text-[#D4AF31] hover:scale-105 active:scale-95'
                }`}
              >
                <span className={`p-2 rounded-xl transition-colors ${
                  pathname === slot.item.href ? 'bg-[#D4AF31]/15' : 'group-hover:bg-white/5'
                }`}>
                  {slot.item.icon && <slot.item.icon className="h-5 w-5 sm:h-6 sm:w-6" />}
                </span>
                <span className="truncate max-w-[72px] sm:max-w-none">{slot.item.label}</span>
              </Link>
            ) : (
              <div key={`spacer-${idx}`} className="w-16 sm:w-20" />
            )
          )}
        </div>

        <Link
          href={registroItem.href}
          aria-label="Registro"
          className="absolute left-1/2 bottom-full -translate-x-1/2 translate-y-3/4 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-linear-to-br from-[#D4AF31] via-[#e6c84a] to-[#b3861a] text-[#0B0B0D] flex items-center justify-center shadow-[0_4px_20px_rgba(212,175,49,0.4)] border-4 border-[#0B0B0D] active:scale-90 hover:scale-105 transition-transform duration-200"
        >
          {registroItem.icon ? (
            <registroItem.icon className="h-6 w-6 sm:h-7 sm:w-7" />
          ) : (
            <span className="text-2xl font-bold">+</span>
          )}
        </Link>
      </nav>
    </div>
  );
}
