// components/AdminLayout.js
import Link from 'next/link';
import { useRouter } from 'next/router';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/deposits', label: 'Deposits' },
  { href: '/admin/withdrawals', label: 'Withdrawals' },
  { href: '/admin/kyc', label: 'KYC Verification' },
  { href: '/admin/support', label: 'Support Chat' },
  { href: '/admin/records', label: 'All Records' },
];

export default function AdminLayout({ title, children }) {
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/admin/login');
  }

  return (
    <div style={styles.shell}>
      <style>{globalStyles}</style>
      <div style={styles.sidebar}>
        <div style={styles.logo}>
          BIG MARKET <span style={{ color: '#FF6A00' }}>HUB</span>
          <br />
          <small style={{ fontWeight: 400, color: '#9aa0aa' }}>Admin Panel</small>
        </div>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                ...styles.navLink,
                ...(router.pathname === item.href ? styles.navLinkActive : {}),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div style={styles.main}>
        <div style={styles.topbar}>
          <h1 style={{ fontSize: 20, margin: 0 }}>{title}</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>Log out</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const globalStyles = `
  body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#0b0d12; color:#fff; }
  table { width:100%; border-collapse:collapse; background:#14161c; border-radius:10px; overflow:hidden; }
  th, td { padding:11px 14px; text-align:left; font-size:13px; border-bottom:1px solid rgba(255,255,255,.06); }
  th { color:#9aa0aa; font-size:11px; text-transform:uppercase; letter-spacing:.4px; }
  .badge { padding:3px 10px; border-radius:999px; font-size:10.5px; font-weight:700; text-transform:uppercase; }
  .badge-pending { background:rgba(255,162,58,.15); color:#FFA23A; }
  .badge-approved, .badge-active { background:rgba(45,212,167,.15); color:#2DD4A7; }
  .badge-rejected, .badge-banned { background:rgba(255,71,71,.15); color:#FF4747; }
  .badge-suspended { background:rgba(255,162,58,.15); color:#FFA23A; }
  .btn { display:inline-block; padding:6px 12px; border-radius:7px; font-size:12px; font-weight:700; text-decoration:none; border:none; cursor:pointer; margin-right:5px; }
  .btn-approve { background:#2DD4A7; color:#04231b; }
  .btn-reject { background:#FF4747; color:#2a0505; }
  .btn-neutral { background:rgba(255,255,255,.08); color:#fff; }
  input[type=text], input[type=password], textarea { width:100%; padding:10px 12px; border-radius:8px; border:1px solid rgba(255,255,255,.15); background:rgba(255,255,255,.03); color:#fff; font-size:13px; margin-bottom:10px; box-sizing:border-box; }
  .empty-state { text-align:center; padding:40px; color:#9aa0aa; }
`;

const styles = {
  shell: { display: 'flex', minHeight: '100vh' },
  sidebar: { width: 220, background: '#0a0b0f', borderRight: '1px solid rgba(255,255,255,.08)', padding: '22px 14px', flexShrink: 0 },
  logo: { fontWeight: 800, fontSize: 16, marginBottom: 26, padding: '0 8px' },
  navLink: { display: 'block', padding: '10px 12px', marginBottom: 4, borderRadius: 8, color: '#9aa0aa', textDecoration: 'none', fontSize: 13.5, fontWeight: 600 },
  navLinkActive: { background: 'rgba(255,106,0,0.12)', color: '#fff' },
  main: { flex: 1, padding: '26px 32px', maxWidth: 1200 },
  topbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  logoutBtn: { background: 'rgba(255,71,71,.12)', border: '1px solid rgba(255,71,71,.3)', color: '#ff6b6b', padding: '8px 16px', borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: 'pointer' },
};
