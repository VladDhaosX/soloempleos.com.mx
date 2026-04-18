# FASE 2 — Portal Landing (`/`)

**Estimado:** 2-3 hrs
**Depende de:** FASE 1 (header, footer, CSS base)
**Bloquea:** nada (página independiente)

---

## Contexto del proyecto

**Solo Empleos** es un portal de empleo para Guadalajara y Monterrey, México. El portal landing es la primera página que ve el usuario al entrar a `soloempleos.com.mx/` — no tiene header/footer regional, es una página de selección de ciudad.

**Stack:** HTML + CSS + JS vanilla. Sin frameworks. Sin base de datos.

**Referencia visual:** https://soloempleos.com.mx/ (la página raíz actual)

---

## Qué hace esta página

Muestra dos opciones al usuario: **GUADALAJARA** o **MONTERREY**. Cada opción muestra la portada del día (imagen JPG) que se actualiza diariamente desde el admin. Al dar click en cualquiera, redirige al sitio regional.

---

## Archivos a crear

```
/
├── index.html              ← Portal landing
├── css/
│   └── landing.css         ← Estilos específicos del landing
└── js/
    └── landing.js          ← Carga portadas desde JSON
```

---

## Datos dinámicos

Esta página lee dos archivos JSON para mostrar las portadas del día:

**`/gdl/data/portada.json`**
```json
{
  "url": "/gdl/uploads/portadas/portada-2026-04-18.jpg",
  "version": "1745012345"
}
```

**`/mty/data/portada.json`**
```json
{
  "url": "/mty/uploads/portadas/portada-2026-04-18.jpg",
  "version": "1745012346"
}
```

El campo `version` se usa como cache-buster: `<img src="${url}?v=${version}">`.

Si el JSON no carga o la imagen falla, mostrar placeholder gris con texto "Sin portada disponible".

---

## Especificación visual

### Layout desktop
```
┌─────────────────────────────────────────────┐
│            [LOGO SOLO EMPLEOS]              │
├──────────────────┬──────────────────────────┤
│   GUADALAJARA    │       MONTERREY          │
│  [imagen JPG]   │      [imagen JPG]        │
│   portada GDL   │      portada MTY         │
└──────────────────┴──────────────────────────┘
```

- Logo centrado arriba, fondo blanco o muy claro
- Dos columnas iguales (50/50)
- Título de ciudad en texto grande, centrado sobre imagen
- Imagen ocupa el ancho de la columna
- Toda la columna es clickeable (link)

### Layout mobile
- Columnas apiladas verticalmente (GDL arriba, MTY abajo)
- Ancho completo cada una

### Interacción
- Click en columna GDL → navega a `/gdl/inicio/`
- Click en columna MTY → navega a `https://empleosmty.com/` (sitio externo por ahora)
- Hover: leve sombra o efecto en la imagen

---

## Especificación JS (`landing.js`)

```javascript
// Pseudocódigo
async function cargarPortadas() {
  const [gdl, mty] = await Promise.all([
    fetch('/gdl/data/portada.json').then(r => r.json()),
    fetch('/mty/data/portada.json').then(r => r.json())
  ]);

  document.querySelector('#portada-gdl').src = `${gdl.url}?v=${gdl.version}`;
  document.querySelector('#portada-mty').src = `${mty.url}?v=${mty.version}`;
}
```

Manejar errores: si fetch falla, mostrar placeholder.

---

## Archivos JSON de prueba a crear

Para que la página funcione localmente durante desarrollo, crear estos archivos con datos de ejemplo:

- `/gdl/data/portada.json` — con una URL de imagen de prueba
- `/mty/data/portada.json` — con una URL de imagen de prueba

---

## Entregables

1. `index.html` — página landing completa
2. `css/landing.css` — estilos del landing
3. `js/landing.js` — carga dinámica de portadas
4. `/gdl/data/portada.json` — JSON de prueba GDL
5. `/mty/data/portada.json` — JSON de prueba MTY

## Criterio de éxito

- Página carga sin errores
- Muestra portadas GDL y MTY desde JSON
- Click en GDL redirige a `/gdl/inicio/`
- Click en MTY redirige a `https://empleosmty.com/`
- Responsive: se apila en mobile
- Si JSON falla → placeholder gris, no error visible al usuario
