# Reporte de Cambios SEO - Fase 2

Proyecto: Solo Empleos  
Dominio revisado: `https://soloempleos.click/`  
Fecha de elaboracion: 2026-05-20  
Estado: Cambios aplicados en local, pendientes de despliegue a produccion

## Resumen ejecutivo

Durante la Fase 2 se corrigieron los principales pendientes de SEO tecnico basico detectados en la auditoria inicial. Los cambios se enfocaron en metadatos, encabezados, rastreo, sitemap, favicon, indexabilidad del panel administrativo y textos alternativos menos genericos para imagenes de vacantes.

La medicion confirma que el sitio publicado todavia refleja el estado anterior: no tiene meta descriptions, canonicals ni `h1` en las paginas principales, y `robots.txt`, `sitemap.xml` y `favicon.ico` devuelven 404. En local, despues de los cambios, esas mismas comprobaciones ya pasan correctamente.

## Alcance

Paginas publicas principales revisadas:

- `/`
- `/gdl/inicio/`
- `/mty/inicio/`
- `/gdl/contacto/`
- `/mty/contacto/`

Rutas tecnicas revisadas:

- `/robots.txt`
- `/sitemap.xml`
- `/favicon.ico`
- `/admin/`

## Comparacion antes vs despues

| Senal SEO | Publicado actual antes del despliegue | Local despues de cambios |
| --- | ---: | ---: |
| Home con meta description | No | Si |
| Home con canonical | No | Si |
| Home con `h1` | 0 | 1 |
| `/gdl/inicio/` con description/canonical/`h1` | No / No / 0 | Si / Si / 1 |
| `/mty/inicio/` con description/canonical/`h1` | No / No / 0 | Si / Si / 1 |
| `/gdl/contacto/` con description/canonical/`h1` | No / No / 0 | Si / Si / 1 |
| `/mty/contacto/` con description/canonical/`h1` | No / No / 0 | Si / Si / 1 |
| `/robots.txt` | 404 | 200 |
| `/sitemap.xml` | 404 | 200 |
| `/favicon.ico` | 404 | 200 |
| `/admin/` marcado como no indexable | No | Si |

## Cambios realizados

### Metadatos y encabezados

Se agregaron titulos SEO, meta descriptions y canonicals absolutos en las paginas publicas principales. Tambien se ajustaron los encabezados principales para que cada pagina tenga un `h1` unico.

Archivos modificados:

- `pages/index.html`
- `pages/gdl/inicio/index.html`
- `pages/mty/inicio/index.html`
- `pages/gdl/contacto/index.html`
- `pages/mty/contacto/index.html`

### Rastreo e indexabilidad

Se agrego `robots.txt` para permitir el rastreo de las paginas publicas, bloquear `/admin/` y declarar el sitemap.

Archivo agregado:

- `pages/robots.txt`

Contenido funcional esperado:

- `Allow: /`
- `Disallow: /admin/`
- `Sitemap: https://soloempleos.click/sitemap.xml`

### Sitemap

Se agrego `sitemap.xml` con las URLs publicas principales para facilitar la declaracion de paginas importantes ante buscadores.

Archivo agregado:

- `pages/sitemap.xml`

URLs incluidas:

- `https://soloempleos.click/`
- `https://soloempleos.click/gdl/inicio/`
- `https://soloempleos.click/mty/inicio/`
- `https://soloempleos.click/gdl/contacto/`
- `https://soloempleos.click/mty/contacto/`

### Favicon

Se agrego `favicon.ico` para corregir el 404 reportado por Lighthouse y completar la senal tecnica del sitio.

Archivo agregado:

- `pages/favicon.ico`

### Panel administrativo

Se marco `/admin/` como no indexable mediante:

- Meta robots: `noindex, nofollow`
- Cabecera HTTP: `X-Robots-Tag: noindex, nofollow`

Archivos modificados:

- `admin/index.html`
- `server.js`

### Accesibilidad y semantica

Se agrego la clase `.sr-only` para que el `h1` semantico de la landing exista sin afectar el diseno visual.

Archivo modificado:

- `pages/shared/css/base.css`

### Alt text de vacantes

Se ajusto el HTML generado por servidor para que las imagenes de vacantes no usen solamente `alt="Vacante"`. Ahora incluyen ciudad y fecha cuando esta disponible.

Ejemplo:

`Vacante en Guadalajara publicada el 2026-04-24`

Archivo modificado:

- `server.js`

## Verificacion tecnica local

Servidor local usado:

`http://localhost:3000/`

Resultados:

| Ruta | Resultado local |
| --- | --- |
| `/` | 200, description presente, canonical presente, `h1 = 1` |
| `/gdl/inicio/` | 200, description presente, canonical presente, `h1 = 1` |
| `/mty/inicio/` | 200, description presente, canonical presente, `h1 = 1` |
| `/gdl/contacto/` | 200, description presente, canonical presente, `h1 = 1` |
| `/mty/contacto/` | 200, description presente, canonical presente, `h1 = 1` |
| `/robots.txt` | 200 |
| `/sitemap.xml` | 200 |
| `/favicon.ico` | 200 |
| `/admin/` | 200, meta robots y cabecera `X-Robots-Tag` presentes |

## Estado publicado antes del despliegue

Medicion realizada contra:

`https://soloempleos.click/`

Resultados actuales en produccion:

| Ruta | Estado publicado actual |
| --- | --- |
| `/` | 200, sin description, sin canonical, `h1 = 0` |
| `/gdl/inicio/` | 200, sin description, sin canonical, `h1 = 0` |
| `/mty/inicio/` | 200, sin description, sin canonical, `h1 = 0` |
| `/gdl/contacto/` | 200, sin description, sin canonical, `h1 = 0` |
| `/mty/contacto/` | 200, sin description, sin canonical, `h1 = 0` |
| `/robots.txt` | 404 |
| `/sitemap.xml` | 404 |
| `/favicon.ico` | 404 |
| `/admin/` | 200, sin meta robots |

## Linea base Lighthouse de Fase 1

La auditoria inicial guardada el 2026-05-18 dejo estos valores de referencia:

| Pagina | Performance | SEO | Accesibilidad | Buenas practicas | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | 91 | 91 | 96 | 96 | 3.1 s | 0.099 | 0 ms |
| `/gdl/inicio/` | 61 | 91 | 93 | 96 | 10.8 s | 0.053 | 500 ms |

Nota: los cambios de Fase 2 son principalmente SEO tecnico. La mejora mas fuerte esperada esta en el score SEO y en la eliminacion de hallazgos como meta description faltante, archivos 404 y estructura semantica incompleta. La optimizacion profunda de rendimiento queda para Fase 3.

## Proxima medicion despues del despliegue

Una vez publicados los cambios en `https://soloempleos.click/`, se debe repetir la misma comprobacion contra produccion:

1. Confirmar que las 5 paginas publicas tengan meta description, canonical y un `h1` unico.
2. Confirmar que `/robots.txt`, `/sitemap.xml` y `/favicon.ico` respondan 200.
3. Confirmar que `/admin/` tenga `noindex, nofollow`.
4. Ejecutar Lighthouse en home y `/gdl/inicio/`.
5. Comparar contra la linea base de Fase 1.

## Conclusion

La Fase 2 queda implementada en el proyecto local y lista para despliegue. La medicion antes vs despues muestra que los cambios corrigen los principales problemas de SEO tecnico basico detectados en Fase 1. El paso pendiente es publicar los archivos y repetir la medicion en produccion para documentar el impacto real en el dominio.
