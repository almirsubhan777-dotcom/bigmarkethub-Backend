// components/AdminLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState, useCallback, useRef } from 'react';

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
  const [counts, setCounts] = useState({ deposits: 0, withdrawals: 0, kyc: 0, support: 0 });
  const [flash, setFlash] = useState(false);
  const prevTotalRef = useRef(0);

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

  // Poll pending counts (deposits, withdrawals, KYC, support) from every admin
  // page, every 5 seconds, so new customer activity shows up almost instantly
  // — sidebar badges + browser tab title — no matter which page is open.
  const checkCounts = useCallback(async (isAdmin) => {
    try {
      const supportRes = await fetch('/api/admin/support');
      const support = supportRes.ok ? await supportRes.json() : null;
      const supportUnread = support
        ? (support.tickets || []).reduce((sum, t) => sum + (t.unread || 0), 0)
        : 0;

      let next = { deposits: 0, withdrawals: 0, kyc: 0, support: supportUnread };

      if (isAdmin) {
        const statsRes = await fetch('/api/admin/dashboard');
        if (statsRes.ok) {
          const stats = await statsRes.json();
          if (stats?.stats) {
            next = {
              deposits: stats.stats.pendingDeposits || 0,
              withdrawals: stats.stats.pendingWithdrawals || 0,
              kyc: stats.stats.pendingKyc || 0,
              support: supportUnread,
            };
          }
        }
      }

      const total = next.deposits + next.withdrawals + next.kyc + next.support;
      if (total > prevTotalRef.current) {
        setFlash(true);
        setTimeout(() => setFlash(false), 1600);
      }
      prevTotalRef.current = total;
      setCounts(next);
    } catch (e) {
      /* ignore — next poll will retry */
    }
  }, []);

  useEffect(() => {
    const isAdmin = adminInfo ? adminInfo.role !== 'distributor' : true; // assume admin until we know otherwise
    checkCounts(isAdmin);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') checkCounts(isAdmin);
    }, 1000);
    function onVisible() {
      if (document.visibilityState === 'visible') checkCounts(isAdmin);
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVisible); };
  }, [checkCounts, adminInfo?.role]);

  const totalCount = counts.deposits + counts.withdrawals + counts.kyc + counts.support;

  useEffect(() => {
    document.title = totalCount > 0 ? `(${totalCount}) Admin — Big Market Hub` : 'Admin — Big Market Hub';
  }, [totalCount]);

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
          {navItems.map((item) => {
            const badgeCount =
              item.href === '/admin/deposits' ? counts.deposits :
              item.href === '/admin/withdrawals' ? counts.withdrawals :
              item.href === '/admin/kyc' ? counts.kyc :
              item.href === '/admin/support' ? counts.support : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-link${router.pathname === item.href ? ' active' : ''}`}
              >
                {item.label}
                {badgeCount > 0 && (
                  <span className={`admin-nav-badge${flash ? ' flash' : ''}`}>{badgeCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="admin-live-status">
          <span className={`admin-live-dot${totalCount > 0 ? ' has-pending' : ''}`}></span>
          Live · updates every 1s
        </div>
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
  .admin-nav-link{ display:flex; align-items:center; justify-content:space-between; padding:10px 12px; margin-bottom:4px; border-radius:8px; color:#9aa0aa; text-decoration:none; font-size:13.5px; font-weight:600; }
  .admin-nav-link:hover, .admin-nav-link.active{ background:rgba(255,106,0,.12); color:#fff; }
  .admin-nav-badge{
    background:#FF4747; color:#fff; font-size:10.5px; font-weight:800;
    min-width:18px; height:18px; border-radius:999px;
    display:flex; align-items:center; justify-content:center; padding:0 5px;
    flex-shrink:0;
  }
  .admin-nav-badge.flash{ animation: badgeFlash 1.6s ease; }
  @keyframes badgeFlash{
    0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,71,71,0); }
    15% { transform: scale(1.35); box-shadow: 0 0 0 6px rgba(255,71,71,0.35); }
    35% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,71,71,0); }
  }
  .admin-live-status{
    display:flex; align-items:center; gap:6px;
    margin-top:14px; padding:8px 12px;
    font-size:10.5px; color:#6b7280;
  }
  .admin-live-dot{
    width:6px; height:6px; border-radius:50%;
    background:#2DD4A7; flex-shrink:0;
    animation: pulseDot 2s ease-in-out infinite;
  }
  .admin-live-dot.has-pending{ background:#FFA23A; }
  @keyframes pulseDot{ 0%,100%{ opacity:1; } 50%{ opacity:0.4; } }

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
