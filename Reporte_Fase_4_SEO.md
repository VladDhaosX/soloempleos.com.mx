# Fase 4 SEO - Medicion e indexacion

## Estado inicial

- El sitemap publicado responde en `https://soloempleos.com.mx/sitemap.xml`.
- `robots.txt` permite el sitio y bloquea `/admin/`.
- Las paginas principales tienen canonical hacia `soloempleos.com.mx`.
- Google ya muestra resultados para Solo Empleos, pero tambien conserva URLs antiguas de la version previa.

## Hallazgos

- Google todavia muestra URLs antiguas como `/gdl/home-2/`, `/gdl/empleospost/...`, `/gdl/mas-ediciones/` y PDFs antiguos de `/mty/wp-content/...`.
- Algunas URLs antiguas respondian 404, lo que puede desperdiciar señales SEO y generar mala experiencia.

## Cambios aplicados

- Se agregaron redirecciones 301 desde URLs antiguas hacia las paginas actuales:
  - URLs antiguas de Guadalajara -> `/gdl/inicio/`
  - URLs antiguas de Monterrey -> `/mty/inicio/`
  - PDFs/rutas antiguas de `wp-content` -> pagina de inicio de la ciudad correspondiente

## Pendientes en Search Console

1. Verificar propiedad `https://soloempleos.com.mx/`.
2. Enviar `https://soloempleos.com.mx/sitemap.xml`.
3. Solicitar indexacion de:
   - `https://soloempleos.com.mx/`
   - `https://soloempleos.com.mx/gdl/inicio/`
   - `https://soloempleos.com.mx/mty/inicio/`
   - `https://soloempleos.com.mx/gdl/contacto/`
   - `https://soloempleos.com.mx/mty/contacto/`
4. Revisar en "Paginas" si Google reporta errores 404 antiguos.
5. Revisar en "Rendimiento" consultas como:
   - solo empleos
   - empleos guadalajara
   - vacantes guadalajara
   - empleos monterrey
   - vacantes monterrey

## Como explicar al cliente

Google ya esta encontrando el sitio, pero aun conserva paginas viejas de la version anterior. Se agregaron redirecciones para que esas visitas y señales SEO se envien a las paginas actuales. El siguiente paso es medir desde Search Console que Google vuelva a rastrear el sitio, lea el sitemap correcto y empiece a reemplazar las URLs antiguas por las nuevas.
