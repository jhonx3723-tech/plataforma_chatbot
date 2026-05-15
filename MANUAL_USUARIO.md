# Manual de Usuario — BotBuilder
**Plataforma de chatbots para WhatsApp**

---

## ¿Qué es BotBuilder?

BotBuilder es una plataforma que te permite crear chatbots automáticos para WhatsApp y gestionar las conversaciones de tus clientes desde un solo lugar. Sin necesidad de programar — todo se configura visualmente.

---

## Roles de usuario

| Rol | Qué puede hacer |
|-----|----------------|
| **Super Admin** | Acceso total: gestionar empresas, usuarios, ver reportes, estadísticas globales |
| **Cliente** | Ver y gestionar conversaciones de su empresa |
| **Agente** | Atender conversaciones asignadas de su empresa |

---

## Cómo ingresar

1. Ve a la URL de la plataforma
2. Ingresa tu **usuario** y **contraseña**
3. El sistema te lleva automáticamente a tu área según tu rol

> Credenciales por defecto del administrador: `admin` / `admin123`
> **Cámbiala inmediatamente después del primer ingreso.**

---

## SECCIÓN 1 — Dashboard (Solo Super Admin)

El dashboard es la pantalla principal de estadísticas. Muestra:

- **Mensajes hoy** — cuántos mensajes entraron en el día
- **Conversaciones nuevas hoy** — chats iniciados hoy
- **Con agente** — conversaciones que están siendo atendidas por una persona
- **Tasa bot→humano** — porcentaje de chats donde el bot transfirió a un agente
- **Empresas registradas** — total y cuántas están activas
- **Top empresas** — las más activas por volumen de conversaciones
- **Lista de empresas recientes** — acceso rápido

---

## SECCIÓN 2 — Empresas (Solo Super Admin)

Aquí gestionas las cuentas de cada cliente de la plataforma.

### Crear una empresa

1. Clic en **"Nueva empresa"**
2. Completa:
   - **Nombre** de la empresa
   - **Teléfono** registrado en WhatsApp Business
   - **WhatsApp Phone ID** — lo obtienes en Meta Business
   - **WhatsApp Token** — token de acceso permanente de Meta
3. Configura el **horario de atención** (opcional):
   - Activa/desactiva por día de la semana
   - Define hora de apertura y cierre
   - Escribe un mensaje automático para fuera de horario
4. Guarda

### Webhook de WhatsApp

Cada empresa tiene una URL de webhook única. La necesitas para conectar con Meta:

- Clic en el ícono de copiar junto a la empresa
- Pega esa URL en el panel de Meta/Facebook como "Webhook URL"
- El token de verificación también está en la empresa

### Activar/desactivar empresa

- El toggle verde/gris activa o desactiva una empresa
- Una empresa inactiva no recibirá mensajes

---

## SECCIÓN 3 — Constructor de Flujos

El flow builder es donde diseñas el chatbot visualmente.

### Abrir el editor

1. Ve a **Empresas**
2. Clic en el ícono de flujos de la empresa
3. Crea un nuevo flujo o abre uno existente

### Tipos de nodos (bloques)

| Nodo | Para qué sirve |
|------|---------------|
| **Inicio** | El primer mensaje que recibe el cliente al escribir |
| **Mensaje** | Envía un texto al cliente y pasa al siguiente bloque |
| **Opciones** | Muestra botones o una lista para que el cliente elija |
| **Transferir** | Pasa la conversación a un agente humano |
| **Fin** | Termina la conversación y envía un mensaje de cierre |

### Cómo construir un flujo

1. Arrastra un nodo desde el panel izquierdo al área de trabajo
2. Haz clic en el nodo para editarlo (escribe el mensaje)
3. Conecta los nodos arrastrando desde el punto de salida de uno al punto de entrada del otro
4. En nodos de **Opciones**: cada opción tiene su propia salida — conéctalas a diferentes rutas
5. Cuando termines, clic en **Guardar** y luego activa el flujo

### Variables disponibles en los mensajes

Puedes usar estas variables en cualquier texto — se reemplazan automáticamente:

| Variable | Se reemplaza por |
|----------|-----------------|
| `{{nombre}}` | Nombre del contacto en WhatsApp |
| `{{telefono}}` | Número de teléfono del cliente |
| `{{empresa}}` | Nombre de la empresa |

**Ejemplo:** `Hola {{nombre}}, bienvenido a {{empresa}} 👋`

### Reglas del flujo

- Solo **un flujo puede estar activo** por empresa a la vez
- Al activar uno nuevo, el anterior se desactiva automáticamente
- Un flujo inactivo no procesa mensajes

---

## SECCIÓN 4 — Bandeja de Entrada (Inbox)

La bandeja es donde atiendes las conversaciones en tiempo real.

### Panel izquierdo — Lista de conversaciones

Las conversaciones se actualizan en tiempo real sin recargar la página.

**Filtros disponibles:**
- **Todos** — todas las conversaciones
- **Mías** — solo las asignadas a ti
- **Bot** — siendo atendidas por el chatbot
- **Agente** — siendo atendidas por una persona
- **Cerradas** — conversaciones finalizadas

**Búsqueda:** Puedes buscar por teléfono, nombre, empresa o contenido del mensaje.

**Indicadores en cada conversación:**
- 🟢 **Bot** / 🟡 **Agente** / ⚫ **Cerrada** — estado actual
- Número en naranja — mensajes sin leer
- Nombre del agente asignado
- Etiquetas de colores

### Panel derecho — Chat

Al hacer clic en una conversación, ves el historial completo.

#### Enviar respuesta

1. Escribe en el campo de texto inferior
2. Clic en **Enviar** — el mensaje llega al WhatsApp del cliente

#### Usar plantillas

1. Escribe `/` en el campo de respuesta
2. Aparece una lista de tus plantillas guardadas
3. Selecciona la que necesitas — el texto se inserta automáticamente

#### Agregar nota interna

- Las notas son visibles solo para el equipo, **no se envían al cliente**
- Clic en **"Nota"** → escribe → Guardar
- Las notas aparecen con fondo diferente en el chat

#### Asignar agente

- Clic en el botón **Asignar**
- Selecciona un agente de la lista
- El agente verá la conversación en su filtro "Mías"

#### Cambiar estado

| Botón | Qué hace |
|-------|----------|
| **→ Agente** | Transfiere del bot a atención humana |
| **→ Cerrada** | Marca la conversación como resuelta |
| **Reiniciar bot** | Vuelve a empezar el flujo desde el inicio para este cliente |

#### Etiquetas

- Clic en **"+ Etiqueta"** para agregar
- Las etiquetas ayudan a organizar y filtrar conversaciones

### Información del contacto

En el panel derecho superior puedes ver y editar:
- Nombre del contacto
- Empresa del contacto
- Notas internas sobre ese contacto

---

## SECCIÓN 5 — Usuarios (Solo Super Admin)

Gestión de cuentas de acceso a la plataforma.

### Tipos de usuario que puedes crear

| Tipo | Descripción |
|------|-------------|
| **Cliente** | Acceso completo a su empresa (dueño de la cuenta) |
| **Agente** | Agente de atención de una empresa |

### Crear usuario

1. Clic en **"Nuevo usuario"**
2. Completa nombre de usuario, contraseña, rol y empresa
3. Para cliente: se requiere email
4. Guardar

### Otras acciones

- **Restablecer contraseña** — asigna una nueva contraseña
- **Activar/Desactivar** — bloquea el acceso sin eliminar el usuario
- **Eliminar** — elimina permanentemente

---

## SECCIÓN 6 — Plantillas de Respuesta

Las plantillas son respuestas rápidas que los agentes pueden insertar con un atajo.

### Crear una plantilla

1. Ve a **Plantillas** desde el menú
2. Clic en **"Nueva plantilla"**
3. Define:
   - **Atajo** — palabra clave sin espacios (ej: `saludo`, `horario`, `precio`)
   - **Contenido** — el texto completo de la respuesta
4. Guardar

### Usar una plantilla en el chat

- En el campo de respuesta, escribe `/` seguido del atajo
- Ej: `/saludo` → muestra la plantilla de bienvenida
- Selecciónala y se inserta automáticamente

---

## SECCIÓN 7 — Etiquetas

Las etiquetas sirven para clasificar conversaciones.

### Crear etiqueta

1. Ve a **Etiquetas**
2. Clic en **"Nueva etiqueta"**
3. Escribe el nombre y elige un color
4. Guardar

### Usar etiquetas

- Se asignan directamente desde el chat (botón "Etiqueta")
- Se pueden ver en la lista de conversaciones
- Útil para clasificar: Venta, Soporte, Urgente, etc.

---

## SECCIÓN 8 — Reportes (Solo Super Admin)

Exporta datos de la plataforma a Excel/CSV.

### Tipos de reporte

| Reporte | Contenido |
|---------|-----------|
| **Conversaciones** | ID, empresa, teléfono, estado, último mensaje, fechas |
| **Mensajes** | Empresa, teléfono, dirección, quién envió, agente, contenido, fecha |

### Cómo exportar

1. Ve a **Reportes**
2. Selecciona rango de fechas (desde / hasta)
3. Filtra por empresa si necesitas
4. Clic en **"Ver conteo"** para previsualizar cuántos registros hay
5. Clic en **"Exportar conversaciones"** o **"Exportar mensajes"**
6. Se descarga un archivo CSV que abre en Excel

---

## Flujo típico de una conversación

```
Cliente escribe en WhatsApp
        ↓
Bot responde automáticamente (según el flujo configurado)
        ↓
Si el cliente elige "Hablar con un agente" → 
        ↓
Agente ve la conversación en la bandeja con badge "Agente"
        ↓
Agente responde desde la plataforma → mensaje llega al WhatsApp del cliente
        ↓
Agente cierra la conversación cuando se resuelve
```

---

## Preguntas frecuentes

**¿Por qué el bot no responde?**
- Verifica que el flujo esté activo (toggle verde en la empresa)
- Verifica que el WhatsApp Phone ID y Token estén correctos
- Verifica que el webhook esté configurado en Meta

**¿El cliente escribió pero no aparece en la bandeja?**
- Espera unos segundos — actualiza en tiempo real
- Verifica que la empresa esté activa
- Revisa que estás viendo el filtro correcto ("Todos")

**¿Cómo sé si un mensaje lo envió el bot o un agente?**
- En el chat, los mensajes del bot tienen fondo diferente
- Los mensajes de agente muestran el nombre del agente

**¿Puedo tener varios flujos?**
- Sí, pero solo uno activo a la vez por empresa
- Puedes tener varios guardados y activar el que necesites

---

*Versión 1.0 — BotBuilder Platform*
