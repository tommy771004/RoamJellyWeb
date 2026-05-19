import { useState, useEffect } from 'react';

export function useKeyboardHeight(): number {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Only active on mobile breakpoints
    if (window.innerWidth >= 768) return;

    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // Math.max avoids negative values if height exceeds innherHeight
      const h = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(h);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('scroll', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('scroll', update);
    };
  }, []);

  return keyboardHeight;
}

export function useVisualViewport(): { height: number; offsetTop: number; width: number } {
  const [vvContent, setVvContent] = useState({ 
    height: typeof window !== 'undefined' ? window.innerHeight : 0, 
    offsetTop: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;
    
    // We update eagerly before any events might fire
    const update = () => {
      setVvContent({
        height: vv.height,
        offsetTop: vv.offsetTop,
        width: vv.width
      });
      // also write to css variable for pure css fixes
      document.documentElement.style.setProperty('--vv-height', `${vv.height}px`);
      document.documentElement.style.setProperty('--vv-offset-top', `${vv.offsetTop}px`);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    update();

    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return vvContent;
}

