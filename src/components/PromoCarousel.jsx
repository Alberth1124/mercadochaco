import { useEffect, useMemo, useState } from "react";
import { Carousel, Card } from "react-bootstrap";
import { supabase } from "../supabaseClient";

/** Hook: determina cuántas tarjetas por slide según ancho */
function useCardsPerSlide() {
  const [n, setN] = useState(1);

  useEffect(() => {
    const calc = () => {
      const w = typeof window !== "undefined" ? window.innerWidth : 0;
      // Breakpoints estilo Bootstrap
      // xs <576 => 1, sm >=576 => 2, md >=768 => 3, xl >=1200 => 4
      const val = w < 576 ? 1 : w < 768 ? 2 : w < 1200 ? 3 : 4;
      setN(val);
    };
    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  return n;
}

/**
 * props:
 *  - bucket?: string   (si existe, carga imágenes públicas del bucket)
 *  - images?: string[] (fallback/local)
 *  - title?: string
 */
export default function CardCarousel({
  bucket = "colaboradores",
  images = [],
  title = "Nuestros Colaboradores",
}) {
  const [urls, setUrls] = useState([]);
  const perSlide = useCardsPerSlide();

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.storage.from(bucket).list("", { limit: 100 });
        if (!error && data?.length) {
          const arr = data
            .filter((o) => !o.name.endsWith("/"))
            .map((o) => supabase.storage.from(bucket).getPublicUrl(o.name).data.publicUrl);
          setUrls(arr);
          return;
        }
      } catch {}
      setUrls(
        images.length
          ? images
          : [
              "/icons/reportechaco.jpg",
              "/icons/TARIJA200.jpg",
              "/icons/chacoeterno.png",
              "/icons/chaco.jpg",
              "/icons/caigua.png",
              "/icons/gota.jpg",
              "/icons/emanuel.png",
              "/icons/reportechaco1.jpg",
              "/icons/TARIJA2001.jpg",
            ]
      );
    })();
  }, [bucket, images]);

  const slides = useMemo(() => {
    if (!urls.length) return [];
    const out = [];
    for (let i = 0; i < urls.length; i += perSlide) out.push(urls.slice(i, i + perSlide));
    return out;
  }, [urls, perSlide]);

  if (!urls.length) return null;

  return (
    <div className="mb-3">
      <h6 className="mb-2">
        <span style={{ color: "var(--mc-green-600)" }}>●</span> {title}
      </h6>

      <Carousel
        variant="dark"
        indicators={slides.length > 1}
        interval={4000}
        pause="hover"
        touch
      >
        {slides.map((group, idx) => (
          <Carousel.Item key={idx}>
            <div
              className="d-flex justify-content-center py-3"
              style={{ gap: 12 }}
            >
              {group.map((src, i) => (
                <Card
                  key={i}
                  style={{
                    // cada tarjeta ocupa el % del slide según perSlide
                    flex: `0 0 ${100 / perSlide}%`,
                    maxWidth: `${100 / perSlide}%`,
                    border: "1px solid #e7f0ea",
                    borderRadius: 12,
                    boxShadow: "0 6px 18px rgba(18,82,34,.08)",
                  }}
                >
                  <div
                    className="p-3 d-flex align-items-center justify-content-center"
                    style={{ height: 160 }}
                  >
                    <img
                      src={src}
                      alt={`logo-${i}`}
                      style={{ maxWidth: "90%", maxHeight: 140, objectFit: "contain" }}
                      onError={(e) => (e.currentTarget.style.display = "none")}
                    />
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
