/**
 * POST /api/lead
 * Recibe la solicitud de asesoramiento y la envía por email.
 *
 * Variables de entorno (Vercel → Settings → Environment Variables):
 *   RESEND_API_KEY   (obligatoria para envío real)
 *   LEAD_EMAIL       destinatario/s (por defecto administracion@activemur.es)
 *   LEAD_FROM        remitente verificado en Resend (por defecto onboarding@resend.dev)
 *   LEAD_WEBHOOK_URL (opcional: además, reenvía el lead a un webhook)
 *
 * Sin RESEND_API_KEY el endpoint responde {ok:true, mode:"demo"} y deja el lead
 * en los logs de la función, para poder probar el formulario sin configurar nada.
 */

const recent = new Map(); // rate limit simple en memoria (por instancia)

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tooFast(ip) {
  const now = Date.now();
  const hits = (recent.get(ip) || []).filter((t) => now - t < 60_000);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > 6;
}

const TIPO = { hogar: "Hogar", empresa: "Empresa", ambas: "Hogar y empresa" };
const URG = { ya: "Lo antes posible", mes: "En 1-3 meses", informando: "Solo informándose" };
const INST = { vivienda: "Vivienda", oficina: "Oficina o local", industria: "Nave o industria" };
const OBJ = {
  sabor: "Sabor y calidad del agua",
  cal: "Cal y manchas",
  temperatura: "Agua fría / temperaturas",
  aire: "Aire interior",
  limpieza: "Limpieza del hogar",
  nose: "No lo tiene claro",
};

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "Cuerpo inválido" });

  // Honeypot
  if (body.website) return res.status(200).json({ ok: true, mode: "ignored" });

  const ip =
    (String((req.headers || {})["x-forwarded-for"] || "").split(",")[0].trim()) ||
    req.socket?.remoteAddress ||
    "unknown";
  if (tooFast(ip)) return res.status(429).json({ error: "Demasiados envíos. Inténtalo en un minuto." });

  const nombre = String(body.nombre || "").trim().slice(0, 120);
  const telefono = String(body.telefono || "").replace(/[^\d+]/g, "").slice(0, 16);
  const email = String(body.email || "").trim().slice(0, 160);
  const localidad = String(body.localidad || "").trim().slice(0, 80);
  const cp = String(body.cp || "").replace(/\D/g, "").slice(0, 5);
  const urgencia = String(body.urgencia || "");
  const objetivos = Array.isArray(body.objetivos) ? body.objetivos.slice(0, 8) : [];

  if (nombre.length < 2) return res.status(400).json({ error: "Falta el nombre" });
  if (!body.consent) return res.status(400).json({ error: "Falta el consentimiento" });
  if (!localidad) return res.status(400).json({ error: "Falta la localidad" });
  const telOk = /^(\+?34)?[6-9]\d{8}$/.test(telefono);
  const mailOk = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email);
  if (urgencia === "informando") {
    if (!mailOk) return res.status(400).json({ error: "Email no válido" });
  } else if (!telOk) {
    return res.status(400).json({ error: "Teléfono no válido" });
  }

  // Recalcular temperatura en servidor (no confiar solo en el cliente)
  let score = 0;
  if (urgencia === "ya") score += 3;
  else if (urgencia === "mes") score += 2;
  if (body.tipo === "empresa" || body.tipo === "ambas") score += 2;
  if (objetivos.includes("cal")) score += 1;
  if (objetivos.includes("sabor")) score += 1;
  if (objetivos.includes("nose")) score -= 1;
  const temp = score >= 5 ? "caliente" : score >= 2 ? "templado" : "frio";

  const lead = {
    fecha: new Date().toISOString(),
    temperatura: temp,
    score,
    nombre,
    telefono: telefono || "—",
    email: email || "—",
    tipo: TIPO[body.tipo] || body.tipo || "—",
    instalacion: INST[body.instalacion] || body.instalacion || "—",
    objetivos: objetivos.map((o) => OBJ[o] || o).join(", ") || "—",
    urgencia: URG[urgencia] || urgencia || "—",
    localidad: cp ? `${localidad} (${cp})` : localidad,
    personas: String(body.personas || "—"),
    origen: String(body.source || "").slice(0, 300),
    ip,
  };

  const subject = `[Web] ${temp === "caliente" ? "🔥 " : ""}${lead.nombre} · ${lead.localidad} · ${lead.urgencia}`;
  const rows = [
    ["Temperatura", `${temp} (score ${score})`],
    ["Nombre", lead.nombre],
    ["Teléfono", lead.telefono],
    ["Email", lead.email],
    ["Para quién", lead.tipo],
    ["Dónde", lead.instalacion],
    ["Le interesa", lead.objetivos],
    ["Cuándo", lead.urgencia],
    ["Localidad", lead.localidad],
    ["Personas", lead.personas],
    ["Recibido", lead.fecha],
    ["Origen", lead.origen],
  ];
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#111;line-height:1.55">
    <h2 style="margin:0 0 4px">Nueva solicitud de asesoramiento</h2>
    <p style="margin:0 0 18px;color:#666">Activemur · landing</p>
    <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">
      ${rows
        .map(
          ([k, v]) =>
            `<tr><td style="border-bottom:1px solid #eee;color:#666;white-space:nowrap">${esc(k)}</td><td style="border-bottom:1px solid #eee"><strong>${esc(v)}</strong></td></tr>`
        )
        .join("")}
    </table>
    <p style="margin:18px 0 0;font-size:12px;color:#888">Enviado desde el formulario de la landing (provisional).</p>
  </div>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

  const key = process.env.RESEND_API_KEY;
  const to = (process.env.LEAD_EMAIL || "administracion@activemur.es").split(",").map((s) => s.trim());
  const from = process.env.LEAD_FROM || "Activemur web <onboarding@resend.dev>";

  if (!key) {
    console.log("[lead:demo]", JSON.stringify(lead));
    return res.status(200).json({ ok: true, mode: "demo", lead_temp: temp });
  }

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        reply_to: mailOk ? email : undefined,
        subject,
        html,
        text,
      }),
    });
    const out = await r.json().catch(() => ({}));
    if (!r.ok) {
      console.error("[lead:resend-error]", r.status, out);
      return res.status(502).json({ error: "No se pudo enviar el email" });
    }
    console.log("[lead:sent]", out.id, temp);

    if (process.env.LEAD_WEBHOOK_URL) {
      fetch(process.env.LEAD_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, ...lead }),
      }).catch(() => {});
    }
    return res.status(200).json({ ok: true, mode: "email", lead_temp: temp });
  } catch (err) {
    console.error("[lead:error]", err);
    return res.status(500).json({ error: "Error interno" });
  }
};
