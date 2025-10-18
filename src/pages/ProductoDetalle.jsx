import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Row, Col, Button, Spinner, Alert, ButtonGroup, Card, Badge, Table } from "react-bootstrap";
import { supabase } from "../supabaseClient";
import { FaWhatsapp, FaMapMarkerAlt } from "react-icons/fa";
import ReactionBarInline from "../components/ReactionBarInline";
import ShareButtons from "../components/ShareButtons";
import ProductChat from "../components/ProductChat";
import CardCarousel from "../components/PromoCarousel";
import { showToast } from "../utils/toast";
import { useCart } from "../context/CartContext";
import { waHrefFromPhoneBO } from "../utils/phone";

export default function ProductoDetalle() {
  const { id } = useParams();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const { addToCart } = useCart?.() || { addToCart: () => {} };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const pid = Number(id);
        const criterion = Number.isFinite(pid) ? pid : id;

        const { data, error } = await supabase
          .from("v_catalogo")
          .select("*")
          .eq("id", criterion)
          .single();

        if (error) {
          if (error.code === "PGRST116") {
            setP(null);
          } else {
            throw error;
          }
        } else {
          setP(data || null);
        }
      } catch (e) {
        setErr(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const precioFmt = useMemo(() => {
    const n = Number(p?.precio);
    return Number.isFinite(n) ? n.toFixed(2) : null;
  }, [p?.precio]);

  if (loading) return <div className="py-5 text-center"><Spinner /></div>;
  if (err) return <Alert variant="danger">{err}</Alert>;
  if (!p) return <Alert variant="warning">Producto no encontrado.</Alert>;

  const foto = p.imagen_portada_url || "/img/noimage.jpg";

  const seller = `${p.productor_nombres ?? ""}${p.productor_apellidos ? ` ${p.productor_apellidos}` : ""}`.trim();
  const url = `${window.location.origin}/producto/${p.id}`;
  const ubicacion = [p.pais, p.departamento, p.municipio, p.comunidad].filter(Boolean).join(" — ");

  const wa = waHrefFromPhoneBO(
    p.productor_telefono,
    `Hola, me interesa: ${p.nombre}. ¿Información de entrega?`
  );

  const catName = p?.categoria_nombre ?? null;
  const stockVal = Number(p?.stock ?? 0);
  const unidad = p?.unidad ?? null;

  const buy = () => {
    addToCart(p, 1);
    showToast({ title: "Agregado", body: p.nombre, variant: "success" });
  };

  // 👇 intentamos deducir el UID del productor con varios posibles campos de la vista
  const productorUid = p?.productor_usuario_id || p?.productor_id || p?.usuario_id || null;

  return (
    <div>
      <div className="mt-3">
        <ShareButtons url={url} text={p.nombre} />
      </div>
      <br />

      <Row className="g-4">
        {/* Imagen */}
        <Col md={6}>
          <div className="detail-img-wrap">
            <img
              src={foto}
              alt={p.nombre}
              onError={(e) => { e.currentTarget.src = "/img/noimage.jpg"; }}
            />
          </div>

          {/* Reacciones */}
          <br />
          <ReactionBarInline productoId={p.id} />
        </Col>

        {/* Info principal */}
        <Col md={6}>
          <h2 className="mb-1">{p.nombre}</h2>

          <div className="mb-1">
            Vendido por:{" "}
            {productorUid ? (
              <Link
                to={`/productor/${productorUid}`}
                className="fw-semibold text-decoration-none"
              >
                {seller || "Productor"}
              </Link>
            ) : (
              <b>{seller || "Productor"}</b>
            )}
          </div>

          {ubicacion && (
            <div className="text-muted mb-2">
              <FaMapMarkerAlt className="me-1" /> {ubicacion}
            </div>
          )}

          {precioFmt && (
            <div className="display-6 fw-bold mb-2">{precioFmt} Bs.</div>
          )}

          {/* Categoría + Stock JUNTOS debajo del precio */}
          <div className="mb-3 d-flex align-items-center gap-2 flex-wrap">
            {catName && <Badge bg="secondary">{catName}</Badge>}
            <Badge bg={stockVal > 0 ? "success" : "secondary"}>
              {stockVal > 0
                ? `Stock: ${stockVal}${unidad ? ` ${unidad}` : ""}`
                : "Sin stock"}
            </Badge>
          </div>

          <ButtonGroup className="mb-3">
            <Button variant="outline-success" onClick={buy}>
              Agregar al carrito
            </Button>
            {wa && (
              <Button className="btn-wa" onClick={() => window.open(wa, "_blank")}>
                <FaWhatsapp className="me-2" /> Contactarse
              </Button>
            )}
          </ButtonGroup>

          {/* FICHA: SOLO DESCRIPCIÓN */}
          <Card className="mt-2">
            <Card.Header className="fw-semibold">Detalles del producto</Card.Header>
            <Card.Body className="p-0">
              <Table striped borderless hover responsive className="mb-0">
                <tbody>
                  <tr>
                    <td style={{ minWidth: 140 }} className="text-muted">Descripción</td>
                    <td className="fw-semibold">{p?.descripcion || "—"}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="section-divider"></div>
      <ProductChat productoId={p.id} />
      <div className="section-divider"></div>
      <CardCarousel title="Nuestros Colaboradores" bucket="colaboradores" />
    </div>
  );
}
