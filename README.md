# Activemur — landing de captación

Página única para captar solicitudes de asesoramiento (hogares y empresas) con un
formulario de **dos pasos que cualifica el lead** antes de enviarlo.

```
index.html            toda la página (HTML + CSS + JS, sin dependencias)
media/                vídeo, póster y fotos de producto
fonts/                Inter (woff2, servida local)
api/lead.js           endpoint del formulario (solo en Vercel/Netlify)
vercel.json           cabeceras de caché y seguridad
dev-server.js         servidor local con el endpoint incluido (npm run dev)
.nojekyll             necesario en GitHub Pages
```

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

**Paso 1 (cualificación):** para quién es · qué quiere mejorar · cuándo lo necesita.
**Paso 2 (contacto):** localidad, CP, dónde se instala, nombre, teléfono, email y consentimiento.

Reglas de filtrado:

- «Solo estoy informándome» → pide **email en vez de teléfono** y la confirmación dice
  que se enviará información sin llamar. No consume tiempo de comercial.
- «Empresa» o «ambas» → aparece el campo de número de personas.
- Cada lead sale con una **temperatura** (`caliente` / `templado` / `frio`) calculada en
  el servidor, para priorizar la llamada. El asunto del email la incluye.

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
