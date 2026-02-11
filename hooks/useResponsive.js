/**
 * Talisay AI — Responsive Hook
 * Returns breakpoint info and responsive sizing.
 */
import { useState, useEffect, useMemo } from 'react';
import { Dimensions, Platform } from 'react-native';
import { Layout } from '../constants/Layout';

export function useResponsive() {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));

  useEffect(() => {
    const sub = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    return () => sub?.remove?.();
  }, []);

  const info = useMemo(() => {
    const { width, height } = dimensions;
    const isMobile = width < Layout.mobileBreakpoint;
    const isTablet = width >= Layout.mobileBreakpoint && width < Layout.tabletBreakpoint;
    const isDesktop = width >= Layout.tabletBreakpoint;
    const isWideDesktop = width >= Layout.desktopBreakpoint;
    const isWeb = Platform.OS === 'web';

    return {
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      isWideDesktop,
      isWeb,
      // Helper to pick values per breakpoint
      responsive: (mobile, tablet, desktop) => {
        if (isDesktop) return desktop ?? tablet ?? mobile;
        if (isTablet) return tablet ?? mobile;
        return mobile;
      },
      // Content width with max constraint
      contentWidth: Math.min(width, Layout.maxContentWidth),
      // Number of columns for grid layouts
      columns: isDesktop ? (isWideDesktop ? 4 : 3) : (isTablet ? 2 : 1),
    };
  }, [dimensions]);

  return info;
}

export default useResponsive;
