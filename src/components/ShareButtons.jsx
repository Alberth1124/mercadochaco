import { ButtonGroup, Button } from "react-bootstrap";
import { FaWhatsapp, FaFacebook, FaTwitter, FaLink } from "react-icons/fa";

export default function ShareButtons({ url, text }){
  const shareNative = async ()=>{
    try{
      if (navigator.share) await navigator.share({ title: text, text, url });
      else copy();
    }catch{}
  };
  const copy = async ()=>{
    try{ await navigator.clipboard.writeText(url); alert("Enlace copiado"); }catch(e){ console.log(e); }
  };
  const w = `https://wa.me/?text=${encodeURIComponent(text+" "+url)}`;
  const f = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const t = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  return (
    <ButtonGroup>
      <Button size="sm" variant="success" onClick={shareNative}>Compartir</Button>
      <Button size="sm" variant="outline-success" as="a" href={w} target="_blank"><FaWhatsapp/></Button>
      <Button size="sm" variant="outline-primary" as="a" href={f} target="_blank"><FaFacebook/></Button>
      <Button size="sm" variant="outline-dark" as="a" href={t} target="_blank"><FaTwitter/></Button>
      <Button size="sm" variant="outline-secondary" onClick={copy}><FaLink/></Button>
    </ButtonGroup>
  );
}
