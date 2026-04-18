# FASE 5 — API Node.js (Backend)

**Estimado:** 4-5 hrs
**Depende de:** FASE 1 (conocer estructura de archivos JSON a escribir)
**Bloquea:** FASE 4 (endpoint contacto), FASE 6 (admin usa todos los endpoints)

---

## Contexto del proyecto

**Solo Empleos** es un portal de empleo para Guadalajara y Monterrey. El backend es un servidor Node.js + Express que:
1. Recibe uploads de imágenes desde el admin
2. Escribe/actualiza archivos JSON en el filesystem
3. Envía emails del formulario de contacto
4. Valida autenticación del admin

**No hay base de datos.** Todo el estado vive en archivos JSON. Las imágenes se guardan en el filesystem. El frontend las consume vía fetch estático.

**Hosting:** Hostinger Business — soporta Node.js (hasta 5 apps). El servidor corre como proceso Node.js persistente.

---

## Estructura de archivos del proyecto (referencia completa)

```
/
├── index.html
├── /gdl/
│   ├── inicio/index.html
│   ├── contacto/index.html
│   ├── /data/
│   │   ├── portada.json
│   │   └── vacantes.json
│   └── /uploads/
│       ├── /portadas/
│       └── /vacantes/
├── /mty/                       ← Misma estructura
├── /admin/
│   └── index.html
└── /api/
    ├── server.js               ← Entry point
    ├── package.json
    ├── .env                    ← Variables de entorno (no commitear)
    └── /routes/
        ├── auth.js
        ├── portada.js
        ├── vacantes.js
        └── contacto.js
```

---

## Variables de entorno (`.env`)

```env
PORT=3000
ADMIN_USER=admin
ADMIN_PASSWORD=SoloEmpleos2026!
JWT_SECRET=cambiar_esto_por_string_aleatorio_largo
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tucuenta@gmail.com
SMTP_PASS=tu_app_password_de_gmail
EMAIL_DESTINO=projectmanager@soloofertas.com
```

---

## `package.json`

```json
{
  "name": "soloempleos-api",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "multer": "^1.4.5",
    "nodemailer": "^6.9.0",
    "jsonwebtoken": "^9.0.0",
    "dotenv": "^16.0.0",
    "cors": "^2.8.5"
  }
}
```

---

## `server.js`

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Servir archivos estáticos del proyecto
app.use(express.static(path.join(__dirname, '..')));

// Rutas API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/gdl', require('./routes/portada')('gdl'));
app.use('/api/mty', require('./routes/portada')('mty'));
app.use('/api/gdl', require('./routes/vacantes')('gdl'));
app.use('/api/mty', require('./routes/vacantes')('mty'));
app.use('/api/contacto', require('./routes/contacto'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Solo Empleos API corriendo en puerto ${PORT}`));
```

---

## Endpoints requeridos

### `POST /api/auth/login`
**Propósito:** autenticar al admin, retornar JWT

**Request:**
```json
{ "usuario": "admin", "password": "SoloEmpleos2026!" }
```

**Response 200:**
```json
{ "token": "eyJhbGci..." }
```

**Response 401:**
```json
{ "error": "Credenciales inválidas" }
```

**Implementación:** comparar contra `ADMIN_USER` y `ADMIN_PASSWORD` de `.env`. Generar JWT con `jwt.sign({ rol: 'admin' }, JWT_SECRET, { expiresIn: '8h' })`.

---

### Middleware de autenticación

Todas las rutas de admin deben verificar el token JWT enviado en header:
```
Authorization: Bearer eyJhbGci...
```

```javascript
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Sin autorización' });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
}
```

---

### `POST /api/gdl/portada` y `POST /api/mty/portada`
**Propósito:** subir nueva imagen de portada del día
**Auth requerida:** sí

**Request:** `multipart/form-data` con campo `imagen` (archivo JPG/PNG)

**Proceso:**
1. Validar que es imagen (mimetype `image/*`)
2. Guardar en `/{region}/uploads/portadas/{timestamp}.jpg`
3. Actualizar `/{region}/data/portada.json`:
```json
{
  "url": "/gdl/uploads/portadas/1745012345.jpg",
  "version": "1745012345"
}
```

**Response 200:**
```json
{ "url": "/gdl/uploads/portadas/1745012345.jpg" }
```

---

### `POST /api/gdl/vacantes` y `POST /api/mty/vacantes`
**Propósito:** subir nueva imagen de vacante, agregarla al grid
**Auth requerida:** sí

**Request:** `multipart/form-data` con campo `imagen` (archivo JPG/PNG)

**Proceso:**
1. Validar imagen
2. Guardar en `/{region}/uploads/vacantes/{timestamp}.jpg`
3. Leer `/{region}/data/vacantes.json`
4. Agregar nuevo item al **inicio** del array (más reciente primero):
```json
[
  { "id": "1745099999", "url": "/gdl/uploads/vacantes/1745099999.jpg", "fecha": "2026-04-18" },
  { "id": "1745012345", "url": "/gdl/uploads/vacantes/1745012345.jpg", "fecha": "2026-04-17" }
]
```
5. Escribir JSON actualizado

**Response 200:**
```json
{ "id": "1745099999", "url": "/gdl/uploads/vacantes/1745099999.jpg" }
```

---

### `DELETE /api/gdl/vacantes/:id` y `DELETE /api/mty/vacantes/:id`
**Propósito:** eliminar vacante del grid
**Auth requerida:** sí

**Proceso:**
1. Leer `vacantes.json`
2. Filtrar fuera el item con `id === params.id`
3. Escribir JSON actualizado
4. (Opcional) Eliminar archivo de imagen del filesystem

**Response 200:**
```json
{ "ok": true }
```

**Response 404:**
```json
{ "error": "Vacante no encontrada" }
```

---

### `POST /api/contacto`
**Propósito:** enviar email del formulario de contacto
**Auth requerida:** no

**Request:**
```json
{
  "nombre": "Juan García",
  "email": "juan@empresa.com",
  "asunto": "Quiero anunciar",
  "mensaje": "Me interesa..."
}
```

**Validación backend:**
- nombre: string no vacío
- email: formato válido
- asunto: string no vacío
- mensaje: opcional

**Proceso:** usar nodemailer con SMTP de `.env`

**Email resultante:**
```
Para: projectmanager@soloofertas.com
Asunto: [Solo Empleos] Quiero anunciar
Cuerpo:
  Nombre: Juan García
  Email: juan@empresa.com
  Asunto: Quiero anunciar
  Mensaje: Me interesa...
```

**Response 200:** `{ "ok": true }`
**Response 400:** `{ "error": "Campos requeridos faltantes" }`
**Response 500:** `{ "error": "Error al enviar email" }`

---

## Configuración SMTP (nodemailer)

Usar Gmail con App Password (no contraseña normal):
1. Activar 2FA en cuenta Gmail
2. Generar "Contraseña de aplicación" en Google Account → Seguridad
3. Usar esa contraseña en `SMTP_PASS`

```javascript
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
```

---

## Manejo de errores general

- Todos los endpoints retornan JSON
- Errores inesperados: `500 { "error": "Error interno" }` — nunca exponer stack trace
- Logs en consola para debugging en Hostinger

---

## Configuración en Hostinger

En hPanel → Node.js Apps:
- Entry point: `api/server.js`
- Node version: 18+
- Variables de entorno: configurar desde hPanel (no subir `.env` al servidor)
- Puerto: el que Hostinger asigne (leer de `process.env.PORT`)

---

## Entregables

1. `/api/package.json`
2. `/api/server.js`
3. `/api/routes/auth.js`
4. `/api/routes/portada.js`
5. `/api/routes/vacantes.js`
6. `/api/routes/contacto.js`
7. `/api/.env.example` (sin valores reales, solo keys)

## Criterio de éxito

- `POST /api/auth/login` con credenciales correctas retorna JWT
- `POST /api/auth/login` con credenciales incorrectas retorna 401
- Ruta sin token retorna 401
- `POST /api/gdl/portada` sube imagen y actualiza portada.json
- `POST /api/gdl/vacantes` sube imagen y la agrega al inicio de vacantes.json
- `DELETE /api/gdl/vacantes/:id` elimina item del JSON
- `POST /api/contacto` envía email real a projectmanager@soloofertas.com
- Rutas MTY funcionan igual que GDL con sus propios archivos
