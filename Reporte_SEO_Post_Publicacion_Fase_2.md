# Reporte SEO Post Publicacion - Fase 2

Fecha de medicion: 2026-05-20  
Dominio: `https://soloempleos.click/`  
Estado: Cambios publicados y backup de imagenes restaurado

## Resumen

La Fase 2 ya esta reflejada en produccion. Las cinco paginas publicas principales responden 200 y cuentan con meta description, canonical y un `h1` unico. Tambien se corrigieron los 404 de `robots.txt`, `sitemap.xml` y `favicon.ico`.

El score SEO de Lighthouse subio a 100 en las dos paginas medidas: home y Guadalajara. La oportunidad principal que queda corresponde a Fase 3: optimizacion de rendimiento e imagenes, especialmente en `/gdl/inicio/`.

## Comprobacion tecnica

| Ruta | Estado | Description | Canonical | H1 | Notas |
| --- | ---: | ---: | ---: | ---: | --- |
| `/` | 200 | Si | Si | 1 | Correcto |
| `/gdl/inicio/` | 200 | Si | Si | 1 | Correcto |
| `/mty/inicio/` | 200 | Si | Si | 1 | Correcto |
| `/gdl/contacto/` | 200 | Si | Si | 1 | Correcto |
| `/mty/contacto/` | 200 | Si | Si | 1 | Correcto |
| `/robots.txt` | 200 | N/A | N/A | N/A | Correcto |
| `/sitemap.xml` | 200 | N/A | N/A | N/A | Correcto |
| `/favicon.ico` | 200 | N/A | N/A | N/A | Correcto |
| `/admin/` | 200 | N/A | N/A | 0 | `noindex, nofollow` presente |

## Metadatos publicados

| Pagina | Title | H1 |
| --- | --- | --- |
| `/` | Empleos en Guadalajara y Monterrey \| Solo Empleos | Empleos en Guadalajara y Monterrey |
| `/gdl/inicio/` | Empleos y vacantes en Guadalajara \| Solo Empleos | Empleos en Guadalajara |
| `/mty/inicio/` | Empleos y vacantes en Monterrey \| Solo Empleos | Empleos en Monterrey |
| `/gdl/contacto/` | Contacto Guadalajara \| Solo Empleos | Contactanos en Guadalajara |
| `/mty/contacto/` | Contacto Monterrey \| Solo Empleos | Contactanos en Monterrey |

## Sitemap y robots

`robots.txt` responde 200 e incluye:

- `Disallow: /admin/`
- `Allow: /`
- `Sitemap: https://soloempleos.click/sitemap.xml`

`sitemap.xml` responde 200 e incluye:

- `https://soloempleos.click/`
- `https://soloempleos.click/gdl/inicio/`
- `https://soloempleos.click/mty/inicio/`
- `https://soloempleos.click/gdl/contacto/`
- `https://soloempleos.click/mty/contacto/`

## Comparacion Lighthouse

| Pagina | Momento | Performance | SEO | Accesibilidad | Buenas practicas | LCP | CLS | TBT |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| `/` | Antes | 91 | 91 | 96 | 96 | 3.1 s | 0.099 | 0 ms |
| `/` | Despues | 78 | 100 | 96 | 100 | 4.5 s | 0 | 0 ms |
| `/gdl/inicio/` | Antes | 61 | 91 | 93 | 96 | 10.8 s | 0.053 | 500 ms |
| `/gdl/inicio/` | Despues | 65 | 100 | 93 | 100 | 11.3 s | 0.053 | 340 ms |

## Hallazgos actuales

### Mejoras confirmadas

- SEO Lighthouse subio de 91 a 100 en home.
- SEO Lighthouse subio de 91 a 100 en `/gdl/inicio/`.
- Meta descriptions ya pasan en Lighthouse.
- Canonicals ya pasan en Lighthouse.
- `robots.txt`, `sitemap.xml` y `favicon.ico` ya responden 200.
- `/admin/` ya esta marcado como `noindex, nofollow`.
- Recurso `shared/img/whatsapp.svg` ya responde 200.

### Pendientes

- Home: Lighthouse marca ausencia de landmark `main`. Recomendacion: envolver contenido principal en `<main>`.
- `/gdl/inicio/`: Lighthouse mantiene advertencia de orden de encabezados por `h4` en footer. Recomendacion: ajustar jerarquia del footer o usar estilos sin depender de `h4`.
- `/gdl/inicio/`: Lighthouse detecta `aria-label` en elementos donde no aplica. Recomendacion: cambiar esos `span` decorativos por botones/enlaces reales o usar texto oculto adecuado.
- Rendimiento: `/gdl/inicio/` sigue pesando aprox. 19.5 MiB por imagenes de vacantes y video hero. Recomendacion: Fase 3 debe comprimir/conversionar imagenes y revisar lazy loading/formatos.

## Indexacion

La busqueda `site:soloempleos.click` aun no arroja resultados visibles. Recomendacion: configurar Google Search Console, enviar `sitemap.xml` y solicitar inspeccion/indexacion de las URLs principales.

## Conclusion

La Fase 2 quedo publicada correctamente y cumplio su objetivo tecnico SEO. El sitio ya tiene metadatos, canonicals, `h1`, robots, sitemap, favicon y control de indexacion del admin. La siguiente prioridad es Fase 3: rendimiento movil, peso de imagenes y pequenos ajustes de accesibilidad/semantica.
