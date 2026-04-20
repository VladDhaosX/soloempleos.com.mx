# Solo Empleos — Proyecto de Migración/Replica

## Contexto

Sitio actual (`beta.soloempleos.com.mx`) es un periodico digital con dos ediciones regionales (Guadalajara y Monterrey), construido sobre dos instalaciones WordPress independientes con bases de datos MySQL separadas.

El objetivo es reemplazarlo con una replica visual del frontend, simplificando el backend, eliminando WordPress, PHP y MySQL.

---

## Sitio Actual

### Arquitectura
- **Portal:** `index.php` — conecta ambas DBs, muestra portada GDL y MTY
- **GDL:** `/gdl/` — WordPress (DB: `soloempleoscom_ads`, prefix: `derGtr_`)
- **MTY:** `/mty/` — WordPress (DB: `soloempleoscom_mty`, prefix: `deFr_`)

### Stack actual
- WordPress 6.9.4 + PHP 8.1
- MySQL (2 bases separadas)
- Apache/cPanel
- Elementor (page builder)
- Bootstrap 5.3 + jQuery

### Funcionalidad principal
1. **Edicion digital** — visor de hasta 17 paginas (imagenes JPG), con zoom, cache busting via version number
2. **Noticias** — posts por categoria (Principales, Seguridad, El Pais, Deportes, Entretenimiento)
3. **Ofertas de trabajo** — CPT `ofertas`, cada oferta es un JPG subido desde WP Admin
4. **Ediciones anteriores** — 4 slots con imagen + PDF + titulo
5. **Admin panel custom** — subida de edicion digital desde WP Admin (`Edicion digital`, `Mas ediciones`)

### Uso de base de datos
- `wp_posts` — noticias, ofertas, paginas
- `wp_postmeta` — metadata (campos custom, contador de vistas)
- `wp_options` — configuracion de edicion digital:
  - `edicion_impresa_1..17` — URL de cada pagina
  - `edicion_impresa_version` — cache buster
  - `impresopagesv5` — numero de paginas
  - `moreeditionstitle/feat/file 1..4` — ediciones anteriores

---

## Proyecto Nuevo

### Objetivo
- Frontend: visualmente identico al actual
- Backend: mas simple, moderno, sin WordPress, sin PHP, sin MySQL
- Hosting: **Hostinger Business** (~$4/mes) — todo autocontenido, sin servicios externos
- Sin dividir responsabilidades entre servicios

### Stack nuevo
| Capa | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JS vanilla |
| Backend/API | Node.js (soportado en Hostinger Business) |
| Storage | Archivos JSON + imagenes en filesystem |
| Admin | Pagina `/admin` custom (form → Node.js escribe JSON) |
| Hosting | Hostinger Business |

### Por que este stack
- Hostinger Business soporta Node.js (hasta 5 apps), incluido desde diciembre 2024
- Sin DB = sin mantenimiento, sin backups de DB, sin credenciales
- JSON en filesystem = simple, portable, legible
- Admin custom = exactamente lo que necesitan, sin bloat

---

## Flujo nuevo

### Subida de noticias
```
Admin abre /admin →
llena form (titulo + imagen + categoria + fecha) →
Node.js guarda imagen en /uploads/ →
Node.js actualiza noticias.json →
Frontend fetch() lee JSON → renderiza
```

### Subida de edicion digital
```
Admin abre /admin →
sube imagenes de paginas (1..17) →
Node.js guarda imagenes en /uploads/edicion/ →
Node.js actualiza edicion.json (URLs + version) →
Frontend lee edicion.json → renderiza visor
```

### Subida de ofertas
```
Admin abre /admin →
sube JPG de oferta →
Node.js guarda imagen →
Node.js actualiza ofertas.json →
Frontend renderiza listado
```

---

## Estructura de archivos propuesta

```
/
├── index.html              ← Portal landing (GDL + MTY)
├── /gdl/
│   ├── index.html          ← Homepage GDL
│   ├── noticias.json       ← Datos de noticias
│   ├── edicion.json        ← URLs de paginas de edicion actual
│   ├── ofertas.json        ← Listado de ofertas
│   ├── ediciones.json      ← Ediciones anteriores (4 slots)
│   └── /uploads/           ← Imagenes subidas
├── /mty/                   ← Misma estructura para Monterrey
├── /admin/                 ← Panel de administracion
│   └── index.html          ← UI del admin
└── /soloempleos/           ← Node.js endpoints
    ├── noticias.js
    ├── edicion.js
    └── ofertas.js
```

---

## Decisiones tomadas

| Decision | Razon |
|---|---|
| Sin WordPress | Eliminar bloat, PHP, MySQL |
| Sin base de datos | Simplicidad, sin mantenimiento |
| JSON en filesystem | Simple, portable, sin dependencias |
| Node.js para writes | Unico que puede escribir archivos server-side sin PHP |
| Todo en Hostinger | Sin dividir responsabilidades a servicios externos |
| Frontend vanilla | Sin framework = sin build process, mas simple de hospedar |
| Replica visual | Precio ya acordado, sin mejoras de UI |

---

## Pendientes / Por definir

- [ ] Estructura exacta del JSON de noticias, ofertas y edicion
- [ ] Autenticacion del panel `/admin` (usuario/password minimo)
- [ ] Manejo de dos sitios GDL/MTY — mismo admin o separados?
- [ ] Proceso de deploy inicial (subir archivos existentes)
- [ ] Que pasa con noticias/ofertas existentes — se migran o arrancan de cero?
