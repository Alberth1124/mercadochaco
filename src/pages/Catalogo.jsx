import { useEffect, useState } from "react";
import { Row, Col, Spinner, Alert, Form, InputGroup, Button } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import ProductCard from "../components/ProductCard";
import CardCarousel from "../components/PromoCarousel";
import CarruselOfertas from "../components/CarruselOfertas";
import { useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";

export default function Catalogo() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [categorias, setCategorias] = useState([]);

  const nav = useNavigate();

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
        .range(0, PER_PAGE - 1);

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
      {/* Flecha volver */}
      <div className="mb-2 d-flex align-items-center">
        <Button
          variant="link"
          className="p-0 me-2 text-secondary"
          onClick={() => nav(-1)}
        >
           <FaArrowLeft className="me-1" style={{ color: "var(--mc-green-600)" }} />
        </Button>
      </div>

      {/* Carrusel de ofertas */}
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
        // ⬇️ Grid responsivo: mínimo 2 tarjetas en móvil
        <Row className="g-2 g-md-3">
          {items.map((p) => (
            <Col key={p.id} xs={6} sm={6} md={4} lg={3} xl={3} xxl={2}>
              <ProductCard item={p} />
            </Col>
          ))}
          {!items.length && <div className="text-muted">Sin resultados.</div>}
        </Row>
      )}

      <div className="section-divider"></div>
      <CardCarousel title="Nuestros Colaboradores" bucket="colaborado res" />
    </div>
  );
}
