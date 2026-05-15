# Documentación Técnica — BotBuilder
**Guía de arquitectura, conexiones y APIs**

---

## Resumen general

BotBuilder es una plataforma SaaS multi-empresa para crear chatbots de WhatsApp y gestionar conversaciones. Está compuesta por tres partes que trabajan juntas:

```
┌─────────────────┐     HTTPS      ┌──────────────────┐     SQL      ┌───────────────┐
│   FRONTEND      │ ◄────────────► │    BACKEND       │ ◄──────────► │   SUPABASE    │
│  React + Vite   │                │  Node.js+Express │              │  PostgreSQL   │
│  Netlify        │                │  Railway         │              │  (Cloud DB)   │
└─────────────────┘                └──────────────────┘              └───────────────┘
                                           ▲
                                           │ HTTPS (Webhook)
                                           ▼
                                   ┌───────────────────┐
                                   │   META / WhatsApp  │
                                   │   Graph API v19.0  │
                                   └───────────────────┘
```

---

## Stack tecnológico

| Capa | Tecnología | Versión | Alojamiento |
|------|-----------|---------|-------------|
| Frontend | React + Vite + Tailwind CSS | React 18 | Netlify |
| Backend | Node.js + Express | Node 20 | Railway |
| Base de datos | PostgreSQL (Supabase) | — | Supabase Cloud |
| WhatsApp API | Meta Graph API | v19.0 | Meta Cloud |
| Tiempo real | Supabase Realtime + SSE | — | Supabase Cloud |
| Auth | JWT (jsonwebtoken) | — | — |

---

## Estructura de carpetas

```
chatbot/
├── backend/
│   ├── src/
│   │   ├── index.js           ← Punto de entrada, configura Express
│   │   ├── database.js        ← Inicialización y esquema de Supabase
│   │   ├── supabase.js        ← Cliente Supabase (singleton)
│   │   ├── routes/
│   │   │   ├── auth.js        ← Login, cambio de contraseña
│   │   │   ├── companies.js   ← CRUD de empresas
│   │   │   ├── flows.js       ← CRUD de flujos de chatbot
│   │   │   ├── conversations.js ← Bandeja, respuestas, asignación
│   │   │   ├── users.js       ← CRUD de usuarios
│   │   │   ├── contacts.js    ← CRUD de contactos
│   │   │   ├── templates.js   ← Plantillas de respuesta
│   │   │   ├── labels.js      ← Etiquetas de conversación
│   │   │   ├── events.js      ← SSE (tiempo real)
│   │   │   ├── dashboard.js   ← Estadísticas
│   │   │   ├── reports.js     ← Exportación CSV
│   │   │   └── webhook.js     ← Receptor de mensajes WhatsApp
│   │   ├── middleware/
│   │   │   └── auth.js        ← Validación JWT, roles
│   │   └── services/
│   │       └── whatsapp.js    ← Envío de mensajes a Meta API
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── main.jsx           ← Punto de entrada React
│   │   ├── App.jsx            ← Rutas React Router
│   │   ├── context/
│   │   │   └── AuthContext.jsx ← Estado global de autenticación
│   │   ├── lib/
│   │   │   └── api.js         ← Cliente Axios configurado
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Companies.jsx
│   │   │   ├── FlowEditor.jsx
│   │   │   ├── Inbox.jsx
│   │   │   ├── Users.jsx
│   │   │   └── Reports.jsx
│   │   └── components/        ← Componentes reutilizables (UI)
│   ├── public/
│   │   └── _redirects         ← Regla SPA para Netlify
│   └── package.json
├── netlify.toml               ← Configuración de deploy Netlify
└── .gitignore
```

---

## Base de datos (Supabase PostgreSQL)

### Diagrama de tablas

```
companies ──────────────────────────────────────────────┐
    │                                                    │
    ├──► flows (company_id)                             │
    │                                                    │
    ├──► users (company_id)                             │
    │         └──► conversations.assigned_to            │
    │                                                    │
    ├──► conversations (company_id)                     │
    │         └──► messages (conversation_id)           │
    │                                                    │
    ├──► contacts (company_id)                          │
    │                                                    │
    ├──► templates (company_id)                         │
    │                                                    │
    ├──► labels (company_id)                            │
    │         └── conversations.label_ids[]             │
    │                                                    │
    └──► sessions (company_id, flow_id)                 │
              [estado del bot por usuario]               │
```

### Detalle de tablas

#### `companies` — Empresas clientes
```
id                  UUID, clave primaria
name                Nombre de la empresa
phone               Teléfono registrado en WhatsApp
whatsapp_phone_id   ID del número en Meta Business
whatsapp_token      Token de acceso permanente de Meta
webhook_verify_token Token único para verificar webhook
business_hours      JSON con horarios y mensaje fuera de horario
active              Boolean — si la empresa está activa
created_at          Timestamp
```

#### `users` — Usuarios de la plataforma
```
id          UUID
username    Nombre de usuario (único)
email       Email (requerido para clientes)
password    Hash bcrypt
role        'super_admin' | 'client' | 'company_agent'
company_id  FK → companies (null para super_admin)
active      Boolean
created_at  Timestamp
```

#### `flows` — Flujos de chatbot
```
id          UUID
company_id  FK → companies
name        Nombre del flujo
nodes       JSON — array de nodos { id, type, position, data }
edges       JSON — array de conexiones { source, target, sourceHandle }
active      Boolean — solo 1 activo por empresa
created_at  Timestamp
updated_at  Timestamp
```

#### `conversations` — Conversaciones
```
id              UUID
company_id      FK → companies
user_phone      Teléfono del cliente de WhatsApp
status          'bot' | 'human' | 'closed'
last_message    Texto del último mensaje
last_message_at Timestamp del último mensaje
assigned_to     FK → users (agente asignado, puede ser null)
label_ids       UUID[] — arreglo de etiquetas
created_at      Timestamp
```

#### `messages` — Mensajes
```
id               UUID
conversation_id  FK → conversations
company_id       FK → companies
direction        'inbound' (cliente→plataforma) | 'outbound' (plataforma→cliente)
content          Texto del mensaje
sent_by          'user' | 'bot' | 'agent'
agent_name       Nombre del agente (si aplica)
is_note          Boolean — true si es nota interna (no enviada a WhatsApp)
read             Boolean — false hasta que el agente abre la conversación
created_at       Timestamp
```

#### `contacts` — Directorio de contactos
```
id            UUID
company_id    FK → companies
phone         Teléfono (único por empresa)
name          Nombre (auto-importado de WhatsApp)
company_name  Empresa del contacto
notes         Notas internas
created_at    Timestamp
updated_at    Timestamp
```

#### `sessions` — Estado del bot por usuario
```
id              UUID
company_id      FK → companies
flow_id         FK → flows
user_phone      Teléfono del cliente
current_node_id ID del nodo actual en el flujo
created_at      Timestamp
updated_at      Timestamp
```

#### `templates` — Plantillas de respuesta rápida
```
id          UUID
company_id  FK → companies
shortcut    Atajo (ej: 'saludo') — único por empresa
content     Texto completo de la respuesta
created_at  Timestamp
```

#### `labels` — Etiquetas
```
id          UUID
company_id  FK → companies
name        Nombre de la etiqueta — único por empresa
color       Color hex (ej: '#FF5733')
created_at  Timestamp
```

---

## API REST — Referencia completa

**URL base:** `https://plataformachatbot-production.up.railway.app`

**Autenticación:** Header `Authorization: Bearer <token>` en todas las rutas protegidas.

---

### Autenticación

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Login. Body: `{ username, password }` |
| GET | `/api/auth/me` | Sí | Info del usuario actual |
| PUT | `/api/auth/password` | Sí | Cambiar contraseña. Body: `{ currentPassword, newPassword }` |

**Respuesta de login:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "uuid",
    "username": "admin",
    "email": "...",
    "role": "super_admin",
    "company_id": null
  }
}
```

---

### Empresas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/companies` | Super Admin | Listar todas (máx. 50) |
| GET | `/api/companies/:id` | Super Admin | Detalle de empresa |
| POST | `/api/companies` | Super Admin | Crear empresa |
| PUT | `/api/companies/:id` | Super Admin | Actualizar empresa |
| DELETE | `/api/companies/:id` | Super Admin | Eliminar empresa |

---

### Flujos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/flows/company/:companyId` | Sí | Listar flujos de empresa |
| GET | `/api/flows/:id` | Sí | Flujo completo con nodos y aristas |
| POST | `/api/flows` | Sí | Crear flujo vacío |
| PUT | `/api/flows/:id` | Sí | Guardar flujo (nodos/aristas) |
| DELETE | `/api/flows/:id` | Sí | Eliminar flujo |

---

### Conversaciones

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/conversations` | Sí | Listar conversaciones (filtradas por empresa si es agente) |
| GET | `/api/conversations/:id` | Sí | Detalle con todos los mensajes |
| GET | `/api/conversations/agents` | Sí | Lista de agentes disponibles |
| POST | `/api/conversations/:id/reply` | Sí | Enviar respuesta al cliente en WhatsApp |
| POST | `/api/conversations/:id/note` | Sí | Agregar nota interna |
| PUT | `/api/conversations/:id/assign` | Sí | Asignar/desasignar agente |
| PUT | `/api/conversations/:id/status` | Sí | Cambiar estado: bot/human/closed |
| POST | `/api/conversations/:id/restart-bot` | Sí | Reiniciar sesión del bot |

---

### Usuarios

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/users` | Super Admin | Listar usuarios |
| POST | `/api/users` | Super Admin | Crear usuario |
| PUT | `/api/users/:id/password` | Super Admin | Resetear contraseña |
| PUT | `/api/users/:id/toggle` | Super Admin | Activar/desactivar |
| DELETE | `/api/users/:id` | Super Admin | Eliminar usuario |

---

### Contactos

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/contacts` | Sí | Listar contactos |
| GET | `/api/contacts/phone/:phone` | Sí | Buscar por teléfono |
| POST | `/api/contacts` | Sí | Crear/actualizar contacto |
| PUT | `/api/contacts/:id` | Sí | Editar datos del contacto |
| DELETE | `/api/contacts/:id` | Sí | Eliminar contacto |

---

### Plantillas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/templates` | Sí | Listar plantillas de empresa |
| POST | `/api/templates` | Sí | Crear plantilla |
| PUT | `/api/templates/:id` | Sí | Actualizar plantilla |
| DELETE | `/api/templates/:id` | Sí | Eliminar plantilla |

---

### Etiquetas

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/labels` | Sí | Listar etiquetas de empresa |
| POST | `/api/labels` | Sí | Crear etiqueta |
| DELETE | `/api/labels/:id` | Sí | Eliminar etiqueta |
| POST | `/api/labels/conversation/:convId` | Sí | Agregar etiqueta a conversación |
| DELETE | `/api/labels/conversation/:convId/:labelId` | Sí | Quitar etiqueta |

---

### Dashboard y Reportes

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/dashboard/stats` | Super Admin | Estadísticas globales |
| GET | `/api/reports/count` | Super Admin | Conteo de conversaciones/mensajes |
| GET | `/api/reports/conversations` | Super Admin | Exportar conversaciones CSV |
| GET | `/api/reports/messages` | Super Admin | Exportar mensajes CSV |

---

### Tiempo real (SSE)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/events` | Sí (query param `?token=`) | Stream de eventos en tiempo real |

El frontend se conecta a este endpoint con `EventSource`. Emite eventos:
- `conversation` — cuando se crea o actualiza una conversación
- `message` — cuando llega un nuevo mensaje
- `ready` — confirmación de conexión establecida
- `ping` — cada 25 segundos para mantener la conexión viva

---

### Webhook WhatsApp

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/webhook/whatsapp/:companyId` | No | Verificación de webhook con Meta |
| POST | `/webhook/whatsapp/:companyId` | No | Recepción de mensajes entrantes |

---

## Cómo fluye un mensaje de WhatsApp

Este es el recorrido completo desde que un cliente escribe hasta que aparece en la pantalla del agente:

```
1. Cliente escribe en WhatsApp
        │
        ▼
2. Meta envía el mensaje a:
   POST https://tu-backend.railway.app/webhook/whatsapp/{companyId}
   (JSON con datos del mensaje, número, nombre del contacto)
        │
        ▼
3. El backend procesa el webhook:
   a) Extrae: número del cliente, nombre, texto del mensaje
   b) Busca o crea la conversación en Supabase
   c) Crea o actualiza el contacto automáticamente
   d) Guarda el mensaje como inbound en la tabla messages
   e) Actualiza last_message y last_message_at en conversations
        │
        ▼
4. ¿Cuál es el estado de la conversación?
   ├─ "human" → El agente atiende manualmente, el bot no hace nada
   └─ "bot"   → Continúa al paso 5
        │
        ▼
5. ¿Está dentro del horario de atención?
   ├─ NO → Envía mensaje de horario cerrado a WhatsApp, termina
   └─ SÍ → Continúa al paso 6
        │
        ▼
6. Carga el flujo activo de la empresa (nodos y aristas)
        │
        ▼
7. Busca o crea la sesión del usuario
   La sesión guarda en qué nodo del flujo está el cliente
        │
        ▼
8. Procesa el nodo actual:
   ├─ INICIO/MENSAJE → Envía texto a WhatsApp
   ├─ OPCIONES       → Envía botones o lista interactiva
   ├─ TRANSFERIR     → Cambia estado a "human", avisa al equipo
   └─ FIN            → Envía mensaje de cierre, borra la sesión
        │
        ▼
9. Meta Graph API entrega el mensaje al WhatsApp del cliente
        │
        ▼
10. Supabase detecta el cambio en las tablas (postgres_changes)
        │
        ▼
11. El backend envía el evento por SSE al frontend
        │
        ▼
12. La bandeja del agente se actualiza en tiempo real
    (nueva conversación aparece, badge de mensajes sin leer)
```

---

## Sistema de tiempo real

El frontend usa dos mecanismos para mantenerse actualizado:

### Server-Sent Events (SSE)
- El frontend abre una conexión persistente a `GET /api/events`
- El backend escucha cambios en Supabase (postgres_changes)
- Cuando hay un cambio, lo reenvía al frontend por el stream
- El token JWT se pasa como query param: `?token=eyJ...`

### Fallback de polling
- Si el SSE falla, el frontend hace polling cada 4 segundos
- Garantiza que nunca se pierdan actualizaciones

---

## Autenticación y autorización

### Flujo de login
```
Frontend → POST /api/auth/login → Backend valida usuario/contraseña
                                          ↓
                              Genera JWT (expira en 8 horas)
                                          ↓
                              Devuelve token + datos del usuario
                                          ↓
                    Frontend guarda en localStorage y en el contexto React
```

### Roles y permisos

| Recurso | super_admin | client | company_agent |
|---------|-------------|--------|---------------|
| Dashboard | ✅ | ❌ | ❌ |
| Todas las empresas | ✅ | ❌ | ❌ |
| Todos los usuarios | ✅ | ❌ | ❌ |
| Reportes globales | ✅ | ❌ | ❌ |
| Conversaciones su empresa | ✅ | ✅ | ✅ |
| Flujos su empresa | ✅ | ✅ | ❌ |
| Contactos su empresa | ✅ | ✅ | ✅ |

### Middleware de autenticación
Todas las rutas protegidas pasan por `authMiddleware`:
1. Lee el header `Authorization: Bearer <token>`
2. Valida la firma del JWT
3. Si el token expiró o es inválido → retorna 401
4. Si es válido → agrega `req.user` con los datos del usuario y continúa

---

## Integración con Meta / WhatsApp

### Configuración en Meta Business (pasos para cada empresa)

1. Crear app en [developers.facebook.com](https://developers.facebook.com)
2. Agregar producto **WhatsApp**
3. Obtener:
   - **Phone ID** — ID del número de WhatsApp Business
   - **Token permanente** — token de acceso (no el temporal)
4. Configurar webhook:
   - URL: `https://plataformachatbot-production.up.railway.app/webhook/whatsapp/{companyId}`
   - Token de verificación: el que aparece en la empresa en la plataforma
   - Suscribir a: `messages`

### Tipos de mensajes que envía el bot

**Texto simple:**
```json
{
  "messaging_product": "whatsapp",
  "to": "573001234567",
  "type": "text",
  "text": { "body": "Hola, bienvenido a nuestra empresa" }
}
```

**Botones interactivos (máx. 3 opciones):**
```json
{
  "messaging_product": "whatsapp",
  "to": "573001234567",
  "type": "interactive",
  "interactive": {
    "type": "button",
    "body": { "text": "¿Cómo podemos ayudarte?" },
    "action": {
      "buttons": [
        { "type": "reply", "reply": { "id": "opcion_1", "title": "Soporte" }},
        { "type": "reply", "reply": { "id": "opcion_2", "title": "Ventas" }}
      ]
    }
  }
}
```

**Lista interactiva (máx. 10 opciones):**
Usado automáticamente cuando el nodo Opciones tiene más de 3 opciones.

---

## Variables de entorno

### Backend (Railway)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `SUPABASE_URL` | URL del proyecto Supabase | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Clave de servicio (service_role) | `eyJhbGci...` |
| `JWT_SECRET` | Secreto para firmar tokens JWT | `mi_secreto_muy_largo` |
| `PORT` | Puerto del servidor (Railway lo inyecta) | `8080` |

### Frontend (Netlify / .env)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del backend | `https://plataformachatbot-production.up.railway.app/api` |

---

## Despliegue

### Backend — Railway

1. Conecta el repositorio de GitHub
2. **Root Directory:** `backend`
3. Railway detecta el `Dockerfile` y construye la imagen
4. Agrega las variables de entorno en Settings → Variables
5. El deploy es automático en cada push a `main`

**Dockerfile:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 8080
CMD ["node", "src/index.js"]
```

### Frontend — Netlify

**Opción A — Automático (GitHub):**
1. Conecta repo en Netlify
2. Base directory: `frontend`
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Agrega variable `VITE_API_URL`

**Opción B — Drag & Drop:**
1. Ejecuta `npm run build` en la carpeta `frontend/`
2. Arrastra la carpeta `dist/` al área de deploy en Netlify

**netlify.toml:**
```toml
[build]
  base    = "frontend"
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```
> La regla de redirects es esencial para que React Router funcione. Sin ella, al refrescar cualquier ruta aparece "Page not found."

---

## Límites y capacidades

| Recurso | Límite |
|---------|--------|
| Empresas en la plataforma | 50 |
| Opciones en nodo "Botones" | 3 |
| Opciones en nodo "Lista" | 10 |
| Flujos activos por empresa | 1 |
| Duración del token JWT | 8 horas |
| Ping SSE (keepalive) | cada 25 segundos |
| Fallback polling | cada 4 segundos |

---

## Diagrama de navegación del frontend

```
/login
    │
    ├── super_admin → /dashboard
    │       ├── /companies
    │       │       └── /flows/:companyId/:flowId  (editor visual)
    │       ├── /users
    │       ├── /reports
    │       └── /inbox
    │
    └── client / agent → /inbox
```

Todas las rutas excepto `/login` requieren token válido. Si el token expiró, redirige automáticamente al login.

---

## Lenguajes de programación utilizados

### JavaScript (100% del proyecto)

Todo el proyecto está escrito en **JavaScript**. Se escogió por tres razones principales:

1. **Un solo lenguaje para todo** — tanto el backend como el frontend usan JavaScript. Esto significa que no hay que aprender dos lenguajes distintos y el código es más fácil de mantener.
2. **Ecosistema enorme** — JavaScript tiene la mayor cantidad de librerías disponibles (npm), lo que acelera el desarrollo sin reinventar la rueda.
3. **Node.js en el servidor** — permite usar JavaScript fuera del navegador, en el servidor, con muy buen rendimiento para operaciones de red (webhooks, APIs REST).

| Dónde | Lenguaje | Versión |
|-------|----------|---------|
| Backend (servidor) | JavaScript con Node.js | Node 20 |
| Frontend (navegador) | JavaScript con JSX (React) | ES2022+ |
| Base de datos (queries) | SQL (dentro de Supabase) | PostgreSQL 15 |

### ¿Por qué no Python, Java u otro?

- **Python** es excelente para ciencia de datos e IA, pero para APIs web en tiempo real y apps de frontend, JavaScript es más rápido de desarrollar y tiene mejor integración con herramientas modernas como React.
- **Java/PHP** son robustos pero más verbosos y lentos de desarrollar para proyectos medianos como este.
- **JavaScript full-stack** (Node.js + React) es hoy el estándar de la industria para SaaS web, con mayor demanda de desarrolladores y documentación.

### SQL — Para la base de datos

Supabase usa **PostgreSQL**, que es la base de datos relacional más avanzada de código abierto. Las queries SQL se escriben a través del SDK de Supabase, no directamente — el SDK traduce las llamadas JavaScript a SQL internamente.

---

## Tecnologías y librerías usadas (por qué cada una)

| Tecnología | Lenguaje | Por qué se usa |
|-----------|----------|---------------|
| **Node.js** | JavaScript | Ejecuta JavaScript en el servidor, maneja miles de peticiones simultáneas de forma eficiente gracias a su modelo asíncrono |
| **Express.js** | JavaScript | Framework minimalista para crear APIs REST, estructura las rutas y el middleware |
| **React** | JavaScript (JSX) | Librería para construir interfaces web dinámicas, actualiza solo las partes que cambian sin recargar la página |
| **Supabase** | SQL / JavaScript | Base de datos PostgreSQL en la nube con Realtime incluido — sin necesidad de administrar un servidor de base de datos |
| **JWT (jsonwebtoken)** | JavaScript | Autenticación sin estado: el token viaja en cada petición y el servidor lo valida sin guardar sesiones |
| **bcryptjs** | JavaScript | Hash seguro de contraseñas — nunca se guarda la contraseña real, solo su huella criptográfica |
| **React Flow** | JavaScript | Librería especializada para el editor visual de flujos (arrastrar nodos, conectar con flechas) |
| **Tailwind CSS** | CSS (utilidades) | Framework de estilos que evita escribir CSS desde cero, acelera el diseño con clases predefinidas |
| **SSE (EventSource)** | JavaScript | Actualización en tiempo real del navegador sin recargar: el servidor empuja los eventos nuevos al frontend |
| **Axios** | JavaScript | Cliente HTTP para hacer peticiones a la API de Meta/WhatsApp y al backend desde el frontend |
| **Vite** | JavaScript | Herramienta de construcción del frontend, convierte el código React en archivos estáticos optimizados |
| **Docker** | — | Empaqueta el backend con todas sus dependencias en un contenedor, garantizando que funcione igual en cualquier servidor |

---

*Versión 1.0 — BotBuilder Platform*
