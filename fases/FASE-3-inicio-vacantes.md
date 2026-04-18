# FASE 3 — Página Inicio / Vacantes (`/gdl/inicio/`)

**Estimado:** 3-4 hrs
**Depende de:** FASE 1 (header, footer, CSS base)
**Bloquea:** FASE 6 (admin necesita saber cómo se renderiza el grid)

---

## Contexto del proyecto

**Solo Empleos** es un portal de empleo para Guadalajara y Monterrey, México. La página de inicio es la principal — muestra el grid de vacantes del día. Cada vacante es una imagen JPG de un anuncio de empleo que el admin sube manualmente.

**Stack:** HTML + CSS + JS vanilla. Sin frameworks. Sin base de datos.

**Referencia visual:** https://soloempleos.com.mx/gdl/inicio/

Esta página existe para **GDL** (`/gdl/inicio/`) y **MTY** (`/mty/inicio/`). Misma estructura, diferente JSON de datos.

---

## Qué ve el usuario

1. **Hero banner** — imagen de fondo con texto encima
2. **Sección "Vacantes"** — grid de imágenes JPG de anuncios de empleo
3. Header y footer (de FASE 1)

---

## Archivos a crear

```
/gdl/inicio/
├── index.html              ← Página de inicio GDL
/mty/inicio/
├── index.html              ← Página de inicio MTY (idéntica, data-region="mty")
/shared/css/
└── inicio.css              ← Estilos del hero y grid de vacantes
/shared/js/
└── inicio.js               ← Carga vacantes desde JSON
/gdl/data/
└── vacantes.json           ← Lista de vacantes GDL (JSON de prueba)
/mty/data/
└── vacantes.json           ← Lista de vacantes MTY (JSON de prueba)
```

---

## Datos dinámicos

**`/gdl/data/vacantes.json`**
```json
[
  {
    "id": "1745012345",
    "url": "/gdl/uploads/vacantes/zoltek-operador.jpg",
    "fecha": "2026-04-18"
  },
  {
    "id": "1745012200",
    "url": "/gdl/uploads/vacantes/aga-vendedor.jpg",
    "fecha": "2026-04-17"
  }
]
```

- Array ordenado: más reciente primero (índice 0 = más nueva)
- El admin agrega items al inicio del array al subir nueva vacante
- El admin elimina items por `id`

---

## Especificación: Hero Banner

```
┌─────────────────────────────────────────────┐
│  [imagen de fondo difuminada]               │
│                                             │
│     Los Mejores Empleos          (h2)       │
│  Somos el puente entre el talento           │
│  y las mejores empresas del país  (p)       │
│                                             │
└─────────────────────────────────────────────┘
```

- Imagen de fondo: apretón de manos (referencia sitio actual) o genérica de empleo
- Overlay oscuro semi-transparente sobre imagen
- Texto blanco centrado
- Altura: ~300px desktop, ~200px mobile

---

## Especificación: Grid de Vacantes

```
┌───────────────┬───────────────┐
│  [imagen JPG] │  [imagen JPG] │
│   vacante 1   │   vacante 2   │
├───────────────┼───────────────┤
│  [imagen JPG] │  [imagen JPG] │
│   vacante 3   │   vacante 4   │
└───────────────┴───────────────┘
```

- 2 columnas en desktop, 1 columna en mobile
- Cada celda: imagen JPG a ancho completo de la columna
- Sin títulos ni texto sobre las imágenes (el anuncio ya tiene texto dentro del JPG)
- Sin links en las imágenes (por ahora — cliente no pidió destino de click)
- Espaciado entre imágenes: ~8-12px gap
- Si vacantes.json está vacío: mostrar mensaje "No hay vacantes disponibles"
- Si una imagen falla al cargar: placeholder gris, no romper grid

### Comportamiento de carga

```javascript
// Pseudocódigo inicio.js
async function cargarVacantes() {
  const region = document.body.dataset.region; // 'gdl' o 'mty'
  const data = await fetch(`/${region}/data/vacantes.json`).then(r => r.json());
  
  const grid = document.querySelector('#vacantes-grid');
  grid.innerHTML = data.map(v => `
    <div class="vacante-item">
      <img src="${v.url}" alt="Vacante" loading="lazy" onerror="this.src='/shared/img/placeholder.jpg'">
    </div>
  `).join('');
}
```

---

## Estructura HTML base de la página

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inicio - Solo Empleos Guadalajara</title>
  <link rel="stylesheet" href="/shared/css/base.css">
  <link rel="stylesheet" href="/shared/css/header.css">
  <link rel="stylesheet" href="/shared/css/footer.css">
  <link rel="stylesheet" href="/shared/css/inicio.css">
</head>
<body data-region="gdl">

  <div id="header-placeholder"></div>

  <main>
    <!-- Hero -->
    <section class="hero">
      <div class="hero-overlay">
        <h2>Los Mejores Empleos</h2>
        <p>Somos el puente entre el talento y las mejores empresas del país</p>
      </div>
    </section>

    <!-- Vacantes -->
    <section class="vacantes">
      <h2>Vacantes</h2>
      <div id="vacantes-grid" class="vacantes-grid">
        <!-- JS inserta aquí -->
      </div>
    </section>
  </main>

  <div id="footer-placeholder"></div>

  <script src="/shared/js/components.js"></script>
  <script src="/shared/js/inicio.js"></script>
</body>
</html>
```

Para MTY: cambiar `data-region="mty"` y title.

---

## Imagen placeholder

Crear `/shared/img/placeholder.jpg` — rectángulo gris 400x300px con texto "Sin imagen". Se usa cuando una vacante falla al cargar.

---

## Entregables

1. `/gdl/inicio/index.html`
2. `/mty/inicio/index.html` (copia con `data-region="mty"`)
3. `/shared/css/inicio.css`
4. `/shared/js/inicio.js`
5. `/gdl/data/vacantes.json` (datos de prueba, mínimo 4 items)
6. `/mty/data/vacantes.json` (datos de prueba, mínimo 2 items)
7. `/shared/img/placeholder.jpg`

## Criterio de éxito

- Hero muestra imagen de fondo + textos correctos
- Grid carga vacantes desde JSON dinámicamente
- 2 columnas desktop, 1 columna mobile
- Imágenes fallidas muestran placeholder, no rompen layout
- `data-region="mty"` carga `/mty/data/vacantes.json` correctamente
- Sin console errors
