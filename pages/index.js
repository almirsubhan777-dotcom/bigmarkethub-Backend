// pages/index.js
export default function Home() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0b0d12', color: '#fff', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 20,
    }}>
      <div>
        <h1 style={{ fontSize: 22, marginBottom: 8 }}>
          BIG MARKET <span style={{ color: '#FF6A00' }}>HUB</span>
        </h1>
        <p style={{ color: '#9aa0aa', fontSize: 14, marginBottom: 24 }}>Backend API is running ✅</p>
        <a
          href="/admin/login"
          style={{
            display: 'inline-block', padding: '12px 24px', borderRadius: 10,
            background: 'linear-gradient(90deg,#FF6A00,#FFA23A)', color: '#fff',
            textDecoration: 'none', fontWeight: 700, fontSize: 14,
          }}
        >
          Open Admin Panel
        </a>
      </div>
    </div>
  );
}
