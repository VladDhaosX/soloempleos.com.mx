# Fase 5 SEO - Search Console, medicion y SEO local

Fecha de elaboracion: 2026-05-25  
Dominio: `https://soloempleos.com.mx/`  
Estado: Search Console activo, sitemap enviado y datos estructurados agregados en local

## Resumen ejecutivo

La propiedad `soloempleos.com.mx` ya esta activa en Google Search Console y Google ya esta registrando rendimiento organico. El sitemap correcto fue enviado el 22 mayo 2026 y tuvo ultima lectura el 25 mayo 2026 con estado `Correcto`.

Search Console muestra traccion inicial relevante: 1.01 mil clics, 4.04 mil impresiones, CTR medio de 25.1% y posicion media 6. La mayoria del trafico actual viene por busquedas de marca como `solo empleos`, `solo empleos guadalajara` y `solo empleos monterrey`.

## Evidencia de Search Console

### Sitemap

| Campo | Resultado |
| --- | --- |
| Sitemap enviado | `https://soloempleos.com.mx/sitemap.xml` |
| Fecha de envio | 22 mayo 2026 |
| Ultima lectura | 25 mayo 2026 |
| Estado | Correcto |
| Paginas descubiertas | 5 |
| Videos descubiertos | 0 |

### Rendimiento

| Metrica | Resultado |
| --- | ---: |
| Clics totales | 1.01 mil |
| Impresiones totales | 4.04 mil |
| CTR medio | 25.1% |
| Posicion media | 6 |

### Consultas principales

| Consulta | Clics | Impresiones |
| --- | ---: | ---: |
| `solo empleos` | 371 | 472 |
| `solo empleos guadalajara` | 164 | 212 |
| `solo empleos monterrey` | 144 | 210 |
| `solo empleos gdl` | 35 | 43 |
| `periodico solo empleos` | 28 | 38 |
| `empleos guadalajara` | 10 | 669 |

### Paginas principales por clics

| Pagina | Clics |
| --- | ---: |
| `https://soloempleos.com.mx/gdl/inicio/` | 587 |
| `https://soloempleos.com.mx/mty/inicio/` | 326 |
| `https://soloempleos.com.mx/` | 99 |
| `https://www.soloempleos.com.mx/` | 49 |

## Experiencia

Search Console reporta buen estado en experiencia:

| Revision | Resultado |
| --- | --- |
| Core Web Vitals moviles | 4 buenas, 0 necesitan mejorar, 0 deficientes |
| Core Web Vitals ordenador | 4 buenas, 0 necesitan mejorar, 0 deficientes |
| HTTPS | 4 URLs validas, 0 no HTTPS |

## Cambios aplicados en el proyecto

### Datos estructurados

Se agrego schema JSON-LD en las paginas publicas principales:

- Home: `Organization`
- Guadalajara: `EmploymentAgency`
- Monterrey: `EmploymentAgency`
- Contacto Guadalajara: `ContactPage`
- Contacto Monterrey: `ContactPage`

Archivos modificados:

- `pages/index.html`
- `pages/gdl/inicio/index.html`
- `pages/mty/inicio/index.html`
- `pages/gdl/contacto/index.html`
- `pages/mty/contacto/index.html`

### Consolidacion de dominio canonico

Search Console muestra trafico tanto para `soloempleos.com.mx` como para `www.soloempleos.com.mx`. Para consolidar senales, se agrego redireccion 301 desde `www.soloempleos.com.mx` hacia `soloempleos.com.mx`.

Archivo modificado:

- `server.js`

## Pendientes manuales

1. En Search Console, revisar `Indexacion > Paginas` y confirmar cuantas URLs estan indexadas.
2. Inspeccionar manualmente las cinco URLs principales:
   - `https://soloempleos.com.mx/`
   - `https://soloempleos.com.mx/gdl/inicio/`
   - `https://soloempleos.com.mx/mty/inicio/`
   - `https://soloempleos.com.mx/gdl/contacto/`
   - `https://soloempleos.com.mx/mty/contacto/`
3. Despues de publicar los cambios, confirmar que `https://www.soloempleos.com.mx/` redirige 301 hacia `https://soloempleos.com.mx/`.
4. Validar los datos estructurados con Rich Results Test o Schema Markup Validator.
5. Revisar o crear Google Business Profile para Guadalajara y Monterrey, si el cliente cuenta con ubicacion fisica o zona de servicio definida.

## Recomendacion estrategica

El sitio ya aparece y recibe trafico por marca. La oportunidad siguiente esta en mejorar consultas no marcarias con alta impresion y bajo clic, especialmente `empleos guadalajara`. Para esto conviene trabajar contenido local mas especifico, textos de apoyo en paginas de ciudad, preguntas frecuentes y posiblemente nuevas paginas o bloques orientados a intenciones como vacantes por ciudad, publicacion de vacantes y contacto para empresas.
