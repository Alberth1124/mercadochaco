import { useEffect, useState } from "react";
import { Row, Col, Spinner, Alert, Form, InputGroup, Button } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import ProductCard from "../components/ProductCard";
import CardCarousel from "../components/PromoCarousel";
import CarruselOfertas from "../components/CarruselOfertas";

export default function Catalogo() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState([]);

  const PER_PAGE = 24;
  const COLUMNS =
    "id, nombre, descripcion, precio, imagen_portada_url, categoria_id, categoria_nombre, productor_nombres, productor_apellidos, productor_telefono, pais, departamento, municipio, comunidad, stock, unidad";

  // Cargar categorías si existen
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from("categorias")
          .select("id,nombre")
          .order("nombre");
        if (error) throw error;
        setCategorias(data || []);
      } catch {
        // opcional: setErr('No se pudieron cargar las categorías');
      }
    })();
  }, []);

  // Cargar productos con filtros
  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      let query = supabase.from("v_catalogo").select(COLUMNS);

      if (q.trim()) query = query.ilike("nombre", `%${q.trim()}%`);
      if (categoriaId) query = query.eq("categoria_id", categoriaId);

      const { data, error } = await query
        .order("id", { ascending: false })
        .range(0, PER_PAGE - 1); // paginación: primeros 24

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  // carga inicial
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recarga con debounce al cambiar búsqueda/filtro
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, categoriaId]);

  return (
    <div>
      {/* 👇 Carrusel de ofertas arriba del título */}
      <div className="mb-3">
        <CarruselOfertas title="Productos en oferta" />
      </div>

      <h4 className="mb-3">
        <span style={{ color: "var(--mc-green-600)" }}>●</span> Productos
      </h4>

      <Row className="g-2 mb-3">
        <Col md={3}>
          <Form.Select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Todas las categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={6}>
          <InputGroup>
            <Form.Control
              placeholder="Buscar productos…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Button variant="outline-success" onClick={load}>
              Buscar
            </Button>
          </InputGroup>
        </Col>
      </Row>

      {err && <Alert variant="danger">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner />
        </div>
      ) : (
        <Row className="g-3">
          {items.map((p) => (
            <Col key={p.id} xs={12} md={6} lg={4} xl={3}>
              <ProductCard item={p} />
            </Col>
          ))}
          {!items.length && <div className="text-muted">Sin resultados.</div>}
        </Row>
      )}

      <div className="section-divider"></div>
      <CardCarousel title="Nuestros Colaboradores" bucket="colaboradores" />
    </div>
  );
}
