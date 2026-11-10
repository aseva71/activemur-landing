# Activemur — landing de captación

Página única para captar solicitudes de asesoramiento (hogares y empresas) con un
formulario de **dos pasos que cualifica el lead** antes de enviarlo.

```
index.html            toda la página (HTML + CSS + JS, sin dependencias)
media/                7 fotos reales extraídas de activemur.es
fonts/                Manrope + Inter (woff2, servidas en local)
api/lead.js           endpoint del formulario (solo en Vercel/Netlify)
vercel.json           cabeceras de caché y seguridad
dev-server.js         servidor local con el endpoint incluido (npm run dev)
.nojekyll             necesario en GitHub Pages
```

### Diseño (según la guía del cliente)

- **Paleta:** azul `#086B9B`, verde agua `#31A58D`, azul muy claro `#EDF7FA`, azul oscuro `#173448`.
- **Tipografía:** Manrope (400–800), servida en local.
- **Bloques:** hero a dos columnas · situación actual (3 tarjetas) · 5 soluciones ·
  prueba social · 3 pasos · servicio técnico · FAQ · cierre con formulario.
- **CTA único:** «Solicita asesoramiento» en todos los puntos de conversión.
- Sin vídeo: solo fotografía, para mantener el peso bajo (≈220 KB de imágenes).

Las rutas son **relativas**, así que el sitio funciona igual en la raíz de un dominio
(Vercel) que en una subcarpeta (`usuario.github.io/repo/`, GitHub Pages).

## Ver en local

```bash
npm run dev      # http://localhost:3000
```

Sin `RESEND_API_KEY` el formulario funciona en **modo demostración**: valida, muestra
la confirmación y deja el lead en la consola del servidor, pero no envía email.

## Publicar en GitHub Pages

El repositorio ya está preparado (rutas relativas y `.nojekyll`):

1. Crear un repositorio y subir el contenido de esta carpeta a la rama `main`.
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main / (root)**.
3. En 1-2 minutos la web está en `https://USUARIO.github.io/NOMBRE-REPO/`.

**Limitación:** Pages es alojamiento estático y no ejecuta `api/lead.js`. Si alguien
envía el formulario, la página le ofrece mandar la solicitud por email con los datos
ya rellenos (o llamar). Para recibir leads automáticamente hace falta Vercel o Netlify.

## Publicar en Vercel

```bash
npm i -g vercel
cd activemur-landing
vercel            # primera vez: login y crear proyecto (preview)
vercel --prod     # publicar en producción
```

La URL de preview se puede enviar al cliente sin tocar nada más.

### Que los leads lleguen por email

En Vercel → **Project → Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `RESEND_API_KEY` | clave de [resend.com](https://resend.com) (plan gratis: 3.000 emails/mes) |
| `LEAD_EMAIL` | destinatario real, p. ej. `administracion@activemur.es` |
| `LEAD_FROM` | remitente verificado en Resend, p. ej. `Activemur web <web@activemur.es>` |
| `LEAD_WEBHOOK_URL` | *(opcional)* reenvía el lead a un webhook / Google Sheets / CRM |

Sin dominio verificado en Resend, `LEAD_FROM` debe ser `onboarding@resend.dev`
y el destinatario tiene que ser el email de la cuenta de Resend.

## Qué hace el formulario

Una sola pantalla, como pide la guía: **nombre, teléfono, localidad, solución de interés
y mensaje opcional**, más consentimiento RGPD. Sin pasos que hagan abandonar.

El selector de solución (`Ósmosis`, `Descalcificación`, `Fuentes`, `Enfriamiento /
hidrogenación`, `Aire y limpieza`, `Asesoramiento general`) permite saber de antemano qué
necesita el lead. Cada solicitud llega con una **temperatura** (`caliente` / `templado`)
calculada en el servidor según la solución elegida y la longitud del mensaje, y aparece en
el asunto del email para priorizar la llamada.

Si el sitio se sirve como estático (GitHub Pages) no hay endpoint: el formulario detecta
el fallo y ofrece **enviar la misma solicitud por email con los datos ya rellenados**, o
llamar por teléfono.

## Medición (GA4)

En la cabecera del `<script>`, una sola línea:

```js
window.ACTIVEMUR_GA4 = "";   // pega aquí tu ID: G-XXXXXXXXXX
```

- **Vacío** → no se carga nada, no aparece el aviso de cookies y la página no hace
  ni una petición a terceros. Así está ahora.
- **Con ID** → aparece un aviso de cookies discreto; la analítica solo se carga si el
  visitante acepta. La decisión se guarda en `localStorage`.

Eventos enviados, a `dataLayer` y a GA4:

| Evento | Cuándo | Datos |
|---|---|---|
| `cta_click` | clic en un CTA principal | `where`, `seccion` |
| `solucion_click` | clic en «Quiero saber más» | `solucion` |
| `contacto_click` | clic en teléfono o email | `tipo` |
| `faq_open` | abrir una pregunta | `pregunta` |
| `scroll_75` | llegar al 75 % (una vez) | — |
| `lead_submit` | formulario enviado | `lead_temp`, `solucion` |
| `lead_fallback` | fallo de envío, se ofrece email | `reason` |

Para marcar la conversión: GA4 → **Administrar → Eventos → `lead_submit` como conversión**.

## Eventos de medición

`window.dataLayer` recibe `cta_click` (con `where`), `form_step2` y `lead_submit`
(con `lead_temp` y `lead_score`). Para medir en GA4 basta conectar el contenedor de
Google Tag Manager o añadir el snippet de GA4 antes de `</head>`: los eventos ya están
pushados con el formato estándar de GTM.

## Cambios habituales

- **Textos:** todo el copy está en `index.html`, en el orden de la página.
- **Quitar la nota «versión provisional»:** borrar el `<p class="provisional">` del footer.
- **Fotos de producto:** sustituir los archivos de `public/media/` manteniendo el nombre.
- **Colores:** variables CSS al principio del `<style>` (`--accent` es el verde-azulado).
- **Indexación:** mientras sea provisional, su `canonical` apunta a `activemur.es`.
  Si la landing pasa a ser la web oficial, quitar esa etiqueta `<link rel="canonical">`.

## Datos pendientes de recibir del cliente

- Testimonios reales (ósmosis, descalcificador, empresa con fuente) y reseñas de Google.
- Logotipos de empresas clientes, con autorización.
- Fotos propias de instalaciones y equipo (ahora se usan las de activemur.es).
- Confirmación de zonas de servicio y horario de atención.
