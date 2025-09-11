import { useEffect, useState } from 'react';
import { Table, Button, Badge, Alert, Spinner, Modal } from 'react-bootstrap';
import { supabase } from '../supabaseClient';

export default function AdminSolicitudes() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null); // {title,url}
  const [actioning, setActioning] = useState(null); // id de solicitud en proceso

  const sign = async (path) => {
    if (!path) return null;
    const { data, error } = await supabase
      .storage
      .from('identidades')
      .createSignedUrl(path, 900); // 15 minutos
    if (error) return null;
    return data.signedUrl;
  };

  const cargar = async () => {
    setLoading(true); setErr(null); setMsg(null);
    const { data, error } = await supabase
      .from('productores_solicitudes')
      .select('*')
      .order('creado_en', { ascending: false });

    if (error) {
      setErr(error.message);
      setLoading(false);
      return;
    }

    const withUrls = await Promise.all((data || []).map(async (r) => ({
      ...r,
      url_frente: await sign(r.documento_frente_path),
      url_reverso: await sign(r.documento_reverso_path),
      url_selfie: await sign(r.selfie_path),
      url_cred: await sign(r.credencial_path),
    })));

    setItems(withUrls);
    setLoading(false);
  };

  useEffect(() => { cargar(); }, []);

  const aprobar = async (row) => {
    setMsg(null); setErr(null);

    // Validación previa para no romper con NOT NULL en productores
    if (!row.ci || !row.telefono) {
      setErr('No se puede aprobar: falta CI y/o teléfono en la solicitud.');
      return;
    }

    try {
      setActioning(row.id);

      // upsert productor (evita 409 y respeta únicos por usuario_id)
      const { error: e1 } = await supabase.from('productores').upsert({
        usuario_id: row.usuario_id,
        nombres: row.nombres,
        apellidos: row.apellidos,
        ci: row.ci,
        telefono: row.telefono,
        pais: row.pais,
        departamento: row.departamento,
        municipio: row.municipio,
        comunidad: row.comunidad,
        actividad: row.actividad
      }, { onConflict: 'usuario_id' });
      if (e1) throw e1;

      // cambiar rol en perfiles
      const { error: e2 } = await supabase
        .from('perfiles')
        .update({ rol: 'productor' })
        .eq('id', row.usuario_id);
      if (e2) throw e2;

      // estado solicitud
      const { error: e3 } = await supabase
        .from('productores_solicitudes')
        .update({ estado: 'aprobado' })
        .eq('id', row.id);
      if (e3) throw e3;

      setMsg('Solicitud aprobada.');
      await cargar();
    } catch (e) {
      setErr(e.message || 'Error al aprobar la solicitud.');
    } finally {
      setActioning(null);
    }
  };

  const rechazar = async (row) => {
    setMsg(null); setErr(null);
    try {
      setActioning(row.id);
      const { error } = await supabase
        .from('productores_solicitudes')
        .update({ estado: 'rechazado' })
        .eq('id', row.id);
      if (error) throw error;
      setMsg('Solicitud rechazada.');
      await cargar();
    } catch (e) {
      setErr(e.message || 'Error al rechazar la solicitud.');
    } finally {
      setActioning(null);
    }
  };

  const color = (estado) =>
    estado === 'pendiente' ? 'warning' :
    estado === 'aprobado'  ? 'success'  : 'danger';

  return (
    <div>
      <h4>Solicitudes de Productor</h4>
      {msg && <Alert variant="success" className="mt-2">{msg}</Alert>}
      {err && <Alert variant="danger" className="mt-2">{err}</Alert>}

      {loading ? (
        <div className="text-center py-5"><Spinner animation="border" /></div>
      ) : (
        <Table responsive bordered hover className="mt-3 align-middle">
          <thead>
            <tr>
              <th>Persona</th>
              <th>Contacto</th>
              <th>Ubicación</th>
              <th>Actividad</th>
              <th>Documentos</th>
              <th>Estado</th>
              <th style={{minWidth:180}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>
                  <div className="fw-semibold">{row.nombres} {row.apellidos}</div>
                  <div><small className="text-muted">CI: {row.ci || '—'}</small></div>
                </td>

                <td>
                  <small>📞 {row.telefono || '—'}</small>
                </td>

                <td>
                  <small>
                    {row.pais} — {row.departamento} — {row.municipio} — {row.comunidad}
                  </small>
                </td>

                <td><small>{row.actividad}</small></td>

                <td style={{ minWidth: 260 }}>
                  <div className="d-flex gap-2 flex-wrap">
                    {row.url_frente && (
                      <img
                        src={row.url_frente}
                        alt="Frente"
                        className="img-thumbnail"
                        style={{ width: 64, cursor: 'zoom-in' }}
                        onClick={() => setViewer({ title: 'Carnet (frente)', url: row.url_frente })}
                      />
                    )}
                    {row.url_reverso && (
                      <img
                        src={row.url_reverso}
                        alt="Reverso"
                        className="img-thumbnail"
                        style={{ width: 64, cursor: 'zoom-in' }}
                        onClick={() => setViewer({ title: 'Carnet (reverso)', url: row.url_reverso })}
                      />
                    )}
                    {row.url_cred && (
                      <img
                        src={row.url_cred}
                        alt="Credencial"
                        className="img-thumbnail"
                        style={{ width: 64, cursor: 'zoom-in' }}
                        onClick={() => setViewer({ title: 'Credencial', url: row.url_cred })}
                      />
                    )}
                    {row.url_selfie && (
                      <img
                        src={row.url_selfie}
                        alt="Selfie"
                        className="img-thumbnail"
                        style={{ width: 64, cursor: 'zoom-in' }}
                        onClick={() => setViewer({ title: 'Selfie', url: row.url_selfie })}
                      />
                    )}
                  </div>
                </td>

                <td><Badge bg={color(row.estado)}>{row.estado}</Badge></td>

                <td className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={row.estado !== 'pendiente' || actioning === row.id}
                    onClick={() => aprobar(row)}
                  >
                    {actioning === row.id ? 'Procesando…' : 'Aprobar'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    disabled={row.estado !== 'pendiente' || actioning === row.id}
                    onClick={() => rechazar(row)}
                  >
                    Rechazar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal show={!!viewer} onHide={() => setViewer(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{viewer?.title}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {viewer?.url && <img src={viewer.url} alt={viewer.title} className="img-fluid" />}
        </Modal.Body>
      </Modal>
    </div>
  );
}
