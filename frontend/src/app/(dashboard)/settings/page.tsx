"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/authStore"

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(15,20,36,0.6)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#fff" }}>{title}</span>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ch-text-3)" }}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ type = "text", placeholder, defaultValue }: { type?: string; placeholder?: string; defaultValue?: string }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      style={{
        width: "100%", boxSizing: "border-box",
        padding: "9px 12px", borderRadius: 9, fontSize: 13,
        background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)",
        color: "#fff", outline: "none", fontFamily: "inherit",
      }}
      onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(59,130,246,0.4)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)" }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.boxShadow = "none" }}
    />
  )
}

function Btn({ children, onClick, variant = "default", disabled }: { children: React.ReactNode; onClick?: () => void; variant?: "default" | "danger" | "ghost"; disabled?: boolean }) {
  const styles: Record<string, React.CSSProperties> = {
    default: { background: "linear-gradient(180deg, rgba(59,130,246,0.85), rgba(37,99,235,0.85))", border: "1px solid rgba(59,130,246,0.5)", color: "#fff", boxShadow: "0 4px 14px rgba(59,130,246,0.25)" },
    danger:  { background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--ch-red)", boxShadow: "none" },
    ghost:   { background: "rgba(255,255,255,0.04)", border: "1px solid var(--line)", color: "var(--ch-text-2)", boxShadow: "none" },
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer", fontFamily: "inherit",
        opacity: disabled ? 0.5 : 1, transition: "all 150ms",
        ...styles[variant],
      }}
    >
      {children}
    </button>
  )
}

type Theme = "dark" | "light" | "system"

function ThemeButton({ id, label, icon, current, onClick }: { id: Theme; label: string; icon: React.ReactNode; current: Theme; onClick: () => void }) {
  const on = current === id
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        padding: "14px 10px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
        background: on ? "rgba(59,130,246,0.12)" : "rgba(255,255,255,0.03)",
        border: "1px solid " + (on ? "rgba(59,130,246,0.4)" : "var(--line)"),
        color: on ? "var(--ch-blue-2)" : "var(--ch-text-2)",
        fontWeight: on ? 600 : 400, fontSize: 13, transition: "all 150ms",
      }}
    >
      {icon}
      {label}
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { logout } = useAuthStore()
  const [theme, setTheme] = useState<Theme>("dark")
  const [saved, setSaved] = useState(false)

  async function handleLogout() {
    await logout()
    router.push("/login")
  }

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Page title */}
      <div style={{ marginBottom: 4 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#fff", margin: 0, lineHeight: 1 }}>Configuración</h1>
        <p style={{ fontSize: 13, color: "var(--ch-text-3)", margin: "6px 0 0" }}>Administra tu cuenta y preferencias de la aplicación</p>
      </div>

      {/* Profile */}
      <Section title="Perfil">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px", borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid var(--line)", marginBottom: 4 }}>
            <div style={{
              width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              display: "grid", placeItems: "center",
              fontSize: 18, fontWeight: 700, color: "#fff",
            }}>
              AD
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>Administrador</div>
              <div style={{ fontSize: 12, color: "var(--ch-text-3)", marginTop: 2 }}>admin@controlcenter.io</div>
              <div style={{ fontSize: 11, color: "var(--ch-text-4)", marginTop: 4 }}>Rol: Administrador</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Field label="Nombre completo">
              <TextInput placeholder="Tu nombre" defaultValue="Administrador" />
            </Field>
            <Field label="Email">
              <TextInput type="email" placeholder="tu@email.com" defaultValue="admin@controlcenter.io" />
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn onClick={handleSave}>
              {saved ? (
                <>
                  <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  Guardado
                </>
              ) : "Guardar cambios"}
            </Btn>
          </div>
        </div>
      </Section>

      {/* Security */}
      <Section title="Seguridad">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", fontSize: 12.5, color: "var(--ch-green-2)" }}>
            <svg viewBox="0 0 24 24" style={{ width: 14, height: 14, flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Sesión activa y autenticada correctamente
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
            <Field label="Contraseña actual">
              <TextInput type="password" placeholder="••••••••" />
            </Field>
            <Field label="Nueva contraseña">
              <TextInput type="password" placeholder="••••••••" />
            </Field>
            <Field label="Confirmar contraseña">
              <TextInput type="password" placeholder="••••••••" />
            </Field>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Btn>Cambiar contraseña</Btn>
            <Btn variant="ghost">
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>
              </svg>
              Habilitar 2FA
            </Btn>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Apariencia">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ch-text-3)" }}>Selecciona el tema de la aplicación</p>
          <div style={{ display: "flex", gap: 10 }}>
            <ThemeButton
              id="dark" label="Oscuro" current={theme} onClick={() => setTheme("dark")}
              icon={<svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}
            />
            <ThemeButton
              id="light" label="Claro" current={theme} onClick={() => setTheme("light")}
              icon={<svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>}
            />
            <ThemeButton
              id="system" label="Sistema" current={theme} onClick={() => setTheme("system")}
              icon={<svg viewBox="0 0 24 24" style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>}
            />
          </div>
        </div>
      </Section>

      {/* Session */}
      <Section title="Sesión">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 14, rowGap: 8, fontSize: 13 }}>
            <span style={{ color: "var(--ch-text-3)" }}>Usuario</span>
            <span style={{ color: "#fff" }}>admin@controlcenter.io</span>
            <span style={{ color: "var(--ch-text-3)" }}>Rol</span>
            <span style={{ color: "#fff" }}>Administrador</span>
            <span style={{ color: "var(--ch-text-3)" }}>Autenticación</span>
            <span style={{ color: "var(--ch-green-2)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              <svg viewBox="0 0 24 24" style={{ width: 12, height: 12 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              JWT + Cookie segura
            </span>
          </div>
          <div style={{ marginTop: 4 }}>
            <Btn variant="danger" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" style={{ width: 14, height: 14 }} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Cerrar sesión
            </Btn>
          </div>
        </div>
      </Section>
    </div>
  )
}
