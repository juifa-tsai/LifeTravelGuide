import { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';

export function BackToTop() {
  const [visible,setVisible] = useState(() => window.scrollY > 320);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 320);
    window.addEventListener('scroll',update,{passive:true});
    update();
    return () => window.removeEventListener('scroll',update);
  },[]);
  if (!visible) return null;
  return <button type="button" className="back-to-top" aria-label="回到頂端" title="回到頂端" onClick={() => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})}><ArrowUp size={23} aria-hidden="true" /></button>;
}
