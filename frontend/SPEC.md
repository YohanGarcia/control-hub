# Control Hub - Frontend Web Specification

## 1. Overview

**Project Name:** Control Hub Web
**Type:** Single Page Application (SPA) with Server-Side Rendering capabilities
**Purpose:** Web dashboard for monitoring and controlling remote Windows/Linux devices
**Target Users:** System administrators and DevOps engineers

---

## 2. Technology Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui + framer-motion |
| UI Library | TripleD UI (shadcn/ui + framer-motion animations) |
| State Management | Zustand |
| Data Fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Terminal | xterm.js |
| WebSocket | Native WebSocket with reconnection logic |
| Theme | next-themes (light/dark/system) |
| Package Manager | Bun |

---

## 3. Architecture

### 3.1 Directory Structure

```
frontend/
├── app/
│   ├── (auth)/                     # Auth routes group
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── (dashboard)/                # Protected routes group
│   │   ├── layout.tsx              # Dashboard shell (sidebar)
│   │   ├── page.tsx                # Dashboard home
│   │   ├── devices/
│   │   │   ├── page.tsx            # Devices list
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Device detail
│   │   ├── terminal/
│   │   │   └── [id]/
│   │   │       └── page.tsx        # Terminal + AI (selector)
│   │   ├── inventory/
│   │   │   └── page.tsx            # Inventory list
│   │   ├── settings/
│   │   │   ├── page.tsx            # General settings
│   │   │   └── team/
│   │   │       └── page.tsx        # Team management
│   │   └── audit/
│   │       └── page.tsx            # Audit log
│   ├── api/                        # API routes (if needed)
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Global styles
├── components/
│   ├── ui/                         # TripleD/shadcn base components
│   ├── layout/                     # Shell, Sidebar, Header, NotificationsPanel
│   ├── dashboard/                  # Dashboard widgets
│   ├── devices/                    # Device-related components
│   ├── terminal/                   # Terminal emulator
│   ├── forms/                      # Reusable form components
│   └── shared/                     # EmptyState, LoadingSpinner, ErrorModal
├── lib/
│   ├── api/
│   │   ├── client.ts              # HTTP client with interceptors
│   │   ├── auth.ts                # Auth endpoints
│   │   ├── devices.ts             # Devices endpoints
│   │   ├── organizations.ts        # Organizations endpoints
│   │   └── ws.ts                  # WebSocket client
│   ├── schemas/                    # Zod validation schemas
│   └── utils.ts                    # Utilities
├── hooks/                          # Custom React hooks
├── stores/                         # Zustand stores
└── public/                         # Static assets
```

### 3.2 API Integration

**Base URL:** `http://localhost:8000/api/v1` (configurable via env)

#### Authentication Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | Public |
| POST | `/auth/login` | Login (email, password, totp_code) | Public |
| POST | `/auth/refresh` | Refresh access token | Public |
| POST | `/auth/logout` | Logout | Public |
| POST | `/auth/setup-2fa` | Setup TOTP 2FA | Public |
| POST | `/auth/change-password` | Change password | Public |

#### Devices Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/devices` | List all devices | JWT |
| POST | `/devices` | Create device | JWT + Admin |
| PATCH | `/devices/{id}` | Update device | JWT + Admin |
| GET | `/devices/{id}/status` | Get status + latest metric | JWT |
| GET | `/devices/{id}/metrics` | Get metrics history | JWT |
| GET | `/devices/{id}/actions` | List available actions | JWT |
| POST | `/devices/{id}/actions/{action_id}/run` | Run action | JWT + Operator |
| GET | `/devices/{id}/actions/history` | Action history | JWT |

#### Organizations Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/organizations` | List user organizations | JWT |
| GET | `/organizations/memberships` | Get memberships | JWT |
| POST | `/organizations` | Create organization | JWT |
| GET | `/organizations/{id}/members` | List members | JWT + Admin |
| PATCH | `/organizations/{id}/members/{user_id}` | Update member role | JWT + Admin |
| DELETE | `/organizations/{id}/members/{user_id}` | Remove member | JWT + Admin |
| POST | `/organizations/{id}/invites` | Create invite | JWT + Admin |
| GET | `/organizations/{id}/invites` | List invites | JWT + Admin |
| DELETE | `/organizations/{id}/invites/{invite_id}` | Revoke invite | JWT + Admin |
| POST | `/organizations/invites/accept` | Accept invite | JWT |
| POST | `/organizations/{id}/enrollment-tokens` | Create enrollment token | JWT + Admin |
| GET | `/organizations/{id}/enrollment-tokens` | List tokens | JWT + Admin |
| DELETE | `/organizations/{id}/enrollment-tokens/{token_id}` | Revoke token | JWT + Admin |
| POST | `/agent/enroll` | Enroll agent (public) | Token |

#### Audit Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/audit/events` | Get audit events | JWT + Org |

#### WebSocket Endpoints

| Endpoint | Purpose | Auth |
|----------|---------|------|
| `/ws/client?token=<jwt>&organization_id=<id>` | Client connection (dashboard, terminal, AI) | JWT |
| `/ws/agent?device_id=<id>&agent_key=<key>&ts=<ts>&nonce=<n>&sig=<sig>` | Agent connection (devices) | HMAC |

#### WebSocket Client Messages

| Type | Direction | Description |
|------|-----------|-------------|
| `client.terminal.start` | Client → Server | Start terminal session |
| `client.terminal.input` | Client → Server | Send terminal input |
| `client.terminal.stop` | Client → Server | Stop terminal session |
| `client.ai.start` | Client → Server | Start AI session |
| `client.ai.message` | Client → Server | Send AI message |
| `client.ai.stop` | Client → Server | Stop AI session |
| `server.terminal.started` | Server → Client | Terminal started |
| `server.terminal.output` | Server → Client | Terminal output |
| `server.terminal.exit` | Server → Client | Terminal exited |
| `server.ai.delta` | Server → Client | AI streaming response |
| `server.ai.done` | Server → Client | AI response complete |
| `client.device.status.updated` | Server → Client | Device status changed |
| `client.device.metric.updated` | Server → Client | New device metric |

---

## 4. UI/UX Specification

### 4.1 Design System

**Material Design 3** principles with the following tokens:

#### Colors

**Dark Theme (Default for sysadmins):**

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#050816` | Page background |
| Surface | `#0B1120` | Cards, panels |
| Surface Raised | `#101827` | Elevated elements |
| Text Primary | `#F8FAFC` | Headings, body text |
| Text Secondary | `#94A3B8` | Muted text |
| Accent Primary | `#3B82F6` | Primary actions, links |
| Accent Success | `#22C55E` | Online status, success |
| Accent Warning | `#F59E0B` | Warnings |
| Accent Error | `#EF4444` | Errors, offline status |
| Metric CPU | `#3B82F6` | CPU charts |
| Metric RAM | `#22C55E` | RAM charts |
| Metric Disk | `#A855F7` | Disk charts |

**Light Theme:**

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#F3F6FC` | Page background |
| Surface | `#FFFFFF` | Cards, panels |
| Text Primary | `#0D1B33` | Headings, body text |
| Text Secondary | `#64748B` | Muted text |
| Accent Primary | `#2563EB` | Primary actions |

#### Typography

- Font Family: System font stack (Inter as fallback)
- Scale: Material Design 3 type scale

#### Spacing

- Base unit: 4px
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 64

#### Border Radius

- Small: 8px (inputs, buttons)
- Medium: 12px (cards)
- Large: 16px (modals, panels)

#### Shadows

- Elevation 1: Card shadow
- Elevation 2: Dropdown shadow
- Elevation 3: Modal shadow

### 4.2 Layout Structure

#### Navigation: Collapsible Sidebar

- Width expanded: 260px
- Width collapsed: 72px (icons only)
- Toggle button at bottom of sidebar
- Collapsible via hamburger icon or button
- Mobile: transforms to drawer overlay

#### Dashboard Layout

```
┌─────────────────────────────────────────────────┐
│ [Sidebar]  │  [Header: Search + User + Theme]   │
│            │─────────────────────────────────────│
│  - Logo    │                                     │
│  - Nav     │  [Main Content Area]                │
│  - Items   │                                     │
│            │                                     │
│            │─────────────────────────────────────│
│            │  [Footer: Version + Status]          │
└─────────────────────────────────────────────────┘
```

#### Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 768px | Drawer sidebar, stacked cards |
| Tablet | 768px - 1023px | Collapsible sidebar |
| Desktop | 1024px - 1439px | Expanded sidebar |
| Large | >= 1440px | Expanded sidebar + more space |

### 4.3 Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | LoginPage | Centered full-screen login |
| `/register` | RegisterPage | Centered full-screen registration |
| `/` | DashboardPage | Overview with stats and charts |
| `/devices` | DevicesPage | Devices list with filters |
| `/devices/[id]` | DeviceDetailPage | Device detail with tabs |
| `/terminal/[id]` | TerminalPage | Terminal + AI (selector) |
| `/inventory` | InventoryPage | Full device inventory |
| `/settings` | SettingsPage | User settings |
| `/settings/team` | TeamPage | Team management |
| `/audit` | AuditPage | Audit log |

### 4.4 Components

#### Core Components

| Component | Description | States |
|-----------|-------------|--------|
| `Sidebar` | Collapsible navigation sidebar | Expanded, Collapsed, Mobile Drawer |
| `Header` | Top bar with search, user menu, theme toggle | Default |
| `NotificationsPanel` | Slide-out panel for notifications | Open, Closed |
| `LoadingSpinner` | Spinner with message text | Default, Custom message |
| `ErrorModal` | Modal dialog for errors with retry option | Open, Closed |
| `EmptyState` | Placeholder for empty lists | Default, With action |

#### Dashboard Components

| Component | Description |
|-----------|-------------|
| `StatCard` | Card showing a metric (icon, value, label, trend) |
| `MetricChart` | Area/Line chart for CPU/RAM/Disk |
| `DevicesTable` | Table with device list and status |

#### Device Components

| Component | Description |
|-----------|-------------|
| `DeviceCard` | Card with device info, status badge, metrics pills |
| `DeviceStatusBadge` | Badge showing online/offline with color |
| `MetricsPill` | Small pill showing CPU/RAM/DISK percentage |
| `ActionsList` | List of available actions for a device |
| `ActionRunButton` | Button to execute an action |

#### Terminal Components

| Component | Description |
|-----------|-------------|
| `TerminalEmulator` | xterm.js based terminal |
| `TerminalTabs` | Tabs for switching Terminal/AI |
| `AIChat` | Chat interface for AI assistant |

#### Form Components

| Component | Description |
|-----------|-------------|
| `LoginForm` | Email, password, TOTP (optional) |
| `RegisterForm` | Email, password, full name |
| `DeviceForm` | Create/edit device form |
| `InviteForm` | Invite team member form |
| `FilterSidebar` | Sidebar with filter inputs |

### 4.5 User Flows

#### Login Flow

1. User navigates to `/login`
2. Enters email + password
3. If 2FA enabled, enters TOTP code
4. On success, redirect to `/`
5. JWT stored in httpOnly cookie

#### Device Monitoring Flow

1. User sees dashboard with stats overview
2. Clicks `/devices` to see all devices
3. Filters by status/type using sidebar filters
4. Clicks device card → `/devices/[id]`
5. Views real-time metrics via WebSocket
6. Can run actions or open terminal

#### Terminal/AI Flow

1. User navigates to `/terminal/[id]`
2. Selects tab: "Terminal" or "AI Assistant"
3. Terminal: Full xterm.js terminal via WebSocket
4. AI: Chat interface with streaming responses

#### Onboarding Flow (Wizard)

1. First login shows welcome wizard
2. Step 1: Welcome + overview
3. Step 2: Create or join organization
4. Step 3: Add first device (instructions)
5. Step 4: Dashboard tutorial
6. Complete → redirect to dashboard

---

## 5. SEO Specification

### 5.1 Metadata

```typescript
const metadata = {
  title: {
    default: 'Control Hub',
    template: '%s | Control Hub'
  },
  description: 'Monitoriza y controla dispositivos Windows/Linux remotos desde una plataforma unificada. Gestiona tu infraestructura de manera centralizada con métricas en tiempo real, terminal interactivo y asistencia IA.',
  keywords: [
    'monitorización',
    'control remoto',
    'dispositivos',
    'sysadmin',
    'remote monitoring',
    'device management'
  ],
  authors: [{ name: 'Control Hub Team' }],
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: process.env.NEXT_PUBLIC_URL || 'https://controlhub.local',
    siteName: 'Control Hub',
    title: 'Control Hub',
    description: 'Plataforma de monitoreo y control de dispositivos remotos',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Control Hub',
    description: 'Plataforma de monitoreo y control de dispositivos remotos',
  },
  robots: {
    index: true,
    follow: true,
  },
}
```

### 5.2 Structured Data

- Organization schema
- WebApplication schema
- BreadcrumbList for navigation

### 5.3 Performance

- Next.js Image optimization
- Dynamic imports for heavy components (xterm.js)
- Route-based code splitting
- ISR for static pages where applicable

---

## 6. Theme Specification

### 6.1 Theme Provider

```typescript
// Using next-themes
<ThemeProvider
  attribute="class"
  defaultTheme="system"
  enableSystem
  disableTransitionOnChange
>
```

### 6.2 Theme Modes

| Mode | Behavior |
|------|----------|
| Light | Light theme only |
| Dark | Dark theme only |
| System | Follows OS preference |

### 6.3 Theme Toggle

- Located in header
- Icon button (Sun/Moon/Desktop)
- Smooth transition between themes (300ms)

---

## 7. Error Handling

### 7.1 Error States

| Scenario | Behavior |
|----------|----------|
| API Error 401 | Attempt token refresh, if fails redirect to /login |
| API Error 403 | Show error modal "No tienes permisos" |
| API Error 404 | Show 404 page |
| API Error 500 | Show error modal with retry button |
| Network Error | Show error modal "Conexión perdida", retry button |
| WebSocket Disconnect | Show banner "Reconectando...", auto-reconnect with exponential backoff |

### 7.2 Error Modal

- Modal dialog with error icon
- Title: "Error" or specific error type
- Message: Human-readable error description
- "Reintentar" button (if applicable)
- "Cerrar" button

---

## 8. Loading States

### 8.1 Spinner with Message

- Centered spinner (circular)
- Message below: "Cargando...", "Guardando...", etc.
- Used for: Page transitions, form submissions, data fetching

### 8.2 Skeleton Loaders

- For cards and lists
- Shimmer animation
- Used for: Initial page load, data refresh

---

## 9. Responsive Behavior

### 9.1 Mobile (< 768px)

- Sidebar becomes drawer (overlay)
- Cards stack vertically
- Tables become scrollable or card-based
- Bottom navigation (optional)

### 9.2 Tablet (768px - 1023px)

- Sidebar collapsible (hamburger)
- 2-column grid for cards
- Tables with horizontal scroll

### 9.3 Desktop (1024px - 1439px)

- Sidebar expanded by default
- 3-4 column grid for cards
- Full table views

### 9.4 Large (>= 1440px)

- Sidebar expanded
- 4+ column grid
- Maximum content width: 1920px

---

## 10. Security Considerations

- All API calls include JWT in Authorization header (or httpOnly cookie)
- XSS prevention via React's built-in escaping
- CSRF protection via SameSite cookies
- Input validation with Zod on all forms
- Secure WebSocket connections (WSS in production)
- No sensitive data in localStorage (use httpOnly cookies)

---

## 11. Browser Support

- Chrome/Edge: Last 2 versions
- Firefox: Last 2 versions
- Safari: Last 2 versions
- Mobile Safari iOS: 14+
- Chrome Android: Last 2 versions

---

## 12. Accessibility

- WCAG 2.1 AA compliance target
- Keyboard navigation support
- ARIA labels for interactive elements
- Focus management in modals
- Color contrast ratios met
- Screen reader friendly

---

## 13. Future Considerations (Out of Scope for MVP)

- Dark/light theme per-organization
- Custom dashboard widgets
- Device groups/tags
- Scheduled actions
- Webhook integrations
- API keys for external integrations
- Mobile native app (Flutter already exists)