import { useWindowDimensions, PixelRatio } from "react-native";

export type ScreenSize = "small" | "medium" | "large";

const BREAKPOINTS = {
  small: 375,
  medium: 414,
  large: 428,
};

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  
  const screenSize: ScreenSize = 
    width < BREAKPOINTS.small ? "small" :
    width < BREAKPOINTS.medium ? "medium" : "large";
  
  const isSmallScreen = screenSize === "small";
  const isLargeScreen = screenSize === "large";
  
  const scale = (size: number): number => {
    const baseWidth = 375;
    const scaleFactor = width / baseWidth;
    const clampedScale = Math.max(0.85, Math.min(1.15, scaleFactor));
    return Math.round(size * clampedScale);
  };
  
  const moderateScale = (size: number, factor: number = 0.5): number => {
    const baseWidth = 375;
    const scaleFactor = width / baseWidth;
    return Math.round(size + (size * (scaleFactor - 1) * factor));
  };
  
  const verticalScale = (size: number): number => {
    const baseHeight = 812;
    const scaleFactor = height / baseHeight;
    const clampedScale = Math.max(0.85, Math.min(1.15, scaleFactor));
    return Math.round(size * clampedScale);
  };
  
  const fontScale = (size: number): number => {
    const fontScaleFactor = PixelRatio.getFontScale();
    const scaledSize = moderateScale(size, 0.3);
    return Math.round(scaledSize / fontScaleFactor);
  };
  
  const wp = (percentage: number): number => {
    return Math.round((width * percentage) / 100);
  };
  
  const hp = (percentage: number): number => {
    return Math.round((height * percentage) / 100);
  };
  
  const maxWidth = (maxPx: number): number => {
    return Math.min(width - 40, maxPx);
  };
  
  return {
    width,
    height,
    screenSize,
    isSmallScreen,
    isLargeScreen,
    scale,
    moderateScale,
    verticalScale,
    fontScale,
    wp,
    hp,
    maxWidth,
  };
}

export function getResponsiveSpacing(screenSize: ScreenSize) {
  const multiplier = screenSize === "small" ? 0.85 : screenSize === "large" ? 1.1 : 1;
  
  return {
    xs: Math.round(4 * multiplier),
    sm: Math.round(8 * multiplier),
    md: Math.round(12 * multiplier),
    lg: Math.round(16 * multiplier),
    xl: Math.round(20 * multiplier),
    "2xl": Math.round(24 * multiplier),
    "3xl": Math.round(32 * multiplier),
    "4xl": Math.round(40 * multiplier),
    "5xl": Math.round(48 * multiplier),
    inputHeight: screenSize === "small" ? 44 : 48,
    buttonHeight: screenSize === "small" ? 48 : 52,
  };
}

export function getResponsiveTypography(screenSize: ScreenSize) {
  const multiplier = screenSize === "small" ? 0.9 : screenSize === "large" ? 1.05 : 1;
  
  return {
    h1: {
      fontSize: Math.round(28 * multiplier),
      fontWeight: "700" as const,
      lineHeight: Math.round(36 * multiplier),
    },
    h2: {
      fontSize: Math.round(24 * multiplier),
      fontWeight: "700" as const,
      lineHeight: Math.round(32 * multiplier),
    },
    h3: {
      fontSize: Math.round(20 * multiplier),
      fontWeight: "600" as const,
      lineHeight: Math.round(28 * multiplier),
    },
    h4: {
      fontSize: Math.round(18 * multiplier),
      fontWeight: "600" as const,
      lineHeight: Math.round(24 * multiplier),
    },
    body: {
      fontSize: Math.round(16 * multiplier),
      fontWeight: "400" as const,
      lineHeight: Math.round(24 * multiplier),
    },
    small: {
      fontSize: Math.round(14 * multiplier),
      fontWeight: "400" as const,
      lineHeight: Math.round(20 * multiplier),
    },
    caption: {
      fontSize: Math.round(12 * multiplier),
      fontWeight: "500" as const,
      lineHeight: Math.round(16 * multiplier),
    },
    link: {
      fontSize: Math.round(16 * multiplier),
      fontWeight: "500" as const,
      lineHeight: Math.round(24 * multiplier),
    },
  };
}
