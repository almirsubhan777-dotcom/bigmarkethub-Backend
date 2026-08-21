// components/AdminLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const fullNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/kyc', label: 'KYC Verification' },
  { href: '/admin/wallets', label: 'Saved Wallets' },
  { href: '/admin/support', label: 'Support Chat' },
  { href: '/admin/distributors', label: 'Distributors' },
  { href: '/admin/recharge', label: 'Recharge Customer' },
  { href: '/admin/records', label: 'All Records' },
  { href: '/admin/settings', label: 'Settings' },
];

const distributorNavItems = [
  { href: '/admin/recharge', label: 'Recharge Customer' },
  { href: '/admin/settings', label: 'Settings' },
];

export default function AdminLayout({ title, children }) {
  const router = useRouter();
  const [adminInfo, setAdminInfo] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch('/api/admin/me');
        if (res.status === 401) {
          // Session timed out — send them back to the login screen.
          if (!cancelled) router.replace('/admin/login');
          return;
        }
        const data = await res.json();
        if (!cancelled && data.admin) setAdminInfo(data.admin);
      } catch (e) {
        /* network hiccup — leave the page as-is */
      }
    }

    checkSession();

    // Poll while the tab is actually being looked at. This both detects an expired
    // session promptly and keeps an in-use panel from timing out mid-task.
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') checkSession();
    }, 30000);

    return () => { cancelled = true; clearInterval(interval); };
  }, [router]);

  // Close the mobile drawer automatically whenever the page changes.
  useEffect(() => {
    setSidebarOpen(false);
  }, [router.pathname]);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  const isDistributor = adminInfo?.role === 'distributor';
  const navItems = isDistributor ? distributorNavItems : fullNavItems;

  return (
    <div className="admin-shell">
      <style>{globalStyles}</style>

      {sidebarOpen && <div className="admin-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`admin-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="admin-logo">
          BIG MARKET <span style={{ color: '#FF6A00' }}>HUB</span>
          <br />
          <small style={{ fontWeight: 400, color: '#9aa0aa' }}>
            {isDistributor ? 'Agent Panel' : 'Admin Panel'}
          </small>
        </div>
        {adminInfo && (
          <div className="admin-badge">
            <div style={{ fontSize: 12, fontWeight: 700 }}>{adminInfo.username}</div>
            <div style={{ fontSize: 10, color: isDistributor ? '#FFA23A' : '#2DD4A7', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 0.5 }}>
              {isDistributor ? 'Agent' : 'Super Admin'}
            </div>
            {isDistributor && (
              <div style={{ fontSize: 13, fontWeight: 800, color: '#FF6A00', marginTop: 6 }}>
                Pool: ${Number(adminInfo.credit_balance).toFixed(2)}
              </div>
            )}
          </div>
        )}
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav-link${router.pathname === item.href ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="admin-main">
        <div className="admin-page-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button className="admin-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>
            <h1 className="admin-page-title">{title}</h1>
          </div>
          <button onClick={handleLogout} className="admin-logout-btn">Log out</button>
        </div>
        <div className="admin-page-body">{children}</div>
      </div>
    </div>
  );
}

const globalStyles = `
  body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#0b0d12; color:#fff; }

  .admin-shell{ display:flex; min-height:100vh; }

  .admin-sidebar{
    width:220px; flex-shrink:0;
    background:#0a0b0f; border-right:1px solid rgba(255,255,255,.08);
    padding:22px 14px;
  }
  .admin-logo{ font-weight:800; font-size:16px; margin-bottom:16px; padding:0 8px; }
  .admin-badge{ background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08); border-radius:10px; padding:10px 12px; margin-bottom:18px; }
  .admin-nav-link{ display:block; padding:10px 12px; margin-bottom:4px; border-radius:8px; color:#9aa0aa; text-decoration:none; font-size:13.5px; font-weight:600; }
  .admin-nav-link:hover, .admin-nav-link.active{ background:rgba(255,106,0,.12); color:#fff; }

  .admin-main{ flex:1; min-width:0; max-width:1200px; }
  .admin-page-topbar{ display:flex; justify-content:space-between; align-items:center; padding:18px 32px; border-bottom:1px solid rgba(255,255,255,.06); }
  .admin-page-title{ font-size:20px; margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .admin-page-body{ padding:26px 32px; }
  .admin-logout-btn{ background:rgba(255,71,71,.12); border:1px solid rgba(255,71,71,.3); color:#ff6b6b; padding:8px 16px; border-radius:8px; font-size:12.5px; font-weight:700; cursor:pointer; flex-shrink:0; }

  .admin-hamburger{
    display:none;
    background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12);
    color:#fff; width:36px; height:36px; border-radius:9px;
    align-items:center; justify-content:center; cursor:pointer; flex-shrink:0;
  }
  .admin-hamburger svg{ width:18px; height:18px; }
  .admin-overlay{ display:none; }

  table{ width:100%; border-collapse:collapse; background:#14161c; border-radius:10px; overflow:hidden; }
  th, td{ padding:11px 14px; text-align:left; font-size:13px; border-bottom:1px solid rgba(255,255,255,.06); }
  th{ color:#9aa0aa; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
  .badge{ padding:3px 10px; border-radius:999px; font-size:10.5px; font-weight:700; text-transform:uppercase; }
  .badge-pending{ background:rgba(255,162,58,.15); color:#FFA23A; }
  .badge-approved, .badge-active{ background:rgba(45,212,167,.15); color:#2DD4A7; }
  .badge-rejected, .badge-banned{ background:rgba(255,71,71,.15); color:#FF4747; }
  .badge-suspended{ background:rgba(255,162,58,.15); color:#FFA23A; }
  .btn{ display:inline-block; padding:6px 12px; border-radius:7px; font-size:12px; font-weight:700; text-decoration:none; border:none; cursor:pointer; margin-right:5px; margin-bottom:5px; }
  .btn-approve{ background:#2DD4A7; color:#04231b; }
  .btn-reject{ background:#FF4747; color:#2a0505; }
  .btn-neutral{ background:rgba(255,255,255,.08); color:#fff; }
  input[type=text], input[type=password], input[type=number], textarea{
    width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.15);
    background:rgba(255,255,255,.03); color:#fff; font-size:13px; margin-bottom:10px; box-sizing:border-box;
  }
  .empty-state{ text-align:center; padding:40px; color:#9aa0aa; }

  /* ---- Mobile (<= 860px): sidebar becomes a slide-in drawer ---- */
  @media (max-width: 860px){
    .admin-sidebar{
      position:fixed; top:0; left:0; bottom:0; z-index:110;
      width:250px; max-width:80vw;
      transform:translateX(-100%);
      transition:transform .25s ease;
      box-shadow:20px 0 50px rgba(0,0,0,.6);
      overflow-y:auto;
    }
    .admin-sidebar.open{ transform:translateX(0); }
    .admin-overlay{
      display:block; position:fixed; inset:0; background:rgba(0,0,0,.6);
      z-index:100; animation: adminFadeIn .2s ease both;
    }
    .admin-hamburger{ display:flex; }
    .admin-page-topbar{ padding:14px 16px; }
    .admin-page-body{ padding:16px; }
    .admin-page-title{ font-size:17px; }
    .admin-logout-btn{ padding:7px 12px; font-size:11.5px; }

    /* Tables scroll horizontally instead of squeezing/breaking layout */
    table{ display:block; overflow-x:auto; -webkit-overflow-scrolling:touch; white-space:nowrap; }
    th, td{ white-space:nowrap; }
  }

  @keyframes adminFadeIn{ from{ opacity:0; } to{ opacity:1; } }
`;
