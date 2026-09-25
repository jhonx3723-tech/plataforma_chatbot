# 🚀 Guía de Deploy - 100% GRATIS

## Backend en Render.com (GRATIS)

### ✅ Por qué Render?
- ✅ **100% Gratuito** para proyectos pequeños
- ✅ Fácil de configurar (3 minutos)
- ✅ Deploy automático desde GitHub
- ✅ SSL/HTTPS gratis
- ✅ No requiere tarjeta de crédito
- ✅ 750 horas/mes gratis (suficiente)

### 📝 Paso a Paso

#### 1️⃣ Crear cuenta en Render
1. Ve a https://render.com
2. Regístrate con GitHub (o email)
3. **NO necesitas tarjeta de crédito** ✅

#### 2️⃣ Push tu código a GitHub (si aún no lo has hecho)
```bash
# Si tu repo no está en GitHub:
git remote add origin https://github.com/tu-usuario/tu-repo.git
git branch -M main
git push -u origin main
```

#### 3️⃣ Crear Web Service en Render

1. **Login en Render Dashboard**: https://dashboard.render.com

2. **Click en "New +"** → **"Web Service"**

3. **Conectar tu repositorio de GitHub**
   - Autoriza a Render a acceder a GitHub
   - Selecciona tu repositorio `chatbot`

4. **Configuración del servicio**:
   ```
   Name:          botbuilder-backend
   Region:        Oregon (US West)
   Branch:        main
   Root Directory: (dejar vacío)
   Runtime:       Node
   Build Command: cd backend && npm install
   Start Command: cd backend && npm start
   ```

5. **Plan**: Selecciona **"Free"** ✅

6. **Variables de Entorno** (Click "Advanced" → "Add Environment Variable"):
   
   Agrega estas variables **una por una**:
   
   ```
   PORT = 3001
   NODE_ENV = production
   
   JWT_SECRET = [tu_jwt_secret_del_.env]
   SUPABASE_URL = [tu_supabase_url]
   SUPABASE_KEY = [tu_supabase_key]
   
   VAPID_PUBLIC_KEY = [tu_vapid_public]
   VAPID_PRIVATE_KEY = [tu_vapid_private]
   VAPID_SUBJECT = mailto:jhonx3723@gmail.com
   
   FRONTEND_URL = https://chat-4c2bf3bot.netlify.app
   GROQ_API_KEY = [tu_groq_key]
   ```
   
   **💡 Tip**: Copia los valores desde `backend/.env`

7. **Click "Create Web Service"**

8. **Espera 2-3 minutos** mientras Render hace el deploy

9. **Tu backend estará en**: `https://botbuilder-backend.onrender.com`

#### 4️⃣ Verificar que funciona

Abre en el navegador:
```
https://botbuilder-backend.onrender.com/api/health
```

Deberías ver:
```json
{
  "status": "ok",
  "timestamp": "2026-09-25T..."
}
```

✅ **¡Backend funcionando!**

---

## Frontend en Netlify (YA ESTÁ)

Tu frontend ya está en Netlify: https://chat-4c2bf3bot.netlify.app

Solo necesitas **actualizar la URL del backend**:

#### 1️⃣ Actualizar variable de entorno en Netlify

1. Ve a https://app.netlify.com
2. Selecciona tu sitio `chat-4c2bf3bot`
3. **Site settings** → **Environment variables**
4. Edita o agrega:
   ```
   VITE_API_URL = https://botbuilder-backend.onrender.com
   ```
5. **Save**
6. **Deploy** → **Trigger deploy** → **Clear cache and deploy site**

#### 2️⃣ Actualizar en el código (opcional)

Si quieres hacerlo desde el código:

En `frontend/src/lib/api.js`, actualiza:
```javascript
export const API_BASE = import.meta.env.VITE_API_URL || 
  'https://botbuilder-backend.onrender.com/api';
```

---

## Configurar WhatsApp Webhook

Una vez que tengas el backend en Render:

1. Ve a **Meta for Developers**: https://developers.facebook.com
2. **Tu App** → **WhatsApp** → **Configuration**
3. **Edit** en "Webhook"
4. **Callback URL**:
   ```
   https://botbuilder-backend.onrender.com/webhook/whatsapp/[COMPANY_ID]
   ```
   (Reemplaza `[COMPANY_ID]` con el ID de la empresa en tu base de datos)
5. **Verify Token**: El mismo que configuraste en la tabla `companies.webhook_verify_token`
6. **Verify and Save**
7. **Subscribe** a los campos:
   - ✅ messages
   - ✅ message_status

---

## ⚠️ Limitaciones del Plan Gratuito de Render

### ❗ IMPORTANTE - Sleep Mode
El servicio gratuito de Render **se duerme después de 15 minutos de inactividad**.

**Qué significa esto:**
- La primera request después de que se duerme tardará **~30-50 segundos** en responder
- Requests subsecuentes serán normales (rápidas)
- No pierdes datos, solo es más lento al inicio

**Soluciones:**

#### Opción 1: Cron Job Gratuito (Recomendado)
Usa **cron-job.org** (gratis) para hacer ping cada 14 minutos:

1. Ve a https://cron-job.org
2. Crea cuenta gratis
3. **Create cronjob**:
   ```
   Title: Keep BotBuilder Awake
   URL: https://botbuilder-backend.onrender.com/api/health
   Schedule: */14 * * * * (cada 14 minutos)
   ```
4. **Save**

✅ Ahora tu backend nunca se dormirá

#### Opción 2: UptimeRobot (Alternativa)
1. Ve a https://uptimerobot.com
2. Crea cuenta gratis
3. **Add New Monitor**:
   ```
   Monitor Type: HTTP(s)
   Friendly Name: BotBuilder Backend
   URL: https://botbuilder-backend.onrender.com/api/health
   Monitoring Interval: 5 minutes
   ```

### Otras limitaciones (no críticas):
- 750 horas/mes (suficiente para 1 proyecto)
- 100 GB bandwidth/mes (suficiente para ~10K requests)
- Si necesitas más, upgrade a $7/mes

---

## 💰 Costos Resumidos

| Servicio | Costo |
|----------|-------|
| Render (Backend) | **$0/mes** ✅ |
| Netlify (Frontend) | **$0/mes** ✅ |
| Supabase (Database) | **$0/mes** ✅ |
| Cron-job.org (Keep Alive) | **$0/mes** ✅ |
| WhatsApp Cloud API | **$0** (gratis hasta 1000 conversaciones/mes) ✅ |
| Groq AI | **$0** (tier gratuito generoso) ✅ |

### **Total: $0/mes** 🎉

---

## 🔧 Troubleshooting

### Backend no responde
1. Verifica que el deploy terminó en Render
2. Revisa los logs en Render Dashboard → Logs
3. Verifica variables de entorno

### WhatsApp webhook no funciona
1. Verifica que la URL en Meta apunta a Render
2. Verifica que `company.active = 1` en Supabase
3. Revisa logs de Render para ver si llegan requests

### Frontend no conecta con backend
1. Verifica `VITE_API_URL` en Netlify
2. Verifica CORS en backend (ya está configurado)
3. Abre DevTools → Console para ver errores

### Backend se duerme
1. Configura cron-job.org (ver arriba)
2. O actualiza a plan de pago ($7/mes) en Render

---

## 📊 Monitoreo

### Render Dashboard
- **Logs en tiempo real**: https://dashboard.render.com → Tu servicio → Logs
- **Métricas**: CPU, memoria, requests
- **Deploy history**: Ver deploys anteriores

### Netlify Dashboard
- **Build logs**: https://app.netlify.com → Tu sitio → Deploys
- **Analytics**: Visitas, bandwidth

---

## 🚀 Deploy Automático

Cada vez que hagas `git push`:
- ✅ Render detecta el cambio y hace deploy automáticamente
- ✅ Netlify detecta el cambio y hace build + deploy

**No necesitas hacer nada más** ✨

---

## 🆙 Próximos Deploys

Cuando hagas cambios:

```bash
# 1. Hacer tus cambios
# 2. Commitear
git add .
git commit -m "feat: nueva funcionalidad"

# 3. Push
git push origin main

# 4. Esperar 2-3 min
# ✅ Deploy automático en Render y Netlify
```

---

## ❓ ¿Necesitas Ayuda?

Si algo falla:
1. Revisa los logs en Render
2. Verifica las variables de entorno
3. Contacta: jhonx3723@gmail.com

---

**🎉 ¡Tu proyecto está listo para funcionar 24/7 sin pagar nada!**
