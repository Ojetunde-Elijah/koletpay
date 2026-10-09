
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  Home,
  ReceiptText,
  Mic,
  Users,
  Wallet,
  BarChart3,
  Package,
  Settings,
  ArrowRight,
  Plus,
  CalendarClock,
  Landmark,
  Link2,
  LogOut,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useKoletPay } from '@/lib/store';
import { initials } from '@/lib/types';

const nav = [
  { href: '/dashboard', title: 'Home', icon: Home },
  { href: '/customers', title: 'Customers', icon: Users },
  { href: '/invoices', title: 'Invoices', icon: ReceiptText },
  { href: '/products', title: 'Products & Services', icon: Package },
  { href: '/payments', title: 'Payments', icon: Wallet },
  { href: '/links', title: 'Payment links', icon: Link2 },
  { href: '/wallet', title: 'Wallet', icon: Landmark },
  { href: '/installments', title: 'Pay in parts', icon: CalendarClock },
  { href: '/reports', title: 'Reports', icon: BarChart3 },
  { href: '/assistant', title: 'Kolet AI', icon: Mic },
  { href: '/settings', title: 'Settings', icon: Settings },
];

const isAuthPath = (path: string) =>
  path === '/login' || path.startsWith('/login/') || path === '/register' || path.startsWith('/register/');
const isPublicPath = (path: string) => path === '/pay' || path.startsWith('/pay/');

export function Shell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const { data, status, logout } = useKoletPay();

  const authPage = isAuthPath(path);
  const publicPage = isPublicPath(path);

  // Guard: signed-out visitors go to login, signed-in users skip the login/register screens.
  useEffect(() => {
    if (publicPage) return;
    if (status === 'signedOut' && !authPage) router.replace('/login');
    if (status === 'signedIn' && (authPage || path === '/')) router.replace('/dashboard');
  }, [status, authPage, publicPage, path, router]);

  // Login, Register and the customer pay page use their own layouts.
  if (publicPage) return <>{children}</>;
  if (authPage) return <>{status === 'signedIn' ? null : children}</>;
  if (status !== 'signedIn') {
    return (
      <div className="app-loading" role="status" aria-live="polite">
        <span className="brand-symbol">K</span>
        <p>Loading your workspace…</p>
      </div>
    );
  }
  const mark = initials(data.business.name);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <Link href="/dashboard" className="brand">
          <span className="brand-symbol">K</span>
          KoletPay
        </Link>

        <div className="sidebar-label">WORKSPACE</div>

        <nav className="side-links">
          {nav.map((item) => {
            const Icon = item.icon;

            const selected =
              path.startsWith(item.href);

            return (
              <Link
                href={item.href}
                key={item.href}
                className={`side-link${selected ? ' active' : ''}`}
              >
                <Icon size={19} strokeWidth={1.9} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <span className="avatar mini">{mark}</span>

          <span>
            <b>{data.business.name}</b>
            <small>{data.business.city}, {data.business.state}</small>
          </span>

          <button className="icon-button" onClick={logout} aria-label="Sign out" title="Sign out">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <Link href="/dashboard" className="brand compact">
            <span className="brand-symbol">K</span>
            KoletPay
          </Link>

          <span className="header-context">
            Business workspace
            <ArrowRight size={14} />
            <strong>{data.business.name}</strong>
          </span>

          <div className="header-actions">
            

            <Link
              className="icon-button"
              href="/invoices/new"
              aria-label="Create invoice"
            >
              <Plus size={19} />
            </Link>

            <span className="avatar mini">{mark}</span>
          </div>
        </header>

        <main className="main">{children}</main>
      </div>

      <nav className="bottom-nav" aria-label="Quick navigation">
        {[
          nav[0],
          nav[2],
          nav[6],
          nav[1],
          {
            href: '/settings',
            title: 'More',
            icon: Settings,
          },
        ].map((item) => {
          const Icon = item.icon;

          const selected =
            path.startsWith(item.href);

          return (
            <Link
              href={item.href}
              key={item.title}
              className={`nav-item${selected ? ' active' : ''}`}
            >
              <Icon size={21} />
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHead({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>

      {action}
    </header>
  );
}

export function Status({ status }: { status: string }) {
  const type =
    status === 'Paid'
      ? 'paid'
      : status === 'Overdue'
        ? 'overdue'
        : status === 'Partially paid'
          ? 'partial'
          : 'pending';

  return <span className={`status ${type}`}>{status}</span>;
}

export function Empty({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty">
      <Package size={28} />
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function QuickLink({
  href,
  icon,
  title,
}: {
  href: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <Link className="quick" href={href}>
      {icon}
      <span>{title}</span>
    </Link>
  );
}
