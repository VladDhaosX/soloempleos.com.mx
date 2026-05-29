# Fase 6 SEO - Contenido local no marcario

Fecha de elaboracion: 2026-05-29  
Dominio: `https://soloempleos.com.mx/`  
Estado: Cambios aplicados en local para deploy

## Objetivo

Fortalecer las paginas informativas para consultas no marcarias como:

- `empleos guadalajara`
- `vacantes guadalajara`
- `empleos monterrey`
- `vacantes monterrey`

La base tecnica ya estaba estable: paginas publicas con SEO 100 en Lighthouse, sitemap correcto, redirecciones legacy y datos estructurados publicados. Esta fase se enfoca en contenido local util para candidatos y empresas.

## Cambios aplicados

### Guias locales

Se mejoraron las paginas:

- `/gdl/guia-empleo/`
- `/mty/guia-empleo/`

Cambios principales:

- Titulos SEO orientados a busqueda local.
- Meta descriptions mas enfocadas en empleos, vacantes y postulacion.
- H1 con intencion no marcaria: empleos + ciudad + vacantes locales.
- Contenido ampliado para candidatos.
- Secciones por zonas de busqueda en cada ciudad.
- Listas de tipos de vacantes frecuentes.
- Bloque para empresas que quieren publicar vacantes.
- Preguntas frecuentes visibles en pagina.
- Enlaces internos hacia vacantes y contacto.

### Datos estructurados

Se actualizo el contenido de `FAQPage` para que coincida con las FAQs visibles y refuerce preguntas de busqueda:

- Como encontrar empleos en la ciudad.
- Que datos revisar antes de postularse.
- Como publicar vacantes como empresa.
- Aclaracion de que Solo Empleos publica oportunidades, pero no contrata directamente.

### Estilos

Se agregaron estilos para:

- Tarjetas de zonas locales.
- Etiquetas de tipos de vacantes.
- Layout responsive en movil.

## Pendiente posterior al deploy

1. Confirmar que ambas guias respondan 200 en produccion.
2. Confirmar que cada guia tenga `WebPage` y `FAQPage` JSON-LD validos.
3. Revisar Lighthouse en `/gdl/guia-empleo/` y `/mty/guia-empleo/`.
4. En Search Console, inspeccionar ambas guias y solicitar indexacion.
5. Monitorear consultas no marcarias durante las siguientes semanas.

## Siguiente oportunidad

Si Search Console confirma impresiones para consultas locales, la siguiente mejora seria crear o ampliar bloques especificos por tipo de vacante, por ejemplo:

- Empleos de ventas en Guadalajara.
- Vacantes de almacen en Guadalajara.
- Empleos de atencion a clientes en Monterrey.
- Vacantes operativas en Monterrey.
