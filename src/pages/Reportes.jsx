// src/pages/Reportes.jsx
import { useEffect, useMemo, useState } from 'react';
import { Row, Col, Card, Form, Spinner, Badge, Button } from 'react-bootstrap';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';

// PDF libs (solo usaremos jsPDF + autoTable; sin capturas de gráficas)
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reportes(){
  const { perfil, user } = useAuth();
  const [desde, setDesde]   = useState(dayjs().subtract(30,'day').format('YYYY-MM-DD'));
  const [hasta, setHasta]   = useState(dayjs().format('YYYY-MM-DD'));
  const [cargando, setCargando] = useState(true);
  const [serie, setSerie]   = useState([]);  // [{fecha, total, pedidos?}]
  const [top, setTop]       = useState([]);  // [{producto_id, nombre, cantidad_total, total}]

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
        const { data: v, error } = await supabase
          .from('v_productor_reportes_ventas')
          .select('*')
          .eq('productor_id', user.id)
          .gte('fecha', desde)
          .lte('fecha', hasta)
          .order('fecha', { ascending: true });
        if (error) throw error;

        const aggByDay = {};
        for (const r of v || []) {
          const key = String(r.fecha).slice(0,10);
          if (!aggByDay[key]) aggByDay[key] = { fecha: key, total: 0, pedidos: null };
          aggByDay[key].total += Number(r.monto || 0);
        }
        setSerie(Object.values(aggByDay).sort((a,b)=> a.fecha.localeCompare(b.fecha)));

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

  // ---------- Exportar a PDF (sin gráficas; solo detalle y total) ----------
  async function exportarPDF(){
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const margin = 12;
    const pageW  = doc.internal.pageSize.getWidth();
    let y = margin;

    const rango  = `${dayjs(desde).format('DD/MM/YYYY')} – ${dayjs(hasta).format('DD/MM/YYYY')}`;
    const rolTxt = soyAdmin ? 'Administrador' : soyProductor ? 'Productor' : 'Usuario';

    // 1) Traer detalle por producto para el PDF (según rol)
    let detalle = [];
    try {
      if (soyAdmin) {
        const { data, error } = await supabase.rpc('reporte_top_productos', {
          p_desde: desde, p_hasta: hasta, p_limite: 1000
        });
        if (error) throw error;
        detalle = (data || []).map(r => ({
          nombre: r.nombre,
          cantidad_total: Number(r.cantidad_total || 0),
          total: Number(r.total || 0)
        }));
      } else if (soyProductor) {
        const { data, error } = await supabase
          .from('v_productor_reportes_ventas')
          .select('producto_id, producto_nombre, cantidad, monto, fecha')
          .eq('productor_id', user.id)
          .gte('fecha', desde)
          .lte('fecha', hasta);
        if (error) throw error;

        const agg = new Map();
        for (const r of (data || [])) {
          const k = r.producto_id;
          const prev = agg.get(k) || { nombre: r.producto_nombre, cantidad_total: 0, total: 0 };
          prev.cantidad_total += Number(r.cantidad || 0);
          prev.total          += Number(r.monto || 0);
          agg.set(k, prev);
        }
        detalle = Array.from(agg.values()).sort((a,b)=> b.total - a.total);
      } else {
        detalle = [];
      }
    } catch (e) {
      // Respaldo: usar lo que ya está en "top" (si existe)
      detalle = (top || []).map(t => ({
        nombre: t.nombre, cantidad_total: Number(t.cantidad_total || 0), total: Number(t.total || 0)
      }));
    }

    const totalPDF = detalle.reduce((a, r) => a + Number(r.total || 0), 0);

    // 2) Encabezado
    doc.setFont('helvetica','bold'); doc.setFontSize(16);
    doc.text('Reporte de Ventas', margin, y); y += 8;

    doc.setFont('helvetica','normal'); doc.setFontSize(11);
    doc.text(`Rango: ${rango}`, margin, y);
    doc.text(`Perfil: ${rolTxt}`, pageW/2, y); y += 7;

    // KPI Total (consistente con lo calculado para el PDF)
    doc.setFontSize(12);
    doc.setFont('helvetica','bold');
    doc.text(`Ventas (Bs):`, margin, y);
    doc.setFont('helvetica','normal');
    doc.text(`Bs ${Number(totalPDF).toFixed(2)}`, margin + 32, y);
    y += 10;

    // 3) Tabla de detalle por producto (Producto, Cantidad, Total)
    autoTable(doc, {
      startY: y,
      head: [['Producto', 'Cantidad', 'Total (Bs)']],
      body: detalle.map(d => [
        d.nombre || '',
        Number(d.cantidad_total || 0),
        Number(d.total || 0).toFixed(2)
      ]),
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [230,230,230] },
      columnStyles: {
        0: { cellWidth: pageW - margin*2 - 50 }, // Producto
        1: { cellWidth: 25, halign: 'right' },   // Cantidad
        2: { cellWidth: 25, halign: 'right' }    // Total
      },
      margin: { left: margin, right: margin }
    });

    // 4) Guardar
    const fname = `reporte-ventas_${dayjs(desde).format('YYYYMMDD')}-${dayjs(hasta).format('YYYYMMDD')}.pdf`;
    doc.save(fname);
  }

  return (
    <div>
      <h4>Reportes {soyAdmin ? '— Administrador' : soyProductor ? '— Productor' : ''}</h4>

      <Row className="g-2 mb-3 align-items-end">
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
        <Col md="auto">
          <Button variant="primary" onClick={exportarPDF} disabled={cargando}>
            {cargando ? 'Preparando…' : 'Descargar Reportes'}
          </Button>
        </Col>
      </Row>

      {cargando ? (
        <div className="text-center py-5"><Spinner animation="border"/></div>
      ) : (
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
      )}
    </div>
  );
}
