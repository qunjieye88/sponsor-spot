# Sponsorly

Plataforma que conecta organizadores de eventos con marcas y sponsors. Match inteligente, chat directo y métricas claras para facilitar patrocinios.

## Funcionalidades

- **Doble perfil**: Registro como organizador o sponsor con onboarding personalizado
- **Exploración**: Organizadores descubren sponsors y sponsors descubren eventos
- **Match inteligente**: Algoritmo de compatibilidad basado en sector, audiencia, presupuesto y tipo de evento
- **Chat directo**: Mensajería en tiempo real vinculada a eventos específicos
- **Solicitudes de contacto**: Flujo de propuestas con estados (pendiente, aceptada, rechazada)
- **Mapa de eventos**: Visualización geográfica de eventos con Leaflet
- **Eventos guardados**: Los sponsors pueden guardar eventos de interés
- **Sponsors guardados**: Los organizadores pueden guardar sponsors de interés
- **Perfiles verificados**: Información real y verificable de cada participante

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS + shadcn/ui
- **Backend**: Lovable Cloud (base de datos, autenticación, funciones serverless, almacenamiento)
- **Mapas**: Leaflet + React Leaflet
- **Estado**: TanStack React Query
- **Routing**: React Router v6

## Estructura del proyecto

```
src/
├── assets/          # Imágenes y recursos estáticos
├── components/      # Componentes reutilizables (UI, layout, cards)
│   └── ui/          # Componentes base de shadcn/ui
├── contexts/        # Context providers (Auth)
├── hooks/           # Custom hooks
├── integrations/    # Cliente y tipos de Supabase (auto-generado)
├── lib/             # Utilidades y helpers
├── pages/           # Páginas de la aplicación
└── test/            # Configuración de tests
```

## Páginas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page pública |
| `/auth` | Login y registro |
| `/onboarding` | Configuración inicial del perfil |
| `/dashboard` | Panel principal del usuario |
| `/sponsors` | Explorar sponsors (vista organizador) |
| `/sponsors/:id` | Detalle de un sponsor |
| `/events/new` | Crear evento |
| `/events/:id` | Detalle de un evento |
| `/events/map` | Mapa de eventos |
| `/messages` | Chat y conversaciones |
| `/contact-requests` | Solicitudes de contacto |
| `/saved-events` | Eventos guardados |
| `/profile` | Perfil del usuario |

## Desarrollo local

```bash
npm install
npm run dev
```

## Licencia

Proyecto privado. Todos los derechos reservados.
