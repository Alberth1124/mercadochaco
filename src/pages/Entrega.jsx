import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { Container, Row, Col, Card, Form, Button, Spinner } from "react-bootstrap";
import { useCart } from "../context/CartContext"; // ← NUEVO

export default function Entrega() {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { clear: clearCart } = useCart(); // ← NUEVO

  const [form, setForm] = useState({
    contacto_nombre: "",
    contacto_telefono: "",
    entrega_direccion: "",
    entrega_referencia: ""
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validated, setValidated] = useState(false);

  useEffect(() => {
    (async () => {
      // Verificar estado del pedido y precargar campos
      const { data: pedido, error } = await supabase
        .from("pedidos")
        .select("id, contacto_nombre, contacto_telefono, entrega_direccion, entrega_referencia, estado")
        .eq("id", pedidoId)
        .single();

      if (error || !pedido) {
        console.error(error);
        navigate("/catalogo", { replace: true });
        return;
      }

      // Si alguien entra sin pagar, devuélvelo al checkout
      if (pedido.estado !== "pagado") {
        navigate(`/checkout/${pedidoId}`, { replace: true });
        return;
      }

      setForm({
        contacto_nombre: pedido?.contacto_nombre || "",
        contacto_telefono: pedido?.contacto_telefono || "",
        entrega_direccion: pedido?.entrega_direccion || "",
        entrega_referencia: pedido?.entrega_referencia || ""
      });
      setLoading(false);
    })();
  }, [pedidoId, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;
    if (!formEl.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("pedidos")
        .update({
          contacto_nombre: form.contacto_nombre.trim(),
          contacto_telefono: form.contacto_telefono.trim(),
          entrega_direccion: form.entrega_direccion.trim(),
          entrega_referencia: form.entrega_referencia.trim(),
          entrega_confirmada: true
        })
        .eq("id", pedidoId);

      if (error) throw error;

      // ✅ LIMPIEZA DE CARRITO (cliente)
      try { clearCart?.(); } catch {}
      try { localStorage.removeItem("mc_cart"); } catch {}

      // ✅ (OPCIONAL) LIMPIEZA EN BD SI USAS carrito_items
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("carrito_items")
            .delete()
            .eq("user_id", user.id);
        }
      } catch { /* no bloquear navegación por este paso */ }

      navigate(`/exito/${pedidoId}`);
    } catch (err) {
      alert(err.message || "No se pudo guardar la información de entrega.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 d-flex justify-content-center">
        <Spinner animation="border" role="status" />
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col xs={12} lg={10} xl={8}>
          <h2 className="mb-3">Datos de entrega</h2>

          <Card className="shadow-sm">
            <Card.Body>
              <Form noValidate validated={validated} onSubmit={onSubmit}>
                <Row className="g-3">
                  <Col xs={12} md={6}>
                    <Form.Group controlId="contacto_nombre">
                      <Form.Label>Nombre de contacto<span className="text-danger"> *</span></Form.Label>
                      <Form.Control
                        name="contacto_nombre"
                        value={form.contacto_nombre}
                        onChange={handleChange}
                        required
                        placeholder="Ej. Juan Pérez"
                        autoComplete="name"
                      />
                      <Form.Control.Feedback type="invalid">
                        Ingresa el nombre de contacto.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12} md={6}>
                    <Form.Group controlId="contacto_telefono">
                      <Form.Label>Teléfono<span className="text-danger"> *</span></Form.Label>
                      <Form.Control
                        name="contacto_telefono"
                        type="tel"
                        value={form.contacto_telefono}
                        onChange={handleChange}
                        required
                        placeholder="Ej. 70000000"
                        autoComplete="tel"
                        pattern="^[0-9 +()-]{6,20}$"
                      />
                      <Form.Text className="text-muted">
                        Solo números y símbolos + ( ) - . Mín. 6 dígitos.
                      </Form.Text>
                      <Form.Control.Feedback type="invalid">
                        Ingresa un teléfono válido.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group controlId="entrega_direccion">
                      <Form.Label>Dirección<span className="text-danger"> *</span></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        name="entrega_direccion"
                        value={form.entrega_direccion}
                        onChange={handleChange}
                        required
                        placeholder="Calle / Av., número, barrio o zona"
                        autoComplete="street-address"
                      />
                      <Form.Control.Feedback type="invalid">
                        Ingresa la dirección de entrega.
                      </Form.Control.Feedback>
                    </Form.Group>
                  </Col>

                  <Col xs={12}>
                    <Form.Group controlId="entrega_referencia">
                      <Form.Label>Referencia (opcional)</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="entrega_referencia"
                        value={form.entrega_referencia}
                        onChange={handleChange}
                        placeholder="Punto de referencia, piso, portón, etc."
                      />
                    </Form.Group>
                  </Col>

                  <Col xs={12} className="d-flex gap-2 justify-content-end mt-2">
                    <Button
                      variant="outline-secondary"
                      type="button"
                      onClick={() => navigate(-1)}
                      disabled={saving}
                    >
                      Volver
                    </Button>
                    <Button variant="success" type="submit" disabled={saving}>
                      {saving ? (
                        <>
                          <Spinner size="sm" className="me-2" /> Guardando…
                        </>
                      ) : (
                        "Confirmar"
                      )}
                    </Button>
                  </Col>
                </Row>
              </Form>
            </Card.Body>
          </Card>

          <p className="text-muted mt-3" style={{ fontSize: 14 }}>
            * Todos los campos obligatorios deben completarse para coordinar tu entrega.
          </p>
        </Col>
      </Row>
    </Container>
  );
}
