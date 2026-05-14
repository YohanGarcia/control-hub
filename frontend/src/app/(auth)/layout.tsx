"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

  .auth-wrapper {
    min-height: 100vh;
    display: flex;
    align-items: stretch;
    justify-content: center;
    background:
      radial-gradient(900px 700px at 12% 8%, rgba(59,130,246,0.14), transparent 55%),
      radial-gradient(900px 700px at 88% 95%, rgba(139,92,246,0.14), transparent 55%),
      #0a0e1a;
  }

  .auth-root {
    width: 100%;
    height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    -webkit-font-smoothing: antialiased;
    color: #e6ebf5;
    display: flex;
    align-items: stretch;
    position: relative;
    overflow: hidden;
  }

  .auth-content {
    display: flex;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    position: relative;
    z-index: 1;
  }

  .auth-root ::selection { background: rgba(59,130,246,0.35); color: #fff; }

  .auth-grid-bg {
    position: absolute; inset: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
    background-size: 56px 56px, 56px 56px;
    mask-image: radial-gradient(60% 50% at 30% 30%, #000 30%, transparent 80%);
    -webkit-mask-image: radial-gradient(60% 50% at 30% 30%, #000 30%, transparent 80%);
  }

  @keyframes auth-float-a { 0%,100% { transform: translate(0,0); } 50% { transform: translate(40px,-30px); } }
  @keyframes auth-float-b { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-30px,40px); } }
  @keyframes auth-blink { 0%,100% { opacity: 1 } 50% { opacity: 0 } }
  @keyframes auth-pulse-dot { 0%,100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.55); } 50% { box-shadow: 0 0 0 5px rgba(34,197,94,0); } }

  .auth-orb-a {
    position: absolute; top: -60px; left: -40px;
    width: 360px; height: 360px; border-radius: 50%;
    background: radial-gradient(circle, rgba(59,130,246,0.32), transparent 70%);
    filter: blur(40px);
    animation: auth-float-a 10s ease-in-out infinite;
    pointer-events: none;
  }
  .auth-orb-b {
    position: absolute; bottom: -80px; right: -60px;
    width: 420px; height: 420px; border-radius: 50%;
    background: radial-gradient(circle, rgba(139,92,246,0.28), transparent 70%);
    filter: blur(50px);
    animation: auth-float-b 12s ease-in-out infinite;
    pointer-events: none;
  }
  .auth-cursor { animation: auth-blink 1s steps(2,end) infinite; }
  .auth-pulse-dot { animation: auth-pulse-dot 2s infinite; }

  .auth-left {
    flex: 1.1;
    height: 100vh;
    position: relative;
    overflow: hidden;
    border-right: none;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 48px;
    background: transparent;
    flex-shrink: 0;
  }

  .auth-right {
    flex: 1;
    height: 100vh;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow-y: auto;
    background: transparent;
    scrollbar-width: none;
  }
  .auth-right::-webkit-scrollbar { display: none; }

  /* ── RESPONSIVE ── */
  @media (max-width: 1024px) {
    .auth-left {
      flex: 0 0 42%;
      padding: 32px 36px;
    }
    .auth-left h1 {
      font-size: 32px !important;
    }
    .auth-content {
      max-width: 100%;
    }
  }

  @media (max-width: 768px) {
    .auth-root {
      height: auto;
      min-height: 100vh;
      overflow: visible;
    }
    .auth-content {
      flex-direction: column;
    }
    .auth-left {
      display: none;
    }
    .auth-right {
      height: auto;
      min-height: 100vh;
      overflow-y: visible;
    }
    .auth-wrapper {
      align-items: flex-start;
    }
  }


  .auth-input {
    width: 100%;
    padding: 11px 12px 11px 38px;
    padding-right: 12px;
    background: rgba(255,255,255,0.025);
    border: 1px solid #1f2940;
    border-radius: 10px;
    color: #fff;
    font-size: 13.5px;
    outline: none;
    transition: border-color 160ms, box-shadow 160ms, background 160ms;
    font-family: 'Inter', sans-serif;
    box-sizing: border-box;
  }
  .auth-input:focus {
    border-color: rgba(59,130,246,0.55);
    box-shadow: 0 0 0 3px rgba(59,130,246,0.18), 0 0 22px rgba(59,130,246,0.10);
    background: rgba(59,130,246,0.04);
  }
  .auth-input::placeholder { color: #4a5475; }

  .auth-sso-btn {
    flex: 1; padding: 10px 12px; border-radius: 10px;
    background: rgba(255,255,255,0.025);
    border: 1px solid #1f2940;
    color: #fff; cursor: pointer;
    display: inline-flex; align-items: center; justify-content: center; gap: 10px;
    font-size: 13px; font-weight: 500;
    transition: background 160ms, border-color 160ms;
    font-family: 'Inter', sans-serif;
  }
  .auth-sso-btn:hover { background: rgba(255,255,255,0.05); border-color: #2a3654; }

  .auth-primary-btn {
    width: 100%; padding: 12px 16px; border-radius: 10px;
    background: linear-gradient(180deg, #3b82f6, #2f6ed1);
    color: #fff; border: 0;
    font-size: 14px; font-weight: 600; cursor: pointer;
    box-shadow: 0 8px 22px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18);
    display: inline-flex; align-items: center; justify-content: center; gap: 8px;
    transition: transform 120ms ease;
    font-family: 'Inter', sans-serif;
  }
  .auth-primary-btn:hover { filter: brightness(1.07); }
  .auth-primary-btn:active { transform: scale(0.98); }
  .auth-primary-btn:disabled {
    background: rgba(255,255,255,0.06);
    color: #6b7591;
    box-shadow: none;
    cursor: not-allowed;
  }

  .auth-tab-btn {
    padding: 7px 14px; border-radius: 8px;
    border: 1px solid transparent;
    color: #6b7591;
    font-size: 13px; font-weight: 500; cursor: pointer;
    box-shadow: none;
    transition: all 160ms;
    background: transparent;
    font-family: 'Inter', sans-serif;
    text-decoration: none;
    display: inline-block;
  }
  .auth-tab-btn:hover { color: #e6ebf5; }
  .auth-tab-btn.active {
    background: linear-gradient(180deg, rgba(59,130,246,0.18), rgba(59,130,246,0.10));
    border-color: rgba(59,130,246,0.45);
    color: #fff;
    box-shadow: 0 0 14px rgba(59,130,246,0.25), inset 0 1px 0 rgba(255,255,255,0.08);
  }

  .auth-mono { font-family: 'JetBrains Mono', ui-monospace, Menlo, monospace; }

  .auth-field-label {
    display: block;
    font-size: 12.5px;
    color: #aab3c8;
    font-weight: 500;
    margin-bottom: 6px;
  }
  .auth-field { display: block; margin-bottom: 14px; }

  .auth-pill {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 6px 11px; border-radius: 999px;
    font-size: 12px; font-weight: 500;
  }

  .auth-footer-link {
    color: #6b7591;
    text-decoration: none;
    transition: color 160ms;
  }
  .auth-footer-link:hover { color: #e6ebf5; }

  .auth-blue-link { color: #60a5fa; text-decoration: none; }
  .auth-blue-link:hover { color: #93c5fd; }
`;

function LogoSvg() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 38, height: 38 }}>
      <defs>
        <linearGradient id="al-lg2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#60a5fa"/>
          <stop offset="1" stopColor="#8b5cf6"/>
        </linearGradient>
      </defs>
      <path d="M4 7 L12 3 L20 7 L20 17 L12 21 L4 17 Z" fill="url(#al-lg2)" opacity="0.18" stroke="url(#al-lg2)" strokeWidth="1.6"/>
      <path d="M4 7 L12 11 L20 7" stroke="url(#al-lg2)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 11 L12 21" stroke="url(#al-lg2)" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M5 12l4 4 10-10"/>
    </svg>
  );
}
function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}>
      <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div className="auth-wrapper">
        <div className="auth-root">
          {/* Background decorations — full width */}
          <div className="auth-orb-a"/>
          <div className="auth-orb-b"/>
          <div className="auth-grid-bg"/>

          {/* Content container — max-width */}
          <div className="auth-content">

          {/* ── LEFT PANEL ── */}
          <div className="auth-left">

          {/* Logo */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
            <LogoSvg />
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: -0.2 }}>Control Center</div>
              <div className="auth-mono" style={{ fontSize: 11, color: '#6b7591' }}>v2.4.1 · enterprise</div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ position: 'relative', maxWidth: 480 }}>
            <h1 style={{ fontSize: 42, fontWeight: 700, color: '#fff', margin: 0, lineHeight: 1.1, letterSpacing: -1 }}>
              Una sola consola para toda tu{' '}
              <span style={{ background: 'linear-gradient(90deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                infraestructura
              </span>.
            </h1>
            <p style={{ marginTop: 20, fontSize: 15, color: '#aab3c8', lineHeight: 1.55, maxWidth: 440 }}>
              Monitorea servidores, ejecuta comandos remotos y orquesta despliegues — todo desde una interfaz pensada para equipos DevOps modernos.
            </p>

            {/* Status pills */}
            <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
              <span className="auth-pill" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid #1f2940', color: '#aab3c8' }}>
                <GlobeIcon /> 162 servidores conectados
              </span>
              <span className="auth-pill" style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
                <CheckIcon /> 99.98% uptime
              </span>
              <span className="auth-pill" style={{ background: 'rgba(139,92,246,0.10)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                <ShieldIcon /> SOC 2 · ISO 27001
              </span>
            </div>

            {/* Fake Terminal */}
            <div className="auth-mono" style={{
              marginTop: 32, borderRadius: 12,
              background: 'rgba(7,10,20,0.7)', border: '1px solid #1f2940',
              boxShadow: '0 12px 36px rgba(0,0,0,0.4), 0 0 28px rgba(59,130,246,0.08)',
              backdropFilter: 'blur(8px)', overflow: 'hidden', fontSize: 12.5,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: '1px solid #1f2940', background: 'rgba(15,20,36,0.7)' }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}/>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}/>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>
                <span style={{ marginLeft: 8, fontSize: 11.5, color: '#6b7591' }}>deploy@prod-api · zsh</span>
              </div>
              <div style={{ padding: '12px 14px', lineHeight: 1.55 }}>
                <div><span style={{ color: '#4ade80' }}>admin@control:~$ </span><span style={{ color: '#fff' }}>ssh deploy@prod-api</span></div>
                <div style={{ color: '#4ade80' }}>● conexión segura establecida · ED25519</div>
                <div><span style={{ color: '#4ade80' }}>deploy@prod-api:~$ </span><span style={{ color: '#fff' }}>kubectl rollout status web</span></div>
                <div style={{ color: '#4ade80' }}>deployment "web" successfully rolled out</div>
                <div>
                  <span style={{ color: '#4ade80' }}>deploy@prod-api:~$ </span>
                  <span className="auth-cursor" style={{ display: 'inline-block', width: 7, height: 14, background: '#22c55e', verticalAlign: -2, marginLeft: 2, borderRadius: 1 }}/>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#6b7591' }}>
            <span>© 2026 Control Center, Inc.</span>
            <div style={{ display: 'flex', gap: 18 }}>
              <a href="#" className="auth-footer-link">Estado</a>
              <a href="#" className="auth-footer-link">Documentación</a>
              <a href="#" className="auth-footer-link">Privacidad</a>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-right">
          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6b7591' }}>
              <span
                className="auth-pulse-dot"
                style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 8px #22c55e' }}
              />
              Todos los sistemas operativos
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', padding: 3, gap: 0, background: 'rgba(255,255,255,0.025)', border: '1px solid #1f2940', borderRadius: 10 }}>
              <Link href="/login" className={`auth-tab-btn${pathname === '/login' ? ' active' : ''}`}>
                Iniciar sesión
              </Link>
              <Link href="/register" className={`auth-tab-btn${pathname === '/register' ? ' active' : ''}`}>
                Crear cuenta
              </Link>
            </div>
          </div>

          {/* Form area */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 40px 40px' }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
              {children}
            </div>
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 40px', fontSize: 12, color: '#4a5475' }}>
            <span>Protegido con cifrado de extremo a extremo</span>
            <a href="#" className="auth-footer-link" style={{ color: '#6b7591' }}>¿Necesitas ayuda?</a>
          </div>
        </div>
        </div>
      </div>
      </div>
    </>
  );
}
