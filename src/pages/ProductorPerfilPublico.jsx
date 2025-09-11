import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Row, Col, Card, Spinner, Badge, Button } from 'react-bootstrap';

export default function ProductorPerfilPublico(){
  const { uid } = useParams();
  const [prod, setProd] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    (async ()=>{
      setLoading(true);
      const { data: perfil } = await supabase.from('perfiles').select('nombres, apellidos, avatar_url').eq('id', uid).single();
      const { data: datos } = await supabase.from('productores')
        .select('pais, departamento, municipio, comunidad, actividad')
        .eq('id', uid).single();
      const { data: prods } = await supabase.from('productos')
        .select('*').eq('usuario_id', uid).eq('publicado', true).order('creado_en', { ascending:false });
      setProd({ ...(perfil||{}), ...(datos||{}) });
      setItems(prods||[]);
      setLoading(false);
    })();
  }, [uid]);

  if (loading) return <div className="text-center py-5"><Spinner animation="border"/></div>;
  if (!prod) return <div className="text-center text-muted py-5">Productor no encontrado</div>;

  return (
    <div>
      <Card className="p-4 mb-3">
        <div className="d-flex gap-3 align-items-center">
          {prod.avatar_url && <img loading="lazy" src={url} alt="..."  style={{width:72,height:72,objectFit:'cover',borderRadius:'50%'}}/>}
          <div>
            <h4 className="mb-1">{prod.nombres} {prod.apellidos}</h4>
            <div className="text-muted">{prod.pais} · {prod.departamento} · {prod.municipio} · {prod.comunidad}</div>
            {prod.actividad && <div className="small">{prod.actividad}</div>}
          </div>
        </div>
      </Card>

      <h5 className="mb-3">Productos de este productor</h5>
      <Row xs={1} sm={2} md={3} lg={4} className="g-3">
        {items.map(p=>(
          <Col key={p.id}>
            <Card className="h-100">
              {p.imagen_portada_url && <Card.Img loading="lazy" variant="top" src={p.imagen_portada_url} style={{objectFit:'cover', height:200}}/>}
              <Card.Body className="d-flex flex-column">
                <Card.Title className="mb-1" style={{fontSize:'1.05rem'}}>
                  <Link to={`/producto/${p.id}`} style={{textDecoration:'none'}}>{p.nombre}</Link>
                </Card.Title>
                <Card.Text className="text-muted small flex-grow-1">{p.descripcion?.slice(0,120)}</Card.Text>
                <div className="d-flex justify-content-between align-items-center">
                  <strong>Bs {Number(p.precio).toFixed(2)}</strong>
                  <Badge bg={p.stock>0?'success':'secondary'}>{p.stock>0?'Disponible':'Sin stock'}</Badge>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
        {items.length===0 && <div className="text-muted text-center">Este productor aún no publicó productos.</div>}
      </Row>
    </div>
  );
}
