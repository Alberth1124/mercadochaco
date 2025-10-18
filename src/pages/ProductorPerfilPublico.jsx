// src/pages/ProductorPerfil.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Row, Col, Card, Spinner, Alert, Badge, Button, Form, InputGroup } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { FaStar } from "react-icons/fa";
import ProductCard from "../components/ProductCard";
import { useAuth } from "../context/AuthContext";

const COLS = "id, nombre, descripcion, precio, imagen_portada_url, categoria_id, categoria_nombre, stock, unidad, usuario_id";

function Stars({ value = 0, size = 22 }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <FaStar key={i} style={{ marginRight: 2 }} color={i <= value ? "#f5c518" : "#e3e3e3"} size={size} />
      ))}
    </span>
  );
}

export default function ProductorPerfil() {
  const { uid } = useParams();
  const { user } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // resumen/mi valoración
  const [resumen, setResumen] = useState({ rating_promedio: 0, rating_cantidad: 0 });
  const [miRating, setMiRating] = useState(0);
  const [miComentario, setMiComentario] = useState("");

  // opiniones
  const [opiniones, setOpiniones] = useState([]);
  const [post, setPost] = useState("");
  const [posting, setPosting] = useState(false);

  // productos
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");

  // pestaña activa
  const [tab, setTab] = useState("productos"); // 'productos' | 'comentarios'

  const nombreCompleto = useMemo(() => {
    if (!perfil) return "";
    const nom = [perfil.nombres, perfil.apellidos].filter(Boolean).join(" ");
    return nom || "Productor";
  }, [perfil]);

  async function cargarTodo() {
    setLoading(true);
    setErr(null);
    try {
      // perfil público
      const { data: per, error: e1 } = await supabase
        .from("v_productor_perfil_publico")
        .select("*")
        .eq("usuario_id", uid)
        .maybeSingle();
      if (e1) throw e1;
      setPerfil(per || null);

      // rating resumen
      const { data: res } = await supabase
        .from("v_productor_valoracion_resumen")
        .select("*")
        .eq("productor_id", uid)
        .maybeSingle();
      setResumen({
        rating_promedio: Number(res?.rating_promedio || 0),
        rating_cantidad: Number(res?.rating_cantidad || 0),
      });

      // mi rating
      if (user?.id) {
        const { data: mine } = await supabase
          .from("productores_valoraciones")
          .select("rating, comentario")
          .eq("productor_id", uid)
          .eq("usuario_id", user.id)
          .maybeSingle();
        setMiRating(Number(mine?.rating || 0));
        setMiComentario(mine?.comentario || "");
      } else {
        setMiRating(0);
        setMiComentario("");
      }

      // opiniones
      const { data: ops } = await supabase
        .from("v_productor_opiniones")
        .select("*")
        .eq("productor_id", uid)
        .order("creado_en", { ascending: false });
      setOpiniones(ops || []);

      // productos (con filtro)
      let query = supabase
        .from("v_catalogo")
        .select(COLS)
        .eq("usuario_id", uid)
        .order("id", { ascending: false })
        .range(0, 47);
      if (q.trim()) query = query.ilike("nombre", `%${q.trim()}%`);
      const { data: prods } = await query;
      setItems(prods || []);
    } catch (e) {
      setErr(e.message || "No se pudo cargar el perfil");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { cargarTodo(); /* eslint-disable-next-line */ }, [uid]);
  useEffect(() => { const t = setTimeout(cargarTodo, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q]);

  const guardarMiRating = async (val) => {
    if (!user) return alert("Inicia sesión para votar.");
    const prev = miRating;
    const rating = Number(val);

    // UI optimista
    setMiRating(rating);
    try {
      const { error } = await supabase.from("productores_valoraciones").upsert(
        { productor_id: uid, usuario_id: user.id, rating, comentario: miComentario || null },
        { onConflict: "productor_id,usuario_id" }
      );
      if (error) throw error;

      // refrescar resumen
      const { data: res } = await supabase
        .from("v_productor_valoracion_resumen")
        .select("*")
        .eq("productor_id", uid)
        .maybeSingle();
      setResumen({
        rating_promedio: Number(res?.rating_promedio || 0),
        rating_cantidad: Number(res?.rating_cantidad || 0),
      });
    } catch (e) {
      // revertir si falla
      setMiRating(prev);
      alert(e.message || "No se pudo guardar tu valoración.");
    }
  };

  const guardarComentario = async () => {
    if (!user) return alert("Inicia sesión para enviar tu opinión.");
    setPosting(true);
    try {
      const texto = post.trim();
      if (!texto) return;
      const { error } = await supabase.from("productores_opiniones").insert({
        productor_id: uid,
        autor_id: user.id,
        mensaje: texto,
      });
      if (error) throw error;
      setPost("");
      const { data: ops } = await supabase
        .from("v_productor_opiniones")
        .select("*")
        .eq("productor_id", uid)
        .order("creado_en", { ascending: false });
      setOpiniones(ops || []);
    } catch (e) {
      alert(e.message || "No se pudo publicar tu opinión.");
    } finally {
      setPosting(false);
    }
  };

  if (loading) return <div className="py-5 text-center"><Spinner /></div>;
  if (err) return <Alert variant="danger">{err}</Alert>;
  if (!perfil) return <Alert variant="warning">Perfil no encontrado.</Alert>;

  return (
    <div className="container py-3">
      {/* Header */}
      <Row className="g-3 align-items-center">
        <Col xs="auto">
          <img
            src={perfil.avatar_url || "/img/avatar.png"}
            alt={nombreCompleto}
            width={72}
            height={72}
            style={{ borderRadius: "50%", objectFit: "cover" }}
            onError={(e) => { e.currentTarget.src = "/img/avatar.png"; }}
          />
        </Col>
        <Col>
          <h4 className="mb-1">{nombreCompleto}</h4>
          <div className="text-muted small">
            {[perfil.pais, perfil.departamento, perfil.municipio, perfil.comunidad].filter(Boolean).join(" · ")}
          </div>
          <div className="text-muted small">{perfil.direccion_texto || ""}</div>
          {perfil.actividad && <Badge bg="success" className="mt-1">{perfil.actividad}</Badge>}
        </Col>
        <Col xs="12" md="auto" className="text-md-end">
          <div className="d-flex align-items-center gap-2">
            <Stars value={Math.round(Number(resumen.rating_promedio || 0))} />
            <span className="small text-muted">
              {Number(resumen.rating_promedio || 0).toFixed(2)} ({resumen.rating_cantidad})
            </span>
          </div>
        </Col>
      </Row>

      {/* ⭐ Tu valoración (interactivo) */}
      <Card className="mt-3">
        <Card.Body>
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div className="fw-semibold">Tu valoración</div>
            <div>
              {[1, 2, 3, 4, 5].map(i => (
                <button
                  key={i}
                  type="button"
                  className="btn btn-link p-0 me-1"
                  onClick={() => guardarMiRating(i)}
                  aria-label={`${i} estrella${i > 1 ? "s" : ""}`}
                  style={{ textDecoration: "none" }}
                >
                  <FaStar color={i <= miRating ? "#f5c518" : "#e3e3e3"} size={28} />
                </button>
              ))}
            </div>
          </div>
          <div className="text-muted small mt-1">
            Promedio actual: {Number(resumen.rating_promedio || 0).toFixed(2)} ({resumen.rating_cantidad} votos)
          </div>
        </Card.Body>
      </Card>

      {/* Tabs */}
      <div className="d-flex gap-2 my-3">
        <Button
          className="rounded-pill px-3"
          variant={tab === "productos" ? "success" : "outline-secondary"}
          onClick={() => setTab("productos")}
        >
          Productos
        </Button>
        <Button
          className="rounded-pill px-3"
          variant={tab === "comentarios" ? "success" : "outline-secondary"}
          onClick={() => setTab("comentarios")}
        >
          Comentarios
        </Button>
      </div>

      {/* Contenido */}
      {tab === "productos" ? (
        <Card>
          <Card.Header className="fw-semibold">Productos de {perfil.nombres || "la tienda"}</Card.Header>
          <Card.Body>
            <InputGroup className="mb-3">
              <Form.Control
                placeholder="Buscar en sus productos…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
              <Button onClick={() => { /* debounce already */ }}>Buscar</Button>
            </InputGroup>
            {/* 2 por fila en móvil, 3 en md, 4 en lg+ */}
            <Row className="g-3">
              {items.map((prod) => (
                <Col key={prod.id} xs={6} md={4} lg={3}>
                  <ProductCard item={prod} />
                </Col>
              ))}
              {items.length === 0 && <div className="text-muted">Sin productos.</div>}
            </Row>
          </Card.Body>
        </Card>
      ) : (
        <Card>
          <Card.Header className="fw-semibold">Comentarios</Card.Header>
          <Card.Body>
            <InputGroup className="mb-2">
              <Form.Control
                placeholder="Escribe tu opinión sobre este productor…"
                value={post}
                onChange={(e) => setPost(e.target.value)}
              />
              <Button onClick={guardarComentario} disabled={!post.trim() || posting}>
                Publicar
              </Button>
            </InputGroup>
            <div className="vstack gap-3">
              {opiniones.map((op) => (
                <div key={op.id} className="d-flex">
                  <img
                    src={op.autor_avatar_url || "/img/avatar.png"}
                    alt={op.autor_nombre}
                    width={36}
                    height={36}
                    style={{ borderRadius: "50%", objectFit: "cover", marginRight: 10 }}
                    onError={(e) => { e.currentTarget.src = "/img/avatar.png"; }}
                  />
                  <div>
                    <div className="fw-semibold small">{op.autor_nombre || "Usuario"}</div>
                    <div className="small">{op.mensaje}</div>
                    <div className="text-muted small">{new Date(op.creado_en).toLocaleString()}</div>
                  </div>
                </div>
              ))}
              {opiniones.length === 0 && <div className="text-muted">Sé el primero en opinar.</div>}
            </div>
          </Card.Body>
        </Card>
      )}

      <div className="mt-3">
        <Link to="/catalogo" className="btn btn-outline-secondary">← Volver al catálogo</Link>
      </div>
    </div>
  );
}
