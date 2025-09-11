// src/pages/MisProductos.jsx
import { useEffect, useMemo, useState } from 'react';
import { Table, Button, Modal, Form, Row, Col, Alert, Spinner, InputGroup } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export default function MisProductos() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);

  // Listado
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  // Filtros y paginación
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const [total, setTotal] = useState(0);

  // Categorías y formulario (crear/editar)
  const [cats, setCats] = useState([]);
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const emptyForm = { id: null, nombre: '', descripcion: '', precio: '', stock: 0, publicado: true, destacado: false, categoria_id: '', imagen_portada_url: '' };
  const [form, setForm] = useState(emptyForm);

  // ===== Helpers =====
  const onChange = (e) =>
    setForm((f) => ({
      ...f,
      [e.target.name]: e.target.type === 'number' ? Number(e.target.value) : e.target.value,
    }));
  const onCheck = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.checked }));

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  // ===== Cargar rol, categorías y datos iniciales =====
  useEffect(() => {
    (async () => {
      if (!user) return;

      // 1) ¿Es admin?
      try {
        const { data: adminFlag, error: adminErr } = await supabase.rpc('es_admin_rpc');
        if (adminErr) console.warn('es_admin_rpc error:', adminErr);
        setIsAdmin(!!adminFlag);
      } catch (e) {
        console.warn('RPC admin failed', e);
      }

      // 2) Categorías activas
      try {
        const { data: c, error: cErr } = await supabase.from('categorias').select('id,nombre').eq('activa', true).order('nombre');
        if (cErr) throw cErr;
        setCats(c || []);
      } catch (e) {
        console.warn(e);
      }
    })();
  }, [user]);

  // ===== Fetch con filtros/paginación =====
  async function fetchData(pPage = page, term = q) {
    if (!user) return;
    setLoading(true);
    setErr(null);
    try {
      const from = pPage * pageSize;
      const to = from + pageSize - 1;

      let qry = supabase
        .from('productos')
        .select('id,nombre,precio,imagen_portada_url,publicado,destacado,usuario_id,categoria_id,creado_en,stock', { count: 'exact' })
        .order('creado_en', { ascending: false })
        .range(from, to);

      if (!isAdmin) qry = qry.eq('usuario_id', user.id);
      if (term?.trim()) qry = qry.ilike('nombre', `%${term.trim()}%`);

      const { data, error, count } = await qry;
      if (error) throw error;

      setItems(data || []);
      setTotal(count ?? 0);
    } catch (e) {
      setErr(e.message || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial y al cambiar page/isAdmin/user
  useEffect(() => {
    if (!user) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAdmin, page]);

  // Refiltrar con debounce al cambiar q
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(0);
      fetchData(0, q);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  // ===== Crear / Editar / Eliminar =====
  const nuevo = () => {
    setForm(emptyForm);
    setShow(true);
  };
  const editar = (p) => {
    setForm({
      id: p.id,
      nombre: p.nombre || '',
      descripcion: p.descripcion || '',
      precio: p.precio ?? '',
      stock: p.stock ?? 0,
      publicado: !!p.publicado,
      destacado: !!p.destacado,
      categoria_id: p.categoria_id || '',
      imagen_portada_url: p.imagen_portada_url || '',
    });
    setShow(true);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      if (!form.nombre || form.precio === '' || form.precio === null) throw new Error('Nombre y precio son obligatorios');

      if (form.id) {
        // UPDATE
        const { error } = await supabase
          .from('productos')
          .update({
            nombre: form.nombre,
            descripcion: form.descripcion,
            precio: form.precio,
            stock: form.stock,
            publicado: form.publicado,
            destacado: form.destacado,
            imagen_portada_url: form.imagen_portada_url,
            categoria_id: form.categoria_id || null,
          })
          .eq('id', form.id)
          .eq('usuario_id', isAdmin ? form.usuario_id ?? user.id : user.id); // asegura dueño salvo admin
        if (error) throw error;
        setMsg('Producto actualizado');
      } else {
        // INSERT
        const { error } = await supabase.from('productos').insert({
          usuario_id: user.id,
          nombre: form.nombre,
          descripcion: form.descripcion,
          precio: form.precio,
          stock: form.stock,
          publicado: form.publicado,
          destacado: form.destacado,
          imagen_portada_url: form.imagen_portada_url,
          categoria_id: form.categoria_id || null,
        });
        if (error) throw error;
        setMsg('Producto creado');
      }

      setShow(false);
      await fetchData(0, q);
      setPage(0);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (p) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    const { error } = await supabase.from('productos').delete().eq('id', p.id).eq('usuario_id', isAdmin ? p.usuario_id ?? user.id : user.id);
    if (error) setErr(error.message);
    else {
      setMsg('Producto eliminado');
      await fetchData(page, q);
    }
  };

  // ===== Subir portada a Storage =====
  const subirPortada = async (file) => {
    if (!file || !user) return;
    try {
      const path = `${user.id}/${Date.now()}_${file.name}`.replace(/\s+/g, '_');
      const { data, error } = await supabase.storage.from('productos').upload(path, file);
      if (error) throw error;
      const { data: pub } = supabase.storage.from('productos').getPublicUrl(data.path);
      setForm((f) => ({ ...f, imagen_portada_url: pub.publicUrl }));
    } catch (e) {
      setErr(e.message);
    }
  };

  // ===== Toggles =====
  async function toggleField(id, field, value) {
    // Mantén 'Publicado' igual para todos (RLS limita a dueño; admin puede todo)
    const { error } = await supabase.from('productos').update({ [field]: value }).eq('id', id);
    if (error) {
      alert(error.message);
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === id ? { ...x, [field]: value } : x)));
  }

  // Solo admin puede modificar "destacado"
  async function adminToggleDestacado(prod, value) {
    // Opción A: update directo (si tu RLS/trigger ya valida admin)
    const { error } = await supabase.from('productos').update({ destacado: value }).eq('id', prod.id);

    // Opción B (recomendada): usar RPC que solo permite a admin
    // const { error } = await supabase.rpc('admin_set_destacado', { p_id: prod.id, p_value: value });

    if (error) {
      alert(error.message);
      return;
    }
    setItems((prev) => prev.map((x) => (x.id === prod.id ? { ...x, destacado: value } : x)));
  }

  const header = useMemo(() => (isAdmin ? 'Todos los productos' : 'Mis productos'), [isAdmin]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h4 className="mb-0">{header}</h4>
        <div className="d-flex align-items-center" style={{ gap: 8 }}>
          <InputGroup>
            <Form.Control
              placeholder="Buscar por nombre…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 260 }}
            />
          </InputGroup>
          <Button onClick={nuevo}>Nuevo producto</Button>
        </div>
      </div>

      {msg && <Alert variant="success">{msg}</Alert>}
      {err && <Alert variant="danger">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Table responsive bordered hover>
            <thead>
              <tr>
                <th style={{ width: 96 }}>Portada</th>
                <th>Nombre</th>
                <th style={{ width: 120 }}>Precio</th>
                <th style={{ width: 100 }}>Stock</th>
                <th style={{ width: 110 }}>Publicado</th>
                <th style={{ width: 110 }}>Destacado</th>
                <th style={{ width: 220 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.imagen_portada_url ? (
                      <img
                        src={p.imagen_portada_url}
                        alt=""
                        style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }}
                      />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{p.nombre}</td>
                  <td>Bs {Number(p.precio).toFixed(2)}</td>
                  <td>{p.stock ?? 0}</td>
                  <td>
                    <Form.Check
                      type="switch"
                      id={`pub-${p.id}`}
                      checked={!!p.publicado}
                      onChange={(e) => toggleField(p.id, 'publicado', e.target.checked)}
                      label=""
                    />
                  </td>
                  <td>
                    {isAdmin ? (
                      <Form.Check
                        type="switch"
                        id={`des-${p.id}`}
                        checked={!!p.destacado}
                        onChange={(e) => adminToggleDestacado(p, e.target.checked)}
                        label=""
                      />
                    ) : (
                      <Form.Check type="switch" checked={!!p.destacado} disabled readOnly label="" />
                    )}
                  </td>
                  <td className="d-flex gap-2">
                    <Button size="sm" variant="outline-secondary" onClick={() => editar(p)}>
                      Editar
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => eliminar(p)}>
                      Eliminar
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-muted">
                    {q.trim() ? 'Sin resultados.' : 'Aún no tienes productos'}
                  </td>
                </tr>
              )}
            </tbody>
          </Table>

          {/* Paginación */}
          <div className="d-flex align-items-center justify-content-between">
            <div className="text-muted small">
              {total > 0
                ? `Mostrando ${page * pageSize + 1}–${Math.min((page + 1) * pageSize, total)} de ${total}`
                : 'Sin registros'}
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Anterior
              </Button>
              <Button
                variant="outline-secondary"
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Modal Crear/Editar */}
      <Modal show={show} onHide={() => setShow(false)} size="lg">
        <Form onSubmit={guardar}>
          <Modal.Header closeButton>
            <Modal.Title>{form.id ? 'Editar' : 'Nuevo'} producto</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {err && <Alert variant="danger">{err}</Alert>}
            <Row className="g-2">
              <Col md={8}>
                <Form.Group className="mb-2">
                  <Form.Label>Nombre</Form.Label>
                  <Form.Control name="nombre" value={form.nombre} onChange={onChange} required />
                </Form.Group>
                <Form.Group className="mb-2">
                  <Form.Label>Descripción</Form.Label>
                  <Form.Control as="textarea" rows={4} name="descripcion" value={form.descripcion} onChange={onChange} />
                </Form.Group>
                <Row className="g-2">
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Precio (Bs)</Form.Label>
                      <Form.Control
                        type="number"
                        step="0.01"
                        name="precio"
                        value={form.precio}
                        onChange={onChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Stock</Form.Label>
                      <Form.Control type="number" name="stock" value={form.stock} onChange={onChange} />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group className="mb-2">
                      <Form.Label>Categoría</Form.Label>
                      <Form.Select name="categoria_id" value={form.categoria_id || ''} onChange={onChange}>
                        <option value="">(sin categoría)</option>
                        {cats.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                <Row className="g-2">
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="publicado"
                      name="publicado"
                      label="Publicado"
                      checked={!!form.publicado}
                      onChange={onCheck}
                    />
                  </Col>
                  <Col md={6}>
                    <Form.Check
                      type="switch"
                      id="destacado"
                      name="destacado"
                      label="Destacado"
                      checked={!!form.destacado}
                      onChange={onCheck}
                      disabled={!isAdmin} // <- productores no pueden editar aquí tampoco
                      readOnly={!isAdmin}
                    />
                  </Col>
                </Row>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-2">
                  <Form.Label>Portada</Form.Label>
                  <Form.Control type="file" accept="image/*" onChange={(e) => subirPortada(e.target.files?.[0])} />
                </Form.Group>
                {form.imagen_portada_url && <img src={form.imagen_portada_url} alt="" className="img-fluid rounded" />}
              </Col>
            </Row>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShow(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : 'Guardar'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
