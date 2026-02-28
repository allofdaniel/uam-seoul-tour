import { create } from 'zustand';

interface UIState {
  isDarkMode: boolean;
  showMiniMap: boolean;
  showControlHints: boolean;
  controlHintsOpacity: number;
  hudVisible: boolean;
  isMobile: boolean;
  isWebGLSupported: boolean;
  isLoading: boolean;
  loadingProgress: number;

  // Actions
  toggleDarkMode: () => void;
  setShowMiniMap: (show: boolean) => void;
  setShowControlHints: (show: boolean) => void;
  setControlHintsOpacity: (opacity: number) => void;
  setHudVisible: (visible: boolean) => void;
  setIsMobile: (mobile: boolean) => void;
  setIsWebGLSupported: (supported: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  isDarkMode: true,
  showMiniMap: true,
  showControlHints: true,
  controlHintsOpacity: 1,
  hudVisible: false,
  isMobile: false,
  isWebGLSupported: true,
  isLoading: true,
  loadingProgress: 0,

  toggleDarkMode: () => set((s) => ({ isDarkMode: !s.isDarkMode })),
  setShowMiniMap: (show) => set({ showMiniMap: show }),
  setShowControlHints: (show) => set({ showControlHints: show }),
  setControlHintsOpacity: (opacity) => set({ controlHintsOpacity: opacity }),
  setHudVisible: (visible) => set({ hudVisible: visible }),
  setIsMobile: (mobile) => set({ isMobile: mobile }),
  setIsWebGLSupported: (supported) => set({ isWebGLSupported: supported }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setLoadingProgress: (progress) => set({ loadingProgress: Math.min(100, Math.max(0, progress)) }),
}));
