# FASE 6 — Panel Admin (`/admin/`)

**Estimado:** 4-5 hrs
**Depende de:** FASE 1 (CSS base), FASE 5 (API endpoints)
**Bloquea:** nada — es la última fase de UI

---

## Contexto del proyecto

**Solo Empleos** es un portal de empleo para Guadalajara y Monterrey. El panel admin es la herramienta interna que usa el operador del sitio (cliente) para gestionar el contenido sin tocar código.

El operador sube diariamente:
- La portada del día (imagen JPG del periódico de empleo)
- Las vacantes (imágenes JPG de anuncios de empresas)

**Stack:** HTML + CSS + JS vanilla. Consume la API de FASE 5.

**Acceso:** `soloempleos.com.mx/admin/` — protegido por login con usuario y contraseña.

---

## Archivos a crear

```
/admin/
├── index.html          ← Login (si no hay token) o panel (si hay token)
├── css/
│   └── admin.css       ← Estilos del panel
└── js/
    └── admin.js        ← Lógica completa del admin
```

---

## Flujo de autenticación

1. Usuario entra a `/admin/`
2. JS verifica si hay token válido en `localStorage.getItem('token')`
3. Si no hay token → mostrar pantalla de login
4. Usuario ingresa usuario + contraseña → `POST /api/auth/login`
5. Si respuesta 200 → guardar token en `localStorage`, mostrar panel
6. Si respuesta 401 → mostrar error "Credenciales incorrectas"
7. Token tiene duración de 8 horas — si expira, redirigir a login

---

## Pantalla: Login

```
┌─────────────────────────┐
│    SOLO EMPLEOS         │
│    Panel Admin          │
│                         │
│  Usuario                │
│  [__________________]   │
│                         │
│  Contraseña             │
│  [__________________]   │
│                         │
│  [     ENTRAR      ]    │
│                         │
│  ● Error: Credenciales  │  ← solo si falla
└─────────────────────────┘
```

- Centrada verticalmente en la pantalla
- Fondo oscuro (misma paleta que el sitio)
- Al dar ENTRAR: deshabilitar botón, mostrar "Entrando..."

---

## Panel principal (post-login)

### Header del admin
- Logo "SOLO EMPLEOS — Admin"
- Selector de región: **GDL** | **MTY** (tabs o botones)
- Botón "Cerrar sesión" (limpia localStorage, vuelve a login)

### Región activa
Todo el contenido del panel reacciona al selector GDL/MTY. Al cambiar región, se recargan los datos de esa región.

---

## Sección 1: Portada del día

```
┌─────────────────────────────────────────┐
│  PORTADA DEL DÍA                        │
│                                         │
│  [imagen actual — portada.jpg]          │
│  (click para cambiar)                   │
│                                         │
│  [  Subir nueva portada  ] ← input file │
└─────────────────────────────────────────┘
```

**Comportamiento:**
1. Al cargar: fetch `/{region}/data/portada.json` → mostrar imagen actual
2. Si no hay portada: mostrar placeholder gris con texto "Sin portada"
3. Click en imagen o en botón → abre selector de archivo
4. Al seleccionar archivo:
   - Mostrar preview local inmediato (antes de subir)
   - `POST /api/{region}/portada` con `multipart/form-data`
   - Header: `Authorization: Bearer {token}`
   - Mostrar indicador de carga durante upload
   - Al éxito: actualizar preview con nueva imagen
   - Al error: mostrar mensaje de error

---

## Sección 2: Vacantes

```
┌─────────────────────────────────────────┐
│  VACANTES                               │
│                                         │
│  [  + Subir vacante(s)  ] ← input file  │
│                                         │
│  ┌──────────┬──────────┐               │
│  │ [img]  ✕ │ [img]  ✕ │               │
│  ├──────────┼──────────┤               │
│  │ [img]  ✕ │ [img]  ✕ │               │
│  └──────────┴──────────┘               │
└─────────────────────────────────────────┘
```

**Comportamiento al cargar:**
1. Fetch `/{region}/data/vacantes.json`
2. Renderizar grid con todas las vacantes actuales
3. Cada vacante tiene botón ✕ en esquina superior derecha

**Subir vacante(s):**
1. Input file acepta múltiples archivos (`multiple`)
2. Al seleccionar: iterar archivos, subir uno por uno secuencialmente
3. `POST /api/{region}/vacantes` por cada archivo
4. Mostrar barra de progreso o contador "Subiendo 2 de 3..."
5. Al terminar: recargar grid desde JSON actualizado

**Eliminar vacante:**
1. Click en ✕ → confirmar: "¿Eliminar esta vacante?"
2. `DELETE /api/{region}/vacantes/{id}`
3. Al éxito: remover del grid sin recargar página
4. Al error: mostrar mensaje

---

## Especificación JS (`admin.js`)

Estructura modular sin frameworks:

```javascript
// Estado global
const state = {
  token: localStorage.getItem('token'),
  region: 'gdl'
};

// Módulos
const Auth = { login, logout, isAuthenticated };
const UI = { mostrarLogin, mostrarPanel, mostrarError, mostrarExito };
const API = { subirPortada, subirVacante, eliminarVacante, obtenerVacantes, obtenerPortada };

// Init
document.addEventListener('DOMContentLoaded', () => {
  if (Auth.isAuthenticated()) {
    UI.mostrarPanel();
    cargarDatos();
  } else {
    UI.mostrarLogin();
  }
});
```

### Función helper para requests autenticados
```javascript
async function apiRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${state.token}`,
      ...options.headers
    }
  });
  if (res.status === 401) {
    Auth.logout();
    UI.mostrarLogin();
    return null;
  }
  return res;
}
```

---

## Estilos del admin (`admin.css`)

- Fondo general: gris muy oscuro (`#0d0d0d`)
- Cards/secciones: `#1a1a1a` con borde `#333`
- Botones primarios: blanco sobre negro o azul oscuro
- Botón eliminar (✕): rojo `#dc2626`
- Grid de vacantes: 3-4 columnas desktop, 2 mobile
- Inputs de archivo: estilo custom (ocultar el input nativo, mostrar botón estilizado)
- Feedback messages: verde para éxito, rojo para error

---

## Seguridad básica

- Token guardado en `localStorage` (suficiente para este caso de uso)
- Todas las requests al API incluyen el token
- Si API retorna 401 → logout automático y redirect a login
- Admin solo accesible desde `/admin/` — no hay links públicos a esta ruta

---

## Entregables

1. `/admin/index.html`
2. `/admin/css/admin.css`
3. `/admin/js/admin.js`

## Criterio de éxito

- Login funciona con credenciales correctas → muestra panel
- Login falla con credenciales incorrectas → muestra error, no carga panel
- Selector GDL/MTY cambia los datos mostrados
- Portada actual se muestra al cargar; se puede reemplazar con upload
- Vacantes actuales se muestran en grid; se pueden agregar y eliminar
- Upload múltiple de vacantes funciona secuencialmente
- Botón cerrar sesión limpia localStorage y vuelve a login
- Sin errores en consola durante operación normal
