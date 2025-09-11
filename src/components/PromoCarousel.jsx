import { useEffect, useMemo, useState } from "react";
import { Carousel, Card } from "react-bootstrap";
import { supabase } from "../supabaseClient";

/**
 * props:
 *  - bucket?: string   (si existe, carga imágenes públicas del bucket)
 *  - images?: string[] (fallback/local)
 *  - title?: string
 */
export default function CardCarousel({ bucket="colaboradores", images=[], title="Nuestros Colaboradores" }){
  const [urls, setUrls] = useState([]);

  useEffect(()=>{
    (async ()=>{
      try{
        const { data, error } = await supabase.storage.from(bucket).list("", { limit:100 });
        if (!error && data?.length){
          const arr = data.filter(o=>!o.name.endsWith("/"))
            .map(o => supabase.storage.from(bucket).getPublicUrl(o.name).data.publicUrl);
          setUrls(arr);
          return;
        }
      }catch{}
      setUrls(images.length? images : [
         
        "/icons/reportechaco.jpg",
        "/icons/TARIJA200.jpg",
        "/icons/chacoeterno.png",
        "/icons/chaco.jpg",
        "/icons/caigua.png",            
        "/icons/gota.jpg",
        "/icons/emanuel.png",
        "/icons/reportechaco1.jpg",
         "/icons/TARIJA2001.jpg"
      ]);
    })();
  },[bucket, images]);

  const slides = useMemo(()=>{
    const chunk = 4; // 3 tarjetas por slide
    const out = [];
    for (let i=0;i<urls.length;i+=chunk) out.push(urls.slice(i,i+chunk));
    return out;
  },[urls]);

  if (!urls.length) return null;

  return (
    <div className="mb-3">
      <h6 className="mb-2"><span style={{color:'var(--mc-green-600)'}}>●</span> {title}</h6>
      <Carousel variant="dark" indicators={slides.length>1} interval={4000}>
        {slides.map((group,idx)=>(
          <Carousel.Item key={idx}>
            <div className="d-flex gap-3 justify-content-center py-3 flex-wrap">
              {group.map((src,i)=>(
                <Card key={i} style={{width:260, border:'1px solid #e7f0ea', borderRadius:12, boxShadow:'0 6px 18px rgba(18,82,34,.08)'}}>
                  <div className="p-3 d-flex align-items-center justify-content-center" style={{height:160}}>
                    <img src={src} alt={`logo-${i}`} style={{maxWidth:'90%', maxHeight:'140px', objectFit:'contain'}} />
                  </div>
                </Card>
              ))}
            </div>
          </Carousel.Item>
        ))}
      </Carousel>
    </div>
  );
}
