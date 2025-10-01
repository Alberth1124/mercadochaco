import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Spinner, Table, Badge } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

export default function Reportes(){
  const { perfil, user } = useAuth();
  const [desde, setDesde] = useState(dayjs().subtract(30,'day').format('YYYY-MM-DD'));
  const [hasta, setHasta] = useState(dayjs().format('YYYY-MM-DD'));
  const [cargando, setCargando] = useState(true);
  const [serie, setSerie] = useState([]);      // [{fecha, total, pedidos?}]
  const [top, setTop] = useState([]);          // [{producto_id, nombre, cantidad_total, total}]
  const soyAdmin = !!perfil?.es_admin;
  const soyProductor = perfil?.rol === 'productor';

  const cargar = async ()=>{
    setCargando(true);
    try{
      if (soyAdmin){
        const { data: s } = await supabase.rpc('reporte_ventas_global', { p_desde: desde, p_hasta: hasta });
        const { data: t } = await supabase.rpc('reporte_top_productos', { p_desde: desde, p_hasta: hasta, p_limite: 10 });
        setSerie(s||[]); setTop(t||[]);
      } else if (soyProductor){
        // 1) Serie por día desde la vista (solo PAGADO)
        const { data: v, error } = await supabase
          .from('v_productor_reportes_ventas')
          .select('*')
          .eq('productor_id', user.id)                          // 👈 filtro productor
          .gte('fecha', desde)
          .lte('fecha', hasta)
          .order('fecha', { ascending: true });
        if (error) throw error;

        // Agregar por fecha (sum total / cantidad)
        const aggByDay = {};
        for (const r of v || []) {
          const key = String(r.fecha).slice(0,10);
          if (!aggByDay[key]) aggByDay[key] = { fecha: key, total: 0, pedidos: null }; // pedidos opcional
          aggByDay[key].total += Number(r.monto || 0);
        }
        setSerie(Object.values(aggByDay).sort((a,b)=> a.fecha.localeCompare(b.fecha)));

        // 2) Top productos desde la misma vista en el rango
        const aggTop = {};
        for (const r of v || []) {
          const k = r.producto_id;
          if (!aggTop[k]) aggTop[k] = { producto_id: k, nombre: r.producto_nombre, cantidad_total: 0, total: 0 };
          aggTop[k].cantidad_total += Number(r.cantidad || 0);
          aggTop[k].total          += Number(r.monto || 0);
        }
        setTop(Object.values(aggTop).sort((a,b)=> b.total - a.total).slice(0,10));
      } else {
        setSerie([]); setTop([]);
      }
    } finally { setCargando(false); }
  };

  useEffect(()=>{ cargar(); /* eslint-disable react-hooks/exhaustive-deps */}, [desde, hasta, soyAdmin, soyProductor]);

  const kpi = useMemo(()=>{
    const total = serie.reduce((a,b)=> a + Number(b.total||0), 0);
    const pedidos = serie.reduce((a,b)=> a + Number(b.pedidos||0), 0);
    return { total, pedidos };
  }, [serie]);

  return (
    <div>
      <h4>Reportes {soyAdmin ? '— Administrador' : soyProductor ? '— Productor' : ''}</h4>

      <Row className="g-2 mb-3">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Desde</Form.Label>
            <Form.Control type="date" value={desde} onChange={e=>setDesde(e.target.value)} />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Hasta</Form.Label>
            <Form.Control type="date" value={hasta} onChange={e=>setHasta(e.target.value)} />
          </Form.Group>
        </Col>
      </Row>

      {cargando ? <div className="text-center py-5"><Spinner animation="border"/></div> :
      <>
        <Row className="g-3">
          <Col md={4}>
            <Card className="p-3">
              <div className="text-muted">Ventas (Bs)</div>
              <div className="fs-3 fw-bold">Bs {kpi.total.toFixed(2)}</div>
            </Card>
          </Col>
          {soyAdmin && (
            <Col md={4}>
              <Card className="p-3">
                <div className="text-muted">Pedidos pagados</div>
                <div className="fs-3 fw-bold">{kpi.pedidos}</div>
              </Card>
            </Col>
          )}
        </Row>

        <Row className="g-3 mt-1">
          <Col md={8}>
            <Card className="p-3">
              <div className="mb-2 fw-semibold">Ventas por día</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <LineChart data={serie}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="total" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="p-3">
              <div className="mb-2 fw-semibold">Top productos</div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <BarChart data={top}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="total" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="small mt-2">
                {top.slice(0,5).map(t=>(
                  <div key={t.producto_id} className="d-flex justify-content-between">
                    <span className="text-truncate" style={{maxWidth:220}} title={t.nombre}>{t.nombre}</span>
                    <Badge bg="success">Bs {Number(t.total).toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </>
      }
    </div>
  );
}
