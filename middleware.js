import { NextResponse } from 'next/server';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const requestId = crypto.randomUUID();
  const now = new Date().toUTCString();

  // API routes ke liye real server jaisa JSON error
  if (pathname.startsWith('/api')) {
    return NextResponse.json(
      {
        error: {
          code: 'INSUFFICIENT_STORAGE',
          status: 507,
          message: 'The server is unable to store the representation needed to complete the request. Storage quota exceeded.',
          requestId: requestId,
          timestamp: now,
        },
      },
      {
        status: 507,
        headers: { 'cache-control': 'no-store', 'retry-after': '3600' },
      }
    );
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>507: INSUFFICIENT_STORAGE</title>
  <style>
    * { box-sizing: border-box; }
    body { margin:0; background:#0a0d12; color:#e6e9ee; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
           min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; }
    .wrap { max-width:640px; width:100%; }
    .status { display:flex; align-items:center; gap:14px; margin-bottom:18px; }
    .code { font-size:44px; font-weight:700; padding-right:14px; border-right:1px solid #2a303a; line-height:1; }
    .title { font-size:16px; color:#c9cfd8; }
    p { color:#8b94a3; line-height:1.6; font-size:14px; margin:0 0 18px; }
    .meta { font-family: ui-monospace, Menlo, Consolas, monospace; font-size:12px; color:#6f7887;
            background:#11151c; border:1px solid #1e242d; border-radius:8px; padding:12px 14px; margin-bottom:26px; word-break:break-all; }
    .meta div { margin:2px 0; }
    .game-title { font-size:12px; color:#6f7887; margin-bottom:8px; }
    canvas { width:100%; background:#0d1117; border:1px solid #1e242d; border-radius:8px; display:block; touch-action:manipulation; }
    .hint { font-size:11px; color:#556; margin-top:6px; text-align:center; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="status">
      <div class="code">507</div>
      <div class="title">Insufficient Storage</div>
    </div>
    <p>The server is unable to store the representation needed to complete this request. The storage quota for this deployment has been exceeded. If you are the owner of this project, upgrade your plan or free up space and try again.</p>
    <div class="meta">
      <div>Code: INSUFFICIENT_STORAGE</div>
      <div>ID: ${requestId}</div>
      <div>Time: ${now}</div>
    </div>

    <div class="game-title">While you wait &mdash; press SPACE or tap to jump</div>
    <canvas id="g" height="150"></canvas>
    <div class="hint">Score: <span id="s">0</span> &nbsp;|&nbsp; Best: <span id="b">0</span></div>
  </div>

  <script>
    (function () {
      var c = document.getElementById('g');
      var x = c.getContext('2d');
      c.width = 600; c.height = 150;
      var sEl = document.getElementById('s');
      var bEl = document.getElementById('b');
      var GROUND = 132;
      var p, obs, speed, score, over, best = 0, gap;

      function reset() {
        p = { x: 40, y: GROUND - 22, w: 22, h: 22, vy: 0, on: true };
        obs = []; speed = 5; score = 0; over = false; gap = 250;
      }
      function jump() {
        if (over) { reset(); return; }
        if (p.on) { p.vy = -11; p.on = false; }
      }
      document.addEventListener('keydown', function (e) {
        if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
      });
      c.addEventListener('pointerdown', function (e) { e.preventDefault(); jump(); });

      function update() {
        if (over) return;
        p.vy += 0.6;
        p.y += p.vy;
        if (p.y >= GROUND - p.h) { p.y = GROUND - p.h; p.vy = 0; p.on = true; }

        var last = obs[obs.length - 1];
        if (!last || c.width - last.x > gap) {
          var h = 18 + Math.random() * 24;
          obs.push({ x: c.width, w: 12 + Math.random() * 14, h: h });
          gap = 220 + Math.random() * 220;
        }
        for (var i = 0; i < obs.length; i++) obs[i].x -= speed;
        while (obs.length && obs[0].x + obs[0].w < 0) obs.shift();

        for (var j = 0; j < obs.length; j++) {
          var o = obs[j];
          var oy = GROUND - o.h;
          if (p.x < o.x + o.w && p.x + p.w > o.x && p.y < oy + o.h && p.y + p.h > oy) {
            over = true;
            if (score > best) best = Math.floor(score);
          }
        }
        score += 0.15;
        speed += 0.002;
      }

      function draw() {
        x.clearRect(0, 0, c.width, c.height);
        x.fillStyle = '#2a303a';
        x.fillRect(0, GROUND, c.width, 2);
        x.fillStyle = '#ff7a00';
        x.fillRect(p.x, p.y, p.w, p.h);
        x.fillStyle = '#9aa4b2';
        for (var i = 0; i < obs.length; i++) {
          x.fillRect(obs[i].x, GROUND - obs[i].h, obs[i].w, obs[i].h);
        }
        if (over) {
          x.fillStyle = '#e6e9ee';
          x.font = '16px Arial';
          x.textAlign = 'center';
          x.fillText('Game over - press SPACE or tap to restart', c.width / 2, 70);
        }
        sEl.textContent = Math.floor(score);
        bEl.textContent = best;
      }

      function loop() { update(); draw(); requestAnimationFrame(loop); }
      reset();
      loop();
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 507,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'retry-after': '3600',
    },
  });
}

export const config = {
  matcher: '/:path*',
};
