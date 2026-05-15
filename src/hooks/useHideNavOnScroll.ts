import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useHideNavOnScroll(threshold = 15) {
  const lastScrollY = useRef(0);
  const setNavVisible = useAppStore(state => state.setNavVisible);

  const onScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const currentScrollY = e.currentTarget.scrollTop;
    
    // Ignore bounce scrolling at the top
    if (currentScrollY <= 0) {
      setNavVisible(true);
      lastScrollY.current = currentScrollY;
      return;
    }

    // Ignore bounce scrolling at the bottom
    const maxScroll = e.currentTarget.scrollHeight - e.currentTarget.clientHeight;
    if (currentScrollY >= maxScroll) {
      return;
    }
    
    // If we scroll down past threshold, hide
    if (currentScrollY > lastScrollY.current + threshold) {
      setNavVisible(false);
      lastScrollY.current = currentScrollY;
    } 
    // If we scroll up past threshold, show
    else if (currentScrollY < lastScrollY.current - threshold) {
      setNavVisible(true);
      lastScrollY.current = currentScrollY;
    }
  }, [threshold, setNavVisible]);

  // Always show nav when component unmounts
  useEffect(() => {
    return () => {
      setNavVisible(true);
    };
  }, [setNavVisible]);

  return { onScroll };
}
