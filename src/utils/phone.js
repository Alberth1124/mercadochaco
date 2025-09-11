export function waHrefFromPhoneBO(raw, text = "Hola") {
  let n = String(raw || "").replace(/\D/g, "");
  if (!n) return null;
  // Si viene con 8 dígitos, asumimos Bolivia y anteponemos 591
  if (n.length === 8) n = "591" + n;
  // Si viene con 0 adelante (9 dígitos), quitamos el 0 y ponemos 591
  if (n.length === 9 && n.startsWith("0")) n = "591" + n.slice(1);
  // Si no empieza con 591 y ya trae código de país, lo dejamos tal cual
  if (!n.startsWith("591") && n.length > 8) n = n; // e.g. 54..., 57...
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}
