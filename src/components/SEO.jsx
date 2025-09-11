import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, image, url }) {
  const t = title ? `${title} | Mercado Chaco` : 'Mercado Chaco';
  const d = description || 'Compra productos del Chaco boliviano, directo del productor.';
  const img = image || '/icons/icon-512.png';
  const u = url || (typeof window !== 'undefined' ? window.location.href : '/');
  return (
    <Helmet>
      <title>{t}</title>
      <meta name="description" content={d} />
      <meta property="og:title" content={t} />
      <meta property="og:description" content={d} />
      <meta property="og:image" content={img} />
      <meta property="og:url" content={u} />
      <meta name="twitter:card" content="summary_large_image" />
    </Helmet>
  );
}
