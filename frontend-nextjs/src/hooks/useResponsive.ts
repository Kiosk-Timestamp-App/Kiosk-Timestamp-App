import { useState, useEffect } from 'react';

interface BreakpointState {
  isTV: boolean;
  isKiosk: boolean;
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  isPortrait: boolean;
  isLandscape: boolean;
  pixelRatio: number;
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (): BreakpointState => {
  const [state, setState] = useState<BreakpointState>({
    isTV: false,
    isKiosk: false,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1080,
    screenHeight: typeof window !== 'undefined' ? window.innerHeight : 1920,
    aspectRatio: 1,
    isPortrait: false,
    isLandscape: true,
    pixelRatio: 1,
    orientation: 'landscape',
  });

  useEffect(() => {
    const updateState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const aspectRatio = width / height;
      const isPortrait = height > width || aspectRatio < 1;
      const isLandscape = width >= height && aspectRatio >= 1;
      const pixelRatio = window.devicePixelRatio || 1;

      setState({
        isTV: width >= 1920,
        isKiosk: (width >= 768 && width <= 2160 && isPortrait) || (width >= 768 && width <= 1920 && aspectRatio <= 0.8),
        screenWidth: width,
        screenHeight: height,
        aspectRatio,
        isPortrait,
        isLandscape,
        pixelRatio,
        orientation: isPortrait ? 'portrait' : 'landscape',
      });
    };

    updateState();
    window.addEventListener('resize', updateState);
    window.addEventListener('orientationchange', updateState);

    return () => {
      window.removeEventListener('resize', updateState);
      window.removeEventListener('orientationchange', updateState);
    };
  }, []);

  return state;
};

export const useTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        ((navigator as Navigator & { msMaxTouchPoints?: number }).msMaxTouchPoints ?? 0) > 0
      );
    };

    checkTouch();
    window.addEventListener('touchstart', checkTouch);
    return () => window.removeEventListener('touchstart', checkTouch);
  }, []);

  return isTouch;
};

export const useOptimalDisplayMode = () => {
  const responsive = useResponsive();
  const isTouch = useTouch();

  const getOptimalMode = (): 'kiosk' | 'tv' => {
    if (responsive.isTV && responsive.isLandscape) return 'tv';
    if (responsive.isKiosk && (isTouch || responsive.isPortrait)) return 'kiosk';
    return 'kiosk';
  };

  return {
    optimalMode: getOptimalMode(),
    ...responsive,
    isTouch,
  };
};

export default useResponsive;