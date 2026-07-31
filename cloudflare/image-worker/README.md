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

## Configuracion activa

- Bucket: `soloempleos-media-prod`
- Origen R2: `https://pub-7b11ebde930b4011bc3fad46b1a49f92.r2.dev`
- Entrega publica: `https://soloempleos-images.deanva08.workers.dev`

En Hostinger, `MEDIA_DELIVERY_BASE_URL` debe apuntar a la URL de entrega publica. Las credenciales S3 de R2 se configuran solamente como variables de entorno del servidor y nunca se guardan en Git.

La URL `r2.dev` se usa solo como origen. El sitio publico debe mostrar las URLs del Worker.
