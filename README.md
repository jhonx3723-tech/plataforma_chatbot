# 🤖 BotBuilder by Cato Creativo

**Plataforma SaaS multi-tenant para crear y gestionar chatbots de WhatsApp para empresas.**

[![Frontend Deploy](https://img.shields.io/badge/Frontend-Netlify-00C7B7?logo=netlify)](https://chat-4c2bf3bot.netlify.app)
[![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?logo=supabase)](https://supabase.com)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Cloud_API-25D366?logo=whatsapp)](https://developers.facebook.com/docs/whatsapp)

---

## 📋 Descripción

BotBuilder permite a empresas crear y gestionar sus propios chatbots de WhatsApp con:
- ✅ Flow builder visual drag-and-drop
- ✅ Bandeja de entrada unificada con agentes humanos
- ✅ Sistema multi-tenant (5-50 clientes)
- ✅ Encuestas CSAT automáticas
- ✅ Notificaciones push web
- ✅ Horarios de atención personalizados
- ✅ Plantillas rápidas y etiquetas
- ✅ Integración con IA (Groq)

---

## 🚀 Stack Tecnológico

### Backend
- **Runtime**: Node.js + Express
- **Base de datos**: Supabase (PostgreSQL)
- **Auth**: JWT + bcryptjs
- **WhatsApp**: Meta Cloud API v19.0
- **IA**: Groq SDK
- **Push**: web-push (VAPID)
- **WebSockets**: ws

### Frontend
- **Framework**: React 18 + Vite
- **Estilos**: TailwindCSS
- **Flow Builder**: @xyflow/react
- **Routing**: React Router v6
- **Iconos**: Lucide React
- **HTTP**: Axios

---

## 📁 Estructura del Proyecto

```
chatbot/
├── backend/
│   ├── src/
│   │   ├── index.js                  # Express server (puerto 3001)
│   │   ├── database.js               # Inicialización DB (admin user)
│   │   ├── supabase.js               # Cliente Supabase
│   │   ├── delayedRunner.js          # Cron para mensajes diferidos
│   │   ├── middleware/
│   │   │   └── auth.js               # JWT + role middleware
│   │   ├── routes/
│   │   │   ├── auth.js               # Login, /me, cambiar contraseña
│   │   │   ├── companies.js          # CRUD empresas + business_hours
│   │   │   ├── flows.js              # CRUD flujos (flow builder)
│   │   │   ├── users.js              # CRUD usuarios (client/agent)
│   │   │   ├── conversations.js      # Bandeja + reply + status
│   │   │   ├── webhook.js            # Webhook WhatsApp + bot logic
│   │   │   ├── contacts.js           # Gestión de contactos
│   │   │   ├── templates.js          # Plantillas rápidas
│   │   │   ├── labels.js             # Etiquetas conversaciones
│   │   │   ├── hsm.js                # WhatsApp HSM templates
│   │   │   ├── crm.js                # CRM básico
│   │   │   ├── push.js               # Push notifications
│   │   │   ├── dashboard.js          # Estadísticas admin
│   │   │   ├── reports.js            # Reportes
│   │   │   └── events.js             # Timeline de eventos
│   │   └── services/
│   │       └── whatsapp.js           # sendText, sendButtons, sendList
│   ├── .env                          # Variables de entorno (NO commitear)
│   ├── .env.example                  # Template de variables
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── App.jsx                   # Routing principal + PushManager
    │   ├── context/
    │   │   └── AuthContext.jsx       # Context de autenticación
    │   ├── components/
    │   │   ├── Layout.jsx            # Sidebar + navegación
    │   │   ├── inbox/                # Componentes de bandeja
    │   │   │   ├── ContactPanel.jsx
    │   │   │   ├── TemplatePopover.jsx
    │   │   │   ├── LabelSelector.jsx
    │   │   │   └── HSMTemplateModal.jsx
    │   │   └── nodes/                # Nodos del flow builder
    │   ├── pages/
    │   │   ├── Login.jsx             # Pantalla de login
    │   │   ├── Dashboard.jsx         # Dashboard super_admin
    │   │   ├── Companies.jsx         # CRUD empresas
    │   │   ├── Users.jsx             # CRUD usuarios
    │   │   ├── Inbox.jsx             # Bandeja de conversaciones
    │   │   ├── FlowEditor.jsx        # Editor visual de flujos
    │   │   ├── AdminPanel.jsx        # Panel company_admin
    │   │   ├── Contacts.jsx          # Gestión de contactos
    │   │   ├── CRM.jsx               # Vista CRM
    │   │   └── Reports.jsx           # Reportes
    │   ├── lib/
    │   │   └── api.js                # API client (axios)
    │   └── index.css                 # Estilos globales + Tailwind
    ├── public/
    │   └── sw.js                     # Service Worker (push)
    └── package.json
```

---

## 🔧 Instalación y Configuración

### 1️⃣ Prerrequisitos
- Node.js >= 18
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Meta for Developers](https://developers.facebook.com) (WhatsApp Cloud API)
- Cuenta en [Groq](https://console.groq.com) (opcional, para IA)

### 2️⃣ Clonar el repositorio
```bash
git clone <tu-repo>
cd chatbot
```

### 3️⃣ Configurar Backend

```bash
cd backend
npm install
```

Copia `.env.example` a `.env` y configura:

```env
# Puerto del servidor
PORT=3001

# JWT (genera una clave segura)
JWT_SECRET=tu_clave_secreta_aqui

# Supabase (obtén desde tu proyecto)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGci...

# Web Push (genera con: npx web-push generate-vapid-keys)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:tu@email.com

# Frontend URL (para CORS)
FRONTEND_URL=http://localhost:5173

# Groq API (opcional)
GROQ_API_KEY=gsk_...
```

Iniciar servidor de desarrollo:
```bash
npm run dev
```

### 4️⃣ Configurar Frontend

```bash
cd ../frontend
npm install
npm run dev
```

El frontend estará en **http://localhost:5173**

---

## 🗄️ Base de Datos (Supabase)

### Tablas principales:
- **companies**: Empresas/clientes
- **users**: Usuarios del sistema (super_admin, client, company_agent)
- **flows**: Flujos de chatbot por empresa
- **conversations**: Conversaciones de WhatsApp
- **messages**: Mensajes (inbound/outbound)
- **contacts**: Contactos de cada empresa
- **templates**: Plantillas de mensajes rápidos
- **labels**: Etiquetas para conversaciones

### RLS (Row Level Security)
Actualmente **deshabilitado** (se usa `service_role` key en backend).
Para producción, se recomienda habilitar RLS con políticas por `company_id`.

---

## 👥 Roles de Usuario

| Rol | Acceso |
|-----|--------|
| **super_admin** | Dashboard, empresas, usuarios, reportes, configuración global |
| **company_admin** | Panel de empresa, flujos, agentes, contactos, CRM |
| **client** | Solo bandeja de entrada de su empresa |
| **company_agent** | Bandeja de entrada + gestión de conversaciones |

### Credenciales por defecto
```
Usuario: admin
Contraseña: admin123
```
⚠️ **CAMBIAR EN PRODUCCIÓN**

---

## 📡 Configurar Webhook de WhatsApp

1. Obtén tu **Phone Number ID** y **Access Token** desde Meta for Developers
2. Configura el webhook URL en Meta:
   ```
   https://tu-backend.com/webhook/whatsapp/:companyId
   ```
3. Modo de verificación: `subscribe`
4. Token de verificación: debe coincidir con `webhook_verify_token` en la tabla `companies`

### Eventos suscritos
- `messages` (mensajes entrantes)
- `message_status` (estados de entrega)

---

## 🎨 Características Principales

### 1. Flow Builder Visual
Crea flujos de chatbot con nodos:
- **StartNode**: Punto de entrada
- **MessageNode**: Enviar mensaje de texto
- **OptionsNode**: Botones o lista de opciones
- **TransferNode**: Transferir a agente humano
- **EndNode**: Finalizar conversación

**Variables disponibles**: `{{nombre}}`, `{{telefono}}`, `{{empresa}}`

### 2. Bandeja de Entrada Unificada
- Filtros: Todas, Mis, Sin asignar, Bot, Agente, Cerradas
- Búsqueda por nombre/teléfono
- Asignación de conversaciones
- Plantillas rápidas
- Etiquetas de conversación
- Tiempo de espera en tiempo real

### 3. Encuestas CSAT
Después de cerrar una conversación, se envía automáticamente:
```
"¿Cómo calificarías tu experiencia? (1-5)"
1️⃣ Muy mala
2️⃣ Mala
3️⃣ Regular
4️⃣ Buena
5️⃣ Excelente
```

### 4. Horarios de Atención
Configura por empresa:
- Horario por día de la semana
- Timezone (LATAM)
- Mensaje fuera de horario

### 5. Follow-ups Automáticos
Configura en cada empresa:
- Tiempo sin respuesta (horas)
- Mensaje de seguimiento automático

---

## 🚢 Deploy

### Backend
Recomendado: **Railway**, **Render**, **Fly.io**

Variables de entorno necesarias:
```env
PORT=3001
JWT_SECRET=...
SUPABASE_URL=...
SUPABASE_KEY=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=...
FRONTEND_URL=https://tu-frontend.netlify.app
GROQ_API_KEY=...
```

### Frontend
Actualmente desplegado en: **Netlify**
URL: https://chat-4c2bf3bot.netlify.app

Build:
```bash
cd frontend
npm run build
```

Configurar variable de entorno en Netlify:
```
VITE_API_URL=https://tu-backend.com
```

---

## 🔐 Seguridad

### ✅ Implementado
- ✅ `.env` en `.gitignore`
- ✅ CORS limitado a frontend autorizado
- ✅ JWT con expiración
- ✅ Contraseñas hasheadas (bcrypt)
- ✅ Webhook verificado con token

### 🔒 Recomendaciones para Producción
- [ ] Habilitar RLS en Supabase
- [ ] Rotar claves API periódicamente
- [ ] Rate limiting en endpoints
- [ ] Validación de inputs más estricta
- [ ] Logs de auditoría
- [ ] HTTPS obligatorio

---

## 📊 Monitoreo y Logs

### Endpoints de salud
```
GET /api/health
```

Respuesta:
```json
{
  "status": "ok",
  "timestamp": "2026-09-25T10:30:00.000Z"
}
```

---

## 🐛 Troubleshooting

### El bot no responde
1. Verificar que el webhook está configurado en Meta
2. Verificar que `company.active = 1` en la base de datos
3. Verificar que hay un flow activo (`flow.is_active = 1`)
4. Revisar logs del backend

### Notificaciones push no funcionan
1. Verificar que el navegador soporta Push API
2. Verificar que el usuario dio permiso
3. Verificar claves VAPID en `.env`
4. Verificar que `sw.js` está registrado

### CORS errors
1. Verificar que `FRONTEND_URL` está en `.env`
2. Verificar que el frontend hace requests al backend correcto

---

## 📝 Roadmap

- [ ] Tests automatizados (Jest + Vitest)
- [ ] Análisis de sentimiento con IA
- [ ] Templates HSM de WhatsApp
- [ ] Multi-idioma (i18n)
- [ ] Exportar conversaciones a PDF/CSV
- [ ] Integración con CRMs externos (HubSpot, Salesforce)
- [ ] Webhooks salientes para integraciones
- [ ] Panel de analytics avanzado

---

## 👨‍💻 Desarrollo

### Ejecutar en desarrollo
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### Estructura de commits
Usar mensajes descriptivos:
```
feat: añadir filtro por etiquetas en bandeja
fix: corregir asignación automática de agentes
refactor: optimizar consultas de conversaciones
docs: actualizar README con instrucciones de deploy
```

---

## 📄 Licencia

Proyecto privado - Cato Creativo © 2026

---

## 🤝 Contacto

**Email**: jhonx3723@gmail.com  
**Proyecto**: BotBuilder by Cato Creativo

---

**¡Hecho con ❤️ para empresas que quieren automatizar su atención en WhatsApp!**
