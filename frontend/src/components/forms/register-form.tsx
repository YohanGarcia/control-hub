"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { registerSchema, type RegisterInput } from "@/lib/schemas"
import { useAuthStore } from "@/stores/authStore"
import { useRouter } from "next/navigation"

const IS = {
  input: {
    width: '100%', padding: '11px 12px 11px 38px', paddingRight: 12,
    background: 'rgba(255,255,255,0.025)', border: '1px solid #1f2940', borderRadius: 10,
    color: '#fff', fontSize: 13.5, outline: 'none',
    transition: 'border-color 160ms, box-shadow 160ms, background 160ms',
    fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' as const,
  },
} as const;

const onFocusIn = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'rgba(59,130,246,0.55)';
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.18)';
  e.currentTarget.style.background = 'rgba(59,130,246,0.04)';
};
const onFocusOut = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = '#1f2940';
  e.currentTarget.style.boxShadow = 'none';
  e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
};

function scorePassword(pw: string) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
}
const strengthColors = ['#ef4444', '#f59e0b', '#f59e0b', '#4ade80', '#4ade80'];
const strengthLabels = ['Muy débil', 'Débil', 'Aceptable', 'Fuerte', 'Excelente'];

export function RegisterForm() {
  const router = useRouter()
  const { register: registerUser, isLoading, error } = useAuthStore()
  const [showPw, setShowPw] = useState(false)
  const [terms, setTerms] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "", full_name: "" },
  })

  const pw = watch("password", "")
  const score = scorePassword(pw)
  const name = watch("full_name", "")
  const email = watch("email", "")
  const canSubmit = name && email && pw && terms && score >= 2;

  const onSubmit = async (data: RegisterInput) => {
    if (!terms) return;
    try { await registerUser(data.email, data.password, data.full_name); router.push("/login") }
    catch { /* handled by store */ }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ width: '100%' }}>
      <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -0.4 }}>Crea tu cuenta</h2>
      <p style={{ marginTop: 6, marginBottom: 22, fontSize: 14, color: '#aab3c8' }}>14 días gratis · sin tarjeta · cancela cuando quieras.</p>

      {/* SSO */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        {[
          { label: 'Continuar con Google', path: 'M21.35 11.1H12v2.94h5.35c-.23 1.38-1.7 4.04-5.35 4.04a5.96 5.96 0 010-11.92c1.86 0 3.11.79 3.82 1.47l2.6-2.5C16.86 3.7 14.7 2.7 12 2.7a9.3 9.3 0 100 18.6c5.36 0 8.93-3.76 8.93-9.06 0-.6-.07-1.06-.16-1.5z' },
          { label: 'Continuar con GitHub', path: 'M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.27-1.68-1.27-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.02 1.75 2.67 1.24 3.32.95.1-.74.4-1.24.72-1.53-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.18a10.86 10.86 0 015.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.66.8.55C20.21 21.39 23.5 17.08 23.5 12 23.5 5.65 18.35.5 12 .5z' },
        ].map(({ label, path }) => (
          <button key={label} type="button" className="auth-sso-btn">
            <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}><path fill="#fff" d={path}/></svg>
            {label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
        <div style={{ flex: 1, height: 1, background: '#1f2940' }}/>
        <span style={{ fontSize: 11, color: '#6b7591', letterSpacing: 1.1, textTransform: 'uppercase' }}>o con tu correo</span>
        <div style={{ flex: 1, height: 1, background: '#1f2940' }}/>
      </div>

      {error && (
        <div style={{ padding: '10px 12px', marginBottom: 14, borderRadius: 9, background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 12.5 }}>
          {error}
        </div>
      )}

      {/* Name + Org grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <label className="auth-field">
          <span className="auth-field-label">Nombre completo</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7591', display: 'inline-flex', pointerEvents: 'none' }}>
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></svg>
            </span>
            <input {...register("full_name")} type="text" placeholder="Ada Lovelace" style={IS.input} onFocus={onFocusIn} onBlur={onFocusOut} />
          </div>
          {errors.full_name && <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 5 }}>{errors.full_name.message}</div>}
        </label>

        <label className="auth-field">
          <span className="auth-field-label">Organización</span>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7591', display: 'inline-flex', pointerEvents: 'none' }}>
              <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="4" y="4" width="16" height="17" rx="1.5"/><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M9 16h.01M15 16h.01M10 21v-3h4v3"/></svg>
            </span>
            <input type="text" placeholder="Acme Inc." style={IS.input} onFocus={onFocusIn} onBlur={onFocusOut} />
          </div>
          <div style={{ fontSize: 11.5, color: '#6b7591', marginTop: 5 }}>Opcional · puedes invitar a tu equipo después</div>
        </label>
      </div>

      {/* Email */}
      <label className="auth-field">
        <span className="auth-field-label">Correo de trabajo</span>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7591', display: 'inline-flex', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>
          </span>
          <input {...register("email")} type="email" placeholder="tu@empresa.com" style={IS.input} onFocus={onFocusIn} onBlur={onFocusOut} />
        </div>
        {errors.email && <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 5 }}>{errors.email.message}</div>}
      </label>

      {/* Password */}
      <label className="auth-field">
        <span className="auth-field-label">Contraseña</span>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#6b7591', display: 'inline-flex', pointerEvents: 'none' }}>
            <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
          </span>
          <input {...register("password")} type={showPw ? 'text' : 'password'} placeholder="Crea una contraseña fuerte"
            style={{ ...IS.input, paddingRight: 44 }} onFocus={onFocusIn} onBlur={onFocusOut} />
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}>
            <button type="button" onClick={() => setShowPw(s => !s)}
              style={{ width: 30, height: 30, borderRadius: 7, border: 0, background: 'transparent', color: '#6b7591', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
              onMouseEnter={e => e.currentTarget.style.color = '#e6ebf5'}
              onMouseLeave={e => e.currentTarget.style.color = '#6b7591'}>
              {showPw
                ? <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M3 3l18 18"/><path d="M10.6 6.1A10 10 0 0112 6c6.5 0 10 6 10 6a18 18 0 01-3.2 3.9M6.6 6.6A18 18 0 002 12s3.5 6 10 6a10 10 0 003.4-.6"/><path d="M14.1 14.1A3 3 0 019.9 9.9"/></svg>
                : <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>}
            </button>
          </span>
        </div>
        {errors.password && <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 5 }}>{errors.password.message}</div>}
        {/* Strength meter */}
        <div style={{ marginTop: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 3, background: i < score ? strengthColors[score] : 'rgba(255,255,255,0.05)', transition: 'background 160ms' }}/>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: '#6b7591' }}>Mínimo 8 caracteres con número y mayúscula</span>
            <span style={{ fontSize: 11, color: pw ? strengthColors[score] : '#6b7591' }}>{pw ? strengthLabels[score] : ''}</span>
          </div>
        </div>
      </label>

      {/* Terms */}
      <div style={{ margin: '20px 0' }}>
        <label style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
          <span onClick={() => setTerms(!terms)} style={{
            width: 18, height: 18, borderRadius: 5, cursor: 'pointer',
            border: `1px solid ${terms ? 'rgba(59,130,246,0.6)' : '#2a3654'}`,
            background: terms ? 'linear-gradient(180deg, #3b82f6, #2f6ed1)' : 'rgba(255,255,255,0.02)',
            display: 'grid', placeItems: 'center', marginTop: 1,
            boxShadow: terms ? '0 0 10px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18)' : 'none',
            transition: 'all 160ms',
          }}>
            {terms && <svg viewBox="0 0 24 24" style={{ width: 11, height: 11, fill: 'none', stroke: '#fff', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 12l4 4 10-10"/></svg>}
          </span>
          <span style={{ fontSize: 12.5, color: '#aab3c8', lineHeight: 1.45 }}>
            Acepto los <a href="#" className="auth-blue-link">términos del servicio</a> y la <a href="#" className="auth-blue-link">política de privacidad</a>.
          </span>
        </label>
      </div>

      <button type="submit" disabled={!canSubmit || isLoading} className="auth-primary-btn"
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 10,
          background: (!canSubmit || isLoading) ? 'rgba(255,255,255,0.06)' : 'linear-gradient(180deg, #3b82f6, #2f6ed1)',
          color: (!canSubmit || isLoading) ? '#6b7591' : '#fff', border: 0,
          fontSize: 14, fontWeight: 600, cursor: (!canSubmit || isLoading) ? 'not-allowed' : 'pointer',
          boxShadow: (!canSubmit || isLoading) ? 'none' : '0 8px 22px rgba(59,130,246,0.35), inset 0 1px 0 rgba(255,255,255,0.18)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          fontFamily: 'Inter, sans-serif',
        }}>
        {isLoading ? 'Creando cuenta...' : (
          <>Crear cuenta <svg viewBox="0 0 24 24" style={{ width: 15, height: 15, fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' }}><path d="M5 12h14M13 6l6 6-6 6"/></svg></>
        )}
      </button>

      <p style={{ marginTop: 22, fontSize: 13, color: '#6b7591', textAlign: 'center' }}>
        ¿Ya tienes cuenta?{' '}
        <a href="/login" className="auth-blue-link" style={{ fontWeight: 500 }}>Inicia sesión</a>
      </p>
    </form>
  )
}