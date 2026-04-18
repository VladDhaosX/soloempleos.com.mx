# Solo Empleos — Funcionalidad Real (verificada con DB + navegación en vivo)

> Verificado con: DB `soloempleoscom_ads` + Playwright navegando soloempleos.com.mx en vivo.
> Sitio real: **soloempleos.com.mx** — Portal de empleo GDL y MTY.

---

## PARTE 1: USUARIO FINAL — LO QUE REALMENTE VE

---

### Portal Landing (`soloempleos.com.mx/`)

- Logo SOLO EMPLEOS centrado
- Dos columnas: **GUADALAJARA** | **MONTERREY**
- Cada columna muestra portada actual (imagen JPG de edición del día)
  - GDL: Edición 1698, 18 de Abril de 2026 — portada con vacante Zoltek
  - MTY: portada con vacante Acerorey
- Click en cualquier columna → redirige al sitio regional
- Sin navegación adicional — solo esas dos opciones

---

### Sitio GDL (`soloempleos.com.mx/gdl/`)

Redirige automáticamente a `/gdl/inicio/`

#### Header (todas las páginas)
- Logo "SOLO EMPLEOS" (link a `/gdl/`)
- Botones regionales: **Guadalajara** | **Ir a Monterrey** (→ empleosmty.com)
- Menú de navegación: **INICIO** | **CONTACTO** | **SOLO OFERTAS** (botón destacado)

#### Footer (todas las páginas)
- Secciones: inicio | Contacto | Solo Ofertas
- Dirección GDL: Av. López Mateos Sur #5142, Col. La Calma, CP 45070, Zapopan, Jalisco
- Dirección MTY: Diego de Montemayor #104, Col. Centro C.P. 64000, Monterrey, NL
- Conmutador: 333 4477 077
- Email: projectmanager@soloofertas.com
- Link "Regresar a página anterior"
- Botón scroll top
- Copyright 2026 Soloofertas.com

---

### Página: Inicio (`/gdl/inicio/`)

- Hero banner: imagen de fondo + texto "Los Mejores Empleos"
- Título: **Vacantes**
- Iconos de filtro (4 íconos: ubicación, trabajo, persona, info — sin funcionalidad visible)
- Grid de vacantes — **imágenes JPG de anuncios de empleo**
  - Actualmente: 4 imágenes visibles (Zoltek, AGA, Personal en Sistemas, Cuprex)
  - Resto del grid: espacios vacíos (imágenes no cargadas / slots vacíos)
- Sin paginación visible
- Sin búsqueda visible
- Sin links a artículos editoriales

---

### Página: Contacto (`/gdl/contacto/`)

- Título: **PUBLICIDAD — contáctanos**
- Formulario:
  - Tu nombre
  - Tu correo electrónico
  - Asunto
  - Tu mensaje (opcional)
  - Botón **ENVIAR**
- Propósito: contacto para anunciantes (publicidad), no para buscadores de empleo

---

### Página: Más Ediciones (`/gdl/mas-ediciones/`)

- 4 ediciones anteriores del periódico impreso
- Cada una muestra:
  - Título: "Edición 1664", "Edición 1663", "Edición 1662", "Edición 1661"
  - Logo Solo Empleos + número de edición + fecha + tiraje + teléfono
  - Imagen de portada (JPG) — anuncio de empleo destacado
- Sin botón de descarga PDF visible actualmente
- Sin paginación (solo 4 ediciones fijas)

---

### Página: Solo Ofertas (botón menú)

- Link externo — no forma parte del sitio GDL
- Redirige a sitio externo de ofertas

---

### Lo que NO está accesible para el usuario

- Los 75 artículos editoriales publicados en DB — **no tienen entrada visible**
- Las categorías (Vida Diaria, Movilidad, etc.) — páginas existen pero no hay links en menú
- Buscador — no existe
- Listado completo de vacantes/posts — no hay sección de archivo

---

## PARTE 2: ADMINISTRADOR

---

### WP Admin — Flujo real de subida de contenido

**Vacantes (posts):**
- WP Admin → Entradas → Nueva entrada
- Título = nombre de empresa/vacante
- Contenido = imagen JPG del anuncio
- Sin campos custom adicionales
- Categoría libre (la mayoría van a "Sin categoría")

**Portada del día (edición digital):**
- WP Admin → Edición Digital
- Sube 1 imagen JPG (portada)
- Aparece en portal landing (`soloempleos.com.mx/`)

**Ediciones anteriores:**
- WP Admin → Más ediciones
- 4 slots fijos: título + imagen JPG
- Aparecen en `/gdl/mas-ediciones/`

**Contacto:**
- Formulario manejado por WP Forms o Contact Form 7
- Envía email a projectmanager@soloofertas.com

---

## PARTE 3: RESUMEN REAL PARA MIGRACIÓN

### Lo que realmente existe y se usa

| Feature | Estado real |
|---|---|
| Portal landing GDL/MTY con portadas | ✅ Activo, se actualiza diario |
| Grid de vacantes (imágenes JPG) en inicio | ✅ Activo, se sube manualmente |
| Ediciones anteriores (4 slots imagen) | ✅ Activo |
| Formulario de contacto | ✅ Activo |
| Menú: Inicio, Contacto, Solo Ofertas | ✅ Activo |
| Artículos editoriales (75 posts) | ⚠️ Existen en DB, no visibles en frontend |
| Categorías de contenido | ⚠️ Existen, sin acceso desde menú |
| Más ediciones con PDF | ❌ No configurado actualmente |
| Búsqueda | ❌ No existe |

---

### Must-have para migración

- [ ] Portal landing (`/`) — logo + portada GDL y MTY lado a lado
- [ ] Página inicio — hero + grid de vacantes (imágenes JPG)
- [ ] Página más ediciones — 4 slots con título + imagen
- [ ] Página contacto — formulario (nombre, email, asunto, mensaje)
- [ ] Header: logo, botones GDL/MTY, menú (Inicio, Contacto, Solo Ofertas)
- [ ] Footer: secciones, direcciones, teléfono, email, copyright
- [ ] Admin: subir imagen de portada del día
- [ ] Admin: subir vacantes (imágenes JPG al grid)
- [ ] Admin: gestionar 4 slots de ediciones anteriores

### Nice-to-have

- [ ] Artículos editoriales visibles y navegables
- [ ] Secciones por categoría con links en menú
- [ ] PDF descargable en ediciones anteriores

### No replicar

- Shortcodes legacy del tema noticel
- Visor multi-página (17 páginas) — no en uso
- Slots de anuncios del tema
- CPT Ofertas — no se usa, vacantes van como posts normales
