import { useEffect, useState } from "react";

export default function ThemeToggle(){
  const [mode, setMode] = useState(localStorage.getItem('theme') || 'light');

  useEffect(()=>{
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('theme', mode);
  },[mode]);

  return (
    <button className="btn btn-sm btn-outline-light ms-2" onClick={()=>setMode(m=> m==='light' ? 'dark' : 'light')}>
      {mode==='light' ? '🌙' : '☀️'}
    </button>
  );
}
