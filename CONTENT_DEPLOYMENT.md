# Contenido fuera del repositorio

El portal ya separa el codigo del contenido editable del admin:

- Codigo versionado: `server.js`, `routes/`, `pages/`, `admin/`.
- Contenido editable no versionado: `storage/<region>/data` y `storage/<region>/uploads`.
- Ruta configurable en produccion: `CONTENT_DIR`.

Para publicar por Git sin tocar imagenes ni JSON publicados:

1. En el servidor, configura `CONTENT_DIR` hacia una carpeta persistente fuera del checkout, por ejemplo `/var/www/soloempleos-content`.
2. No borres esa carpeta durante deploys.
3. Sube cambios de codigo por Git normalmente.
4. Usa el panel admin para descargar un backup antes de deploys importantes.
5. Si el servidor es nuevo, restaura el ZIP desde el panel admin o copia la estructura `gdl/data`, `gdl/uploads`, `mty/data`, `mty/uploads` dentro de `CONTENT_DIR`.

El repositorio ignora `storage/`, `pages/*/data/*.json` y `pages/*/uploads/`, asi que las imagenes y JSON locales o publicados no deben entrar al commit.
