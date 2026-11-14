import { useWindowDimensions } from 'react-native';

// One set of breakpoints also handles tablets in landscape and split-screen.
export function useLayout() {
  const { width, height, fontScale } = useWindowDimensions();
  const fullSidebar = width >= 1200;
  const hasSidebar = width >= 768;
  const sidebarWidth = fullSidebar ? 224 : hasSidebar ? 88 : 0;
  const pagePadding = width < 600 ? 16 : fullSidebar ? 32 : 24;
  const contentWidth = Math.max(0, Math.min(width - sidebarWidth, 1600) - pagePadding * 2);
  return {
    width,
    height,
    fontScale,
    fullSidebar,
    hasSidebar,
    sidebarWidth,
    pagePadding,
    contentWidth,
    isPhone: width < 600,
    isTablet: width >= 600 && width < 1200,
    shortScreen: height < 600,
  };
}
