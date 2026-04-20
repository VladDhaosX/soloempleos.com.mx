# FASE 4 — Página Contacto (`/gdl/contacto/`)

**Estimado:** 2-3 hrs
**Depende de:** FASE 1 (header, footer, CSS base), FASE 5 (endpoint POST /soloempleos/contacto)
**Bloquea:** nada

---

## Contexto del proyecto

**Solo Empleos** es un portal de empleo para Guadalajara y Monterrey, México. La página de contacto es para que **anunciantes** (empresas que quieren poner vacantes) contacten al equipo de ventas de publicidad. No es para buscadores de empleo.

**Stack:** HTML + CSS + JS vanilla. Node.js en backend para envío de email.

**Referencia visual:** https://soloempleos.com.mx/gdl/contacto/

Esta página existe para GDL (`/gdl/contacto/`) y MTY (`/mty/contacto/`). Mismo formulario, mismo destino de email.

---

## Qué ve el usuario

Formulario de contacto oscuro con título "PUBLICIDAD — contáctanos" y campos de texto. Al enviar, el form llama al backend que envía email.

---

## Archivos a crear

```
/gdl/contacto/
└── index.html              ← Página contacto GDL
/mty/contacto/
└── index.html              ← Página contacto MTY
/shared/css/
└── contacto.css            ← Estilos del formulario
/shared/js/
└── contacto.js             ← Submit handler, validación, feedback
```

---

## Especificación visual

```
┌─────────────────────────────────┐
│         PUBLICIDAD              │
│         contáctanos             │
│                                 │
│  Tu nombre                      │
│  [________________________]     │
│                                 │
│  Tu correo electrónico          │
│  [________________________]     │
│                                 │
│  Asunto                         │
│  [________________________]     │
│                                 │
│  Tu mensaje (opcional)          │
│  [                          ]   │
│  [    textarea grande       ]   │
│  [_________________________ ]   │
│                                 │
│  [        ENVIAR           ]    │
└─────────────────────────────────┘
```

- Fondo: negro / gris muy oscuro (`#111` o similar)
- Texto: blanco
- Inputs: fondo oscuro, borde sutil, texto blanco
- Botón ENVIAR: ancho completo, fondo negro, texto blanco, borde blanco o sin borde
- Formulario centrado, ancho máximo ~600px con padding lateral
- Labels encima de cada input

---

## Especificación HTML del formulario

```html
<form id="contacto-form" novalidate>
  <h3>Contáctanos</h3>

  <label for="nombre">Tu nombre</label>
  <input type="text" id="nombre" name="nombre" required>

  <label for="email">Tu correo electrónico</label>
  <input type="email" id="email" name="email" required>

  <label for="asunto">Asunto</label>
  <input type="text" id="asunto" name="asunto" required>

  <label for="mensaje">Tu mensaje (opcional)</label>
  <textarea id="mensaje" name="mensaje" rows="8"></textarea>

  <button type="submit">ENVIAR</button>

  <div id="form-feedback" aria-live="polite"></div>
</form>
```

---

## Especificación JS (`contacto.js`)

### Validación frontend
- Nombre: requerido, no vacío
- Email: requerido, formato válido (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- Asunto: requerido, no vacío
- Mensaje: opcional

### Submit handler

```javascript
// Pseudocódigo
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!validar()) return; // muestra errores inline
  
  botonEnviar.disabled = true;
  botonEnviar.textContent = 'Enviando...';
  
  try {
    const res = await fetch('/soloempleos/contacto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, email, asunto, mensaje })
    });
    
    if (res.ok) {
      mostrarExito('Mensaje enviado. Te contactaremos pronto.');
      form.reset();
    } else {
      mostrarError('Hubo un error al enviar. Intenta de nuevo.');
    }
  } catch {
    mostrarError('Sin conexión. Intenta de nuevo.');
  } finally {
    botonEnviar.disabled = false;
    botonEnviar.textContent = 'ENVIAR';
  }
});
```

### Estados del formulario
- **Error inline:** borde rojo en input inválido + mensaje debajo
- **Enviando:** botón deshabilitado con texto "Enviando..."
- **Éxito:** mensaje verde "Mensaje enviado. Te contactaremos pronto." — form se limpia
- **Error de red:** mensaje rojo, botón se reactiva

---

## Endpoint que consume (FASE 5)

```
POST /soloempleos/contacto
Content-Type: application/json

{
  "nombre": "Juan García",
  "email": "juan@empresa.com",
  "asunto": "Quiero anunciar",
  "mensaje": "Me interesa poner vacantes..."
}
```

Responde:
- `200 OK` → email enviado
- `400 Bad Request` → datos inválidos
- `500 Internal Server Error` → fallo en envío

**Nota:** el endpoint lo construye FASE 5. Para desarrollar y probar esta fase, mockear el endpoint con un servidor local simple que siempre responde 200, o usar un placeholder URL.

---

## Email destino

`projectmanager@soloofertas.com`

El cuerpo del email que llega al destinatario debe incluir todos los campos del formulario formateados claramente.

---

## Entregables

1. `/gdl/contacto/index.html`
2. `/mty/contacto/index.html` (copia con `data-region="mty"`)
3. `/shared/css/contacto.css`
4. `/shared/js/contacto.js`

## Criterio de éxito

- Formulario renderiza con estilos oscuros igual que referencia
- Validación bloquea submit si faltan campos requeridos o email inválido
- Al enviar: botón se deshabilita, muestra "Enviando..."
- Respuesta exitosa: mensaje de confirmación, form se limpia
- Error de red: mensaje de error visible, botón se reactiva
- Funciona en mobile sin desbordamiento horizontal
