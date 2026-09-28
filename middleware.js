import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // API routes ke liye JSON error
  if (pathname.startsWith('/api')) {
    return NextResponse.json(
      {
        error: 'Storage Full',
        message: 'Your storage is full. Please upgrade your plan to continue.',
      },
      { status: 507 }
    );
  }

  // Baaki pages (admin login waghaira) ke liye HTML page
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Storage Full</title>
  <style>
    body { margin:0; background:#0a0d12; color:#fff; font-family:Arial,sans-serif;
           display:flex; align-items:center; justify-content:center; height:100vh; }
    .box { background:#11151c; padding:40px; border-radius:16px; text-align:center; max-width:420px; }
    h1 { margin:0 0 10px; font-size:22px; }
    p { color:#9aa4b2; }
    a { display:inline-block; margin-top:20px; padding:12px 28px; border-radius:8px;
        background:linear-gradient(90deg,#ff6a00,#ff9a2e); color:#fff; text-decoration:none; font-weight:bold; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Your storage is full</h1>
    <p>Please upgrade your plan to continue using this service.</p>
    <a href="#">Upgrade Now</a>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 507,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}

export const config = {
  matcher: '/:path*',
};
