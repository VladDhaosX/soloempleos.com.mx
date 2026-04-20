# FASE 7 — Deploy en Hostinger

**Estimado:** 2-3 hrs
**Depende de:** FASES 1-6 completas y funcionando localmente
**Bloquea:** nada — es la fase final

---

## Contexto del proyecto

**Solo Empleos** es un portal de empleo para Guadalajara y Monterrey. Esta fase mueve el proyecto del entorno local a producción en **Hostinger Business**.

**Dominio actual:** `soloempleos.com.mx` (apuntando al servidor viejo con WordPress)
**Destino:** Hostinger Business (~$4/mes)

El sitio consiste en archivos estáticos (HTML/CSS/JS/JSON/imágenes) servidos por Hostinger, más una app Node.js (Express) que maneja uploads y emails.

---

## Estructura final del proyecto a subir

```
/                               ← public_html en Hostinger
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
├── /mty/                       ← misma estructura
├── /admin/
│   ├── index.html
│   ├── css/admin.css
│   └── js/admin.js
├── /shared/
│   ├── css/
│   ├── js/
│   └── img/
└── /soloempleos/               ← app Node.js
    ├── package.json
    ├── server.js
    └── /routes/
```

---

## Paso 1 — Contratar Hostinger Business

- Plan: **Business Web Hosting** (~$4/mes)
- Soporta: PHP (ignorar), MySQL (ignorar), **Node.js hasta 5 apps** ✅
- SSL gratuito incluido
- File Manager incluido
- hPanel (panel de control propio de Hostinger)

---

## Paso 2 — Configurar dominio

**Opción A — Transferir dominio a Hostinger**
- En hPanel → Dominios → Agregar dominio → `soloempleos.com.mx`
- Cambiar nameservers en el registrador actual a los de Hostinger
- Propagación: hasta 24-48 hrs

**Opción B — Solo apuntar DNS (mantener dominio en registrador actual)**
- En el registrador: cambiar registros A para `soloempleos.com.mx` y `www.soloempleos.com.mx` a la IP de Hostinger
- Hostinger asigna IP al crear la cuenta
- Propagación: hasta 24 hrs

**Recomendado: Opción B** — menos pasos, dominio sigue en el registrador actual.

---

## Paso 3 — Subir archivos estáticos

**Via File Manager de hPanel:**
1. hPanel → File Manager → `public_html`
2. Subir todos los archivos del proyecto (excepto `/soloempleos/`)
3. Verificar permisos: carpetas `755`, archivos `644`
4. Verificar que `/gdl/data/` y `/mty/data/` tienen los JSON iniciales con datos reales

**Archivos JSON iniciales a crear antes de subir:**

`/gdl/data/portada.json`:
```json
{
  "url": "/gdl/uploads/portadas/portada-inicial.jpg",
  "version": "1745000001"
}
```

`/gdl/data/vacantes.json`:
```json
[]
```

(Mismos para `/mty/data/`)

**Subir portada inicial:** subir también la imagen de portada actual a `/gdl/uploads/portadas/` y `/mty/uploads/portadas/`.

---

## Paso 4 — Configurar app Node.js

En hPanel → **Node.js** → Create Application:

| Campo | Valor |
|---|---|
| Node.js version | 18.x o superior |
| Application root | `soloempleos` |
| Application URL | `soloempleos.com.mx/soloempleos` |
| Application startup file | `server.js` |

Después de crear:
1. Click en **"Open terminal"** en hPanel (o SSH si está disponible)
2. Navegar a carpeta de la app: `cd /home/{usuario}/domains/soloempleos.com.mx/soloempleos`
3. Instalar dependencias: `npm install`
4. La app arranca automáticamente (Hostinger la gestiona)

---

## Paso 5 — Variables de entorno

En hPanel → Node.js → tu app → **Environment Variables**:

| Key | Valor |
|---|---|
| `PORT` | (Hostinger asigna automáticamente — no configurar manualmente) |
| `ADMIN_USER` | `admin` |
| `ADMIN_PASSWORD` | `[contraseña segura]` |
| `JWT_SECRET` | `[string aleatorio largo, mínimo 32 chars]` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `[cuenta gmail]` |
| `SMTP_PASS` | `[app password de gmail]` |
| `EMAIL_DESTINO` | `projectmanager@soloofertas.com` |

**Nunca subir `.env` al servidor.** Solo configurar desde hPanel.

---

## Paso 6 — SSL (HTTPS)

En hPanel → SSL → instalar certificado gratuito Let's Encrypt para `soloempleos.com.mx`.

Hostinger lo gestiona automáticamente. Solo activar y esperar ~5 min.

---

## Paso 7 — Verificación end-to-end

Probar en orden:

1. **Portal landing:** `https://soloempleos.com.mx/` → ¿muestra portadas GDL/MTY?
2. **Inicio GDL:** `https://soloempleos.com.mx/gdl/inicio/` → ¿muestra hero y grid?
3. **Contacto:** `https://soloempleos.com.mx/gdl/contacto/` → ¿formulario carga?
4. **Admin login:** `https://soloempleos.com.mx/admin/` → ¿pide login?
5. **Admin — subir portada:** entrar, subir JPG de portada GDL → verificar que aparece en portal landing
6. **Admin — subir vacante:** subir JPG de vacante → verificar que aparece en inicio GDL
7. **Admin — eliminar vacante:** eliminar → verificar que desaparece del grid
8. **Contacto — enviar:** llenar formulario → verificar email llega a projectmanager@soloofertas.com
9. **Mobile:** verificar todas las páginas en mobile (Chrome DevTools o dispositivo real)

---

## Problemas comunes y soluciones

| Problema | Solución |
|---|---|
| App Node.js no arranca | Verificar `npm install` corrió, revisar logs en hPanel |
| CORS error en frontend | Verificar que `cors()` está en server.js antes de rutas |
| Imágenes no cargan | Verificar rutas relativas vs absolutas, permisos de carpetas |
| Email no llega | Verificar App Password de Gmail, revisar spam |
| JSON no actualiza | Verificar permisos de escritura en `/gdl/data/` (chmod 755) |
| 404 en rutas | Verificar que archivos index.html están en carpetas correctas |

---

## Permisos de carpetas de uploads

Las carpetas de uploads necesitan permisos de escritura para Node.js:

```bash
chmod 755 /home/{usuario}/domains/soloempleos.com.mx/gdl/uploads
chmod 755 /home/{usuario}/domains/soloempleos.com.mx/gdl/uploads/portadas
chmod 755 /home/{usuario}/domains/soloempleos.com.mx/gdl/uploads/vacantes
chmod 755 /home/{usuario}/domains/soloempleos.com.mx/mty/uploads
chmod 755 /home/{usuario}/domains/soloempleos.com.mx/mty/uploads/portadas
chmod 755 /home/{usuario}/domains/soloempleos.com.mx/mty/uploads/vacantes
chmod 644 /home/{usuario}/domains/soloempleos.com.mx/gdl/data/portada.json
chmod 644 /home/{usuario}/domains/soloempleos.com.mx/gdl/data/vacantes.json
```

---

## Entregables de esta fase

No hay archivos nuevos que crear — es configuración de servidor.

Documentar al terminar:
- IP del servidor Hostinger
- Usuario FTP/SSH
- URL del panel hPanel
- Contraseña admin del panel del sitio
- Cuenta Gmail usada para SMTP

## Criterio de éxito

- `https://soloempleos.com.mx/` carga con HTTPS sin warnings
- Portal muestra portadas reales de GDL y MTY
- Admin puede subir portada y aparece en portal en menos de 5 segundos
- Admin puede subir y eliminar vacantes
- Formulario de contacto envía email real
- Sitio funciona en mobile
- El sitio WordPress anterior ya no es accesible (DNS apunta a Hostinger)
