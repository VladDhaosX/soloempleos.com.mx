# FASE 1 — Estructura base y componentes comunes

**Estimado:** 3-4 hrs
**Depende de:** nada — esta es la primera fase
**Bloquea:** todas las demás fases

---

## Contexto del proyecto

Se está construyendo **Solo Empleos** desde cero — portal de empleo para Guadalajara y Monterrey, México. Reemplaza un sitio WordPress legacy.

**Stack:**
- Frontend: HTML + CSS + JS vanilla (sin frameworks)
- Backend: Node.js + Express (Fase 5)
- Storage: archivos JSON en filesystem (sin base de datos)
- Hosting: Hostinger Business

**Sitio de referencia visual:** https://soloempleos.com.mx/gdl/inicio/

El objetivo de esta fase es crear los componentes reutilizables (header, footer, CSS base) que todas las páginas comparten.

---

## Estructura de archivos a crear en esta fase

```
/
├── shared/
│   ├── header.html         ← HTML del header (snippet reutilizable)
│   ├── footer.html         ← HTML del footer (snippet reutilizable)
│   ├── css/
│   │   ├── base.css        ← Reset, variables, tipografía
│   │   ├── header.css      ← Estilos del header
│   │   └── footer.css      ← Estilos del footer
│   └── js/
│       └── components.js   ← Inyección de header/footer en páginas
└── index.html              ← Página vacía de prueba para verificar componentes
```

---

## Especificación: Header

### Estructura visual (de arriba a abajo)
1. **Logo** — "SOLO EMPLEOS" — centrado, link a `/`
2. **Botones regionales** — dos botones side by side:
   - "Guadalajara" → link a `https://soloempleos.com.mx/gdl`
   - "Ir a Monterrey" → link a `https://empleosmty.com/`
3. **Menú de navegación** — tres items:
   - "INICIO" → `/gdl/inicio/`
   - "CONTACTO" → `/gdl/contacto/`
   - "SOLO OFERTAS" → `https://soloofertas.com/gdl/` (botón destacado, color diferente)

### Comportamiento
- Header fijo en la parte superior (sticky)
- Fondo oscuro (negro o gris muy oscuro, referencia sitio actual)
- Logo en blanco sobre fondo oscuro
- En mobile: menú colapsa o se apila verticalmente

### Nota sobre regionalización
El header tiene links hardcodeados a `/gdl/`. Las páginas de `/mty/` usarán una variante donde los links apuntan a `/mty/`. Implementar esto con un atributo `data-region="gdl|mty"` en el `<body>` que `components.js` lee para ajustar los links dinámicamente.

---

## Especificación: Footer

### Contenido (de arriba a abajo)
1. **Secciones** — heading "SECCIONES" + lista de links:
   - inicio → `/gdl/inicio/`
   - Contacto → `/gdl/contacto/`
   - Solo Ofertas → `https://soloofertas.com/gdl/`
2. **Direcciones** — dos columnas:
   - **Guadalajara:** Av. López Mateos Sur #5142, Col. La Calma, CP 45070, Zapopan, Jalisco. Conmutador: 333 4477 077. Email: projectmanager@soloofertas.com
   - **Monterrey:** Diego de Montemayor #104, Col. Centro C.P. 64000, Monterrey, Nuevo León. Conmutador: 333 4477 077. Email: projectmanager@soloofertas.com
3. **Link "Regresar a página anterior"** — `javascript:history.go(-1)`
4. **Botón scroll-top** — flecha hacia arriba, fixed bottom-right
5. **Copyright** — "2026 Soloofertas.com"

### Comportamiento
- Fondo oscuro, texto claro
- Responsive: columnas de direcciones se apilan en mobile
- Links de secciones también se ajustan con `data-region`

---

## Especificación: CSS Base (`base.css`)

```css
:root {
  --color-bg: #000000;
  --color-bg-light: #111111;
  --color-text: #ffffff;
  --color-text-muted: #aaaaaa;
  --color-accent: #1a73e8;      /* botón Solo Ofertas */
  --color-border: #333333;
  --font-main: 'Arial', sans-serif;
  --max-width: 1200px;
}
```

- Reset CSS (margin 0, padding 0, box-sizing border-box)
- Tipografía base: Arial/sans-serif, 16px
- Colores: fondo negro/muy oscuro, texto blanco
- Breakpoints responsive:
  - Mobile: < 768px
  - Desktop: >= 768px

---

## Especificación: components.js

Función que inyecta header y footer en cada página via fetch o template literals. Alternativa más simple: usar `fetch` para cargar `shared/header.html` y `shared/footer.html` e insertarlos en placeholders `<div id="header-placeholder">` y `<div id="footer-placeholder">`.

Leer `data-region` del `<body>` para reemplazar links regionalmente:
```html
<body data-region="gdl">
```

---

## Entregables de esta fase

1. `shared/css/base.css` — estilos globales con variables
2. `shared/css/header.css` — estilos del header
3. `shared/css/footer.css` — estilos del footer
4. `shared/header.html` — markup del header
5. `shared/footer.html` — markup del footer
6. `shared/js/components.js` — inyección dinámica + regionalización
7. `index.html` — página de prueba que usa header y footer correctamente

## Criterio de éxito

- Header y footer renderizan igual al sitio de referencia en desktop y mobile
- Links del menú apuntan a las URLs correctas
- `data-region="mty"` cambia correctamente los links a rutas de MTY
- Sin dependencias externas (no Bootstrap, no jQuery, no CDN)
