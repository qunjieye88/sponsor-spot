# 🎯 Sponsorly

**El punto de encuentro entre eventos y marcas.**

Sponsorly es una plataforma web que conecta organizadores de eventos con sponsors y marcas. A través de un algoritmo de match inteligente, chat en tiempo real y herramientas de gestión, facilita el proceso de encontrar el patrocinio ideal para cada evento.

🌐 **URL**: [sponsor-spot.lovable.app](https://sponsor-spot.lovable.app)

---

## 📋 Tabla de contenidos

- [Características](#-características)
- [Arquitectura](#-arquitectura)
- [Tech Stack](#-tech-stack)
- [Estructura del proyecto](#-estructura-del-proyecto)
- [Base de datos](#-base-de-datos)
- [Sistema de autenticación](#-sistema-de-autenticación)
- [Algoritmo de Match](#-algoritmo-de-match)
- [Rutas de la aplicación](#-rutas-de-la-aplicación)
- [Flujos principales](#-flujos-principales)
- [Diseño y tema](#-diseño-y-tema)
- [Desarrollo local](#-desarrollo-local)
- [Scripts disponibles](#-scripts-disponibles)

---

## ✨ Características

### Para Organizadores de Eventos
- **Explorar sponsors**: Buscar marcas por industria, presupuesto y compatibilidad
- **Crear eventos**: Formulario completo con ubicación, audiencia, capacidad y rango de patrocinio
- **Match inteligente**: Ver porcentaje de compatibilidad con cada sponsor
- **Solicitudes de contacto**: Enviar propuestas de patrocinio a sponsors
- **Chat directo**: Conversaciones en tiempo real vinculadas a eventos específicos
- **Guardar sponsors**: Lista de sponsors favoritos para futuras colaboraciones
- **Mapa de eventos**: Visualización geográfica de todos los eventos

### Para Sponsors y Marcas
- **Explorar eventos**: Dashboard con filtros por categoría, tamaño, audiencia y presupuesto
- **Match inteligente**: Algoritmo que calcula compatibilidad basada en sector, tipo, audiencia y presupuesto
- **Desglose del match**: Explicación detallada de por qué un evento es (o no) compatible
- **Guardar eventos**: Marcar eventos de interés para revisarlos después
- **Chat directo**: Comunicación directa con organizadores
- **Perfil personalizable**: Industria, presupuesto, tipos de evento preferidos, audiencias objetivo

### Funcionalidades Compartidas
- **Autenticación segura**: Registro con verificación de email
- **Onboarding guiado**: Configuración inicial del perfil paso a paso
- **Perfiles verificados**: Información real y verificable
- **Ordenación por match**: Las tarjetas se pueden ordenar por compatibilidad, nombre o presupuesto
- **Diseño responsive**: Optimizado para desktop y móvil
- **Notificaciones toast**: Feedback visual en cada acción

---

## 🏗 Arquitectura

La aplicación sigue una arquitectura **client-side SPA** con backend serverless:

```
┌─────────────────────────────────────────────┐
│                  Frontend                    │
│         React + Vite + TypeScript            │
│                                              │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │  Pages   │  │Components│  │  Contexts  │  │
│  │          │  │          │  │  (Auth)    │  │
│  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │        │
│  ┌────┴──────────────┴──────────────┴─────┐  │
│  │        Supabase Client SDK             │  │
│  └────────────────┬───────────────────────┘  │
└───────────────────┼──────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │    Lovable Cloud      │
        │  ┌─────────────────┐  │
        │  │   PostgreSQL    │  │
        │  │   (Database)    │  │
        │  ├─────────────────┤  │
        │  │   Auth (JWT)    │  │
        │  ├─────────────────┤  │
        │  │   Storage       │  │
        │  ├─────────────────┤  │
        │  │  Edge Functions │  │
        │  ├─────────────────┤  │
        │  │   Realtime      │  │
        │  └─────────────────┘  │
        └───────────────────────┘
```

---

## 🛠 Tech Stack

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Framework** | React 18 | Librería UI |
| **Lenguaje** | TypeScript | Type safety |
| **Bundler** | Vite 5 | Build tool rápido |
| **Estilos** | Tailwind CSS 3 | Utility-first CSS |
| **Componentes** | shadcn/ui (Radix) | Sistema de componentes accesibles |
| **Estado servidor** | TanStack React Query | Cache y sincronización |
| **Routing** | React Router v6 | Navegación SPA |
| **Formularios** | React Hook Form + Zod | Validación de formularios |
| **Mapas** | Leaflet + React Leaflet | Mapas interactivos |
| **Gráficos** | Recharts | Visualización de datos |
| **Backend** | Lovable Cloud | DB, Auth, Storage, Edge Functions |
| **Testing** | Vitest + Playwright | Tests unitarios y E2E |
| **Tipografía** | DM Sans | Fuente principal |

---

## 📁 Estructura del proyecto

```
src/
├── assets/                # Imágenes y recursos estáticos
│   ├── hero-bg.jpg        # Fondo del hero en la landing
│   └── logo-isotipo.png   # Isotipo de la marca
│
├── components/            # Componentes reutilizables
│   ├── ui/                # Componentes base shadcn/ui (~40 componentes)
│   ├── DashboardLayout.tsx  # Layout principal con Navbar
│   ├── EventCard.tsx      # Tarjeta de evento con match score
│   ├── SponsorCard.tsx    # Tarjeta de sponsor con match score
│   ├── MatchBadge.tsx     # Badge visual de compatibilidad
│   ├── Navbar.tsx         # Barra de navegación principal
│   ├── NavLink.tsx        # Link de navegación con estado activo
│   ├── ProtectedRoute.tsx # Guards de autenticación y perfil
│   └── SendOfferDialog.tsx # Diálogo para enviar propuesta de contacto
│
├── contexts/
│   └── AuthContext.tsx    # Provider global de autenticación
│
├── hooks/
│   ├── useAuth.ts         # Hook de autenticación (user, profile, session)
│   ├── use-mobile.tsx     # Detección de dispositivo móvil
│   └── use-toast.ts       # Hook para notificaciones toast
│
├── integrations/
│   └── supabase/
│       ├── client.ts      # Cliente Supabase (auto-generado)
│       └── types.ts       # Tipos de la DB (auto-generado)
│
├── lib/
│   ├── supabase-helpers.ts  # Tipos, calculateMatchScore(), getMatchBreakdown()
│   ├── avatar.ts          # Resolución de URLs de avatar
│   └── utils.ts           # Utilidades generales (cn, etc.)
│
├── pages/
│   ├── Index.tsx          # Landing page pública
│   ├── AuthPage.tsx       # Login / Registro
│   ├── OnboardingPage.tsx # Configuración inicial del perfil
│   ├── DashboardPage.tsx  # Dashboard principal (eventos para sponsors)
│   ├── SponsorsPage.tsx   # Explorar sponsors (para organizadores)
│   ├── SponsorDetailPage.tsx  # Detalle de un sponsor
│   ├── EventDetailPage.tsx    # Detalle de un evento
│   ├── EventFormPage.tsx  # Crear/editar evento
│   ├── EventsMapPage.tsx  # Mapa de eventos con Leaflet
│   ├── MessagesPage.tsx   # Chat y conversaciones
│   ├── ContactRequestsPage.tsx # Gestión de solicitudes
│   ├── SavedEventsPage.tsx    # Eventos/sponsors guardados
│   ├── ProfilePage.tsx    # Editar perfil
│   ├── OrganizerProfilePage.tsx # Perfil público de organizador
│   └── NotFound.tsx       # Página 404
│
└── test/
    ├── setup.ts           # Configuración de Vitest
    └── example.test.ts    # Test de ejemplo
```

---

## 🗄 Base de datos

### Tablas principales

| Tabla | Descripción |
|-------|-------------|
| `profiles` | Perfiles de usuarios (organizador o sponsor) con preferencias |
| `events` | Eventos creados por organizadores |
| `conversations` | Conversaciones vinculadas a un evento entre un organizador y un sponsor |
| `messages` | Mensajes dentro de una conversación |
| `contact_requests` | Solicitudes de contacto con estado (pending/accepted/rejected) |
| `saved_events` | Eventos guardados por sponsors |
| `saved_sponsors` | Sponsors guardados por organizadores |

### Roles de usuario

El sistema usa un enum `app_role` con dos valores:
- **`organizer`**: Crea eventos, busca sponsors, recibe solicitudes
- **`sponsor`**: Explora eventos, envía solicitudes, configura preferencias

### Funciones de base de datos

| Función | Descripción |
|---------|-------------|
| `get_profile_id(user_id)` | Obtiene el ID del perfil a partir del user_id |
| `get_user_role(user_id)` | Devuelve el rol del usuario (organizer/sponsor) |
| `is_conversation_participant(conversation_id, user_id)` | Verifica si un usuario participa en una conversación |

---

## 🔐 Sistema de autenticación

### Flujo de autenticación

```
Usuario nuevo → /auth (registro) → Verificación email → /auth (login)
                                                              ↓
                                                       /onboarding
                                                     (elegir rol + datos)
                                                              ↓
                                                        /dashboard
```

### Guards de ruta

- **`ProtectedRoute`**: Requiere usuario autenticado → redirige a `/auth`
- **`RequireProfile`**: Requiere usuario + perfil creado → redirige a `/onboarding`

### Contexto de autenticación (`AuthContext`)

Expone: `user`, `profile`, `session`, `loading`, `signOut()`, `setProfile()`

---

## 🧠 Algoritmo de Match

El match score se calcula en `calculateMatchScore()` con 4 dimensiones ponderadas:

| Dimensión | Peso | Lógica |
|-----------|------|--------|
| **Sector** | 30 pts | `sponsor.preferred_sectors` vs `event.sector` |
| **Tipo de evento** | 25 pts | `sponsor.preferred_event_types` vs `event.type` (incluye coincidencia parcial) |
| **Audiencia** | 20 pts | `sponsor.preferred_audiences` vs `event.audience` (incluye coincidencia parcial) |
| **Presupuesto** | 25 pts | Solapamiento de rangos `budget_min/max` vs `sponsorship_min/max` |

**Resultado**: Porcentaje de 0 a 100.  
**Desglose**: `getMatchBreakdown()` devuelve explicación textual de cada dimensión con perspectiva organizador/sponsor.

---

## 🗺 Rutas de la aplicación

| Ruta | Componente | Acceso | Descripción |
|------|-----------|--------|-------------|
| `/` | `Index` | Público | Landing page |
| `/auth` | `AuthPage` | Público | Login y registro |
| `/onboarding` | `OnboardingPage` | Auth | Configuración inicial |
| `/dashboard` | `DashboardPage` | Auth+Perfil | Panel principal |
| `/sponsors` | `SponsorsPage` | Auth+Perfil | Explorar sponsors |
| `/sponsors/:id` | `SponsorDetailPage` | Auth+Perfil | Detalle sponsor |
| `/organizers/:id` | `OrganizerProfilePage` | Auth+Perfil | Perfil organizador |
| `/events/new` | `EventFormPage` | Auth+Perfil | Crear evento |
| `/events/:id/edit` | `EventFormPage` | Auth+Perfil | Editar evento |
| `/events/:id` | `EventDetailPage` | Auth+Perfil | Detalle evento |
| `/map` | `EventsMapPage` | Auth+Perfil | Mapa de eventos |
| `/messages` | `MessagesPage` | Auth+Perfil | Chat |
| `/saved` | `SavedEventsPage` | Auth+Perfil | Guardados |
| `/profile` | `ProfilePage` | Auth+Perfil | Mi perfil |

---

## 🔄 Flujos principales

### Sponsor → Evento
1. Sponsor explora eventos en el Dashboard
2. Ve el match score en cada tarjeta
3. Entra al detalle y revisa el desglose del match
4. Guarda el evento o envía solicitud de contacto
5. Si es aceptada, se abre conversación de chat

### Organizador → Sponsor
1. Organizador explora sponsors en la página de Sponsors
2. Ordena por match score, nombre o presupuesto
3. Entra al detalle del sponsor
4. Ve la compatibilidad con cada uno de sus eventos
5. Envía solicitud de contacto (vinculada a un evento)
6. Si ya hay conversación activa, el botón lleva directo al chat

### Solicitud de contacto
```
Sponsor/Organizador envía solicitud → Estado: "pending"
                                          ↓
                    Receptor acepta ──→ Se crea conversación → Chat
                    Receptor rechaza ──→ Estado: "rejected"
```

---

## 🎨 Diseño y tema

### Paleta de colores (HSL)

| Token | Valor | Uso |
|-------|-------|-----|
| `--primary` | `11 89% 58%` | Naranja principal |
| `--accent` | `24 100% 60%` | Naranja cálido de acento |
| `--background` | `240 5% 96%` | Fondo general (gris claro) |
| `--card` | `0 0% 100%` | Fondo de tarjetas (blanco) |
| `--foreground` | `0 0% 13%` | Texto principal (casi negro) |
| `--muted-foreground` | `0 0% 42%` | Texto secundario |

### Gradientes custom

- **`gradient-primary`**: Gradiente 135° de primary a accent (botones, badges)
- **`gradient-chat-sent`**: Gradiente para mensajes enviados
- **`gradient-chat-active`**: Gradiente para conversación activa

### Tipografía

- **Fuente principal**: DM Sans (Google Fonts)
- **Border radius**: `0.75rem` (redondeado suave)
- **Sombras**: Sistema de 3 niveles (card, card-hover, elevated)

---

## 💻 Desarrollo local

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# La app estará disponible en http://localhost:5173
```

---

## 📜 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Build de producción |
| `npm run build:dev` | Build en modo development |
| `npm run preview` | Preview del build de producción |
| `npm run lint` | Linting con ESLint |
| `npm run test` | Ejecutar tests unitarios (Vitest) |
| `npm run test:watch` | Tests en modo watch |

---

## 📄 Licencia

Proyecto privado. Todos los derechos reservados.
