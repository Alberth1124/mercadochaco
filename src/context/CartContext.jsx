import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "./AuthContext";

const Ctx = createContext();

export default function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]); // [{ producto_id, cantidad, producto? }]

  // --- helpers localStorage (invitado) ---
  const readLocal = () => {
    try { return JSON.parse(localStorage.getItem("mc_cart") || "[]"); }
    catch { return []; }
  };
  const writeLocal = (arr) => localStorage.setItem("mc_cart", JSON.stringify(arr));

  // Trae datos del producto para mostrar precio/nombre/imagen
  const hydrateProducts = async (arr) => {
    const ids = Array.from(new Set(arr.map(i => i.producto_id))).filter(Boolean);
    if (!ids.length) return arr;
    const { data: prods, error } = await supabase
      .from("productos")
      .select("id, nombre, precio, stock, imagen_portada_url, slug")
      .in("id", ids);
    if (error) { console.error(error); return arr; }
    const map = Object.fromEntries((prods || []).map(p => [p.id, p]));
    return arr.map(i => ({ ...i, producto: map[i.producto_id] || i.producto }));
  };

  // Carga carrito según estado de sesión
  const load = async () => {
    if (!user) {
      const local = readLocal();
      setItems(await hydrateProducts(local));
      return;
    }
    const { data: rows, error } = await supabase
      .from("carritos_items") // ✅ nombre correcto en BD
      .select("producto_id, cantidad")
      .eq("usuario_id", user.id);
    if (error) { console.error(error); return; }
    setItems(await hydrateProducts(rows || []));
  };

  // Fusiona carrito local -> remoto cuando el usuario inicia sesión
  useEffect(() => {
    (async () => {
      if (user) {
        const local = readLocal();
        if (local.length) {
          for (const it of local) {
            await upsertRemote(it.producto_id, it.cantidad); // suma cantidades
          }
          writeLocal([]); // limpia local una vez migrado
        }
      }
      await load();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Inserta/actualiza en BD sumando cantidad existente
  const upsertRemote = async (producto_id, deltaQty = 1) => {
    // lee si ya hay fila
    const { data: existing } = await supabase
      .from("carritos_items")
      .select("cantidad")
      .eq("usuario_id", user.id)
      .eq("producto_id", producto_id)
      .limit(1)
      .maybeSingle();

    const nueva = Math.max(1, (existing?.cantidad || 0) + (deltaQty || 0));
    const { error } = await supabase
      .from("carritos_items")
      .upsert(
        { usuario_id: user.id, producto_id, cantidad: nueva },
        { onConflict: "usuario_id,producto_id" }
      );
    if (error) throw error;
  };

  // API pública
  const addToCart = async (productoOrId, qty = 1) => {
    const producto_id = typeof productoOrId === "string" ? productoOrId : productoOrId?.id;
    if (!producto_id) return;

    // Invitado: localStorage
    if (!user) {
      const curr = readLocal();
      const idx = curr.findIndex(i => i.producto_id === producto_id);
      if (idx >= 0) curr[idx].cantidad += qty;
      else curr.push({
        producto_id,
        cantidad: qty,
        producto: typeof productoOrId === "object" ? productoOrId : undefined
      });
      writeLocal(curr);
      setItems(await hydrateProducts(curr));
      return;
    }

    // Logueado: Supabase
    await upsertRemote(producto_id, qty);
    await load();
  };

  const updateQty = async (producto_id, qty) => {
    const cantidad = Math.max(0, parseInt(qty || 0, 10));

    if (!user) {
      let curr = readLocal();
      if (cantidad <= 0) curr = curr.filter(i => i.producto_id !== producto_id);
      else curr = curr.map(i => i.producto_id === producto_id ? { ...i, cantidad } : i);
      writeLocal(curr);
      setItems(await hydrateProducts(curr));
      return;
    }

    if (cantidad <= 0) {
      await supabase.from("carritos_items")
        .delete()
        .eq("usuario_id", user.id)
        .eq("producto_id", producto_id);
    } else {
      await supabase.from("carritos_items").upsert(
        { usuario_id: user.id, producto_id, cantidad },
        { onConflict: "usuario_id,producto_id" }
      );
    }
    await load();
  };

  const remove = async (producto_id) => updateQty(producto_id, 0);

  const clear = async () => {
    if (!user) {
      writeLocal([]);
      setItems([]);
      return;
    }
    await supabase.from("carritos_items").delete().eq("usuario_id", user.id);
    setItems([]);
  };

  // Derivados
  const count = useMemo(() => items.reduce((a, b) => a + (b.cantidad || 0), 0), [items]);
  const total = useMemo(
    () => items.reduce((a, b) => a + (b.cantidad || 0) * (b.producto?.precio || 0), 0),
    [items]
  );

  // Alias de compatibilidad con componentes antiguos
  const setCantidad = updateQty;
  const quitar = remove;

  return (
    <Ctx.Provider
      value={{
        items, count, total,
        addToCart, updateQty, remove, clear,
        setCantidad, quitar,
        reload: load
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);
