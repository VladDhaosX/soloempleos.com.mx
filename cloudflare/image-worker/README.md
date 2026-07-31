# Solo Empleos image worker

Este Worker entrega variantes fijas de originales almacenados en Cloudflare R2 sin usar Sharp en Hostinger.

Rutas publicas:

```text
/thumb/gdl/vacantes/<archivo>
/full/gdl/vacantes/<archivo>
/admin/gdl/vacantes/<archivo>
/cover/gdl/portadas/<archivo>
```

El Worker rechaza regiones, tipos, nombres y presets no reconocidos. Los parametros de redimensionamiento no vienen de la URL: estan definidos en `src/index.mjs`.

## Configuracion pendiente

1. Activar R2 y crear `soloempleos-media-prod`.
2. Habilitar temporalmente la URL publica `r2.dev` del bucket para utilizarla como origen.
3. Sustituir `R2_PUBLIC_BASE_URL` en `wrangler.jsonc`.
4. Desplegar con Wrangler o desde el panel de Workers.
5. Configurar `MEDIA_DELIVERY_BASE_URL` en Hostinger con la URL final `workers.dev`.

La URL `r2.dev` se usa solo como origen. El sitio publico debe mostrar las URLs del Worker.
