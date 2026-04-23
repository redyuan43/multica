import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { defaultStorage } from "../platform/storage";

export const DEFAULT_UI_FONT_SIZE = 14;
export const DEFAULT_CODE_FONT_SIZE = 13;
export const MIN_FONT_SIZE = 10;
export const MAX_FONT_SIZE = 24;

interface TypographyState {
  uiFontSize: number;
  codeFontSize: number;
  uiFontFamily: string;
  codeFontFamily: string;
  fontSmoothing: boolean;
  setUiFontSize: (size: number) => void;
  setCodeFontSize: (size: number) => void;
  setUiFontFamily: (family: string) => void;
  setCodeFontFamily: (family: string) => void;
  setFontSmoothing: (enabled: boolean) => void;
  resetUiFontSize: () => void;
  resetCodeFontSize: () => void;
}

const clampFontSize = (value: number): number =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(value)));

export const useTypographyStore = create<TypographyState>()(
  persist(
    (set) => ({
      uiFontSize: DEFAULT_UI_FONT_SIZE,
      codeFontSize: DEFAULT_CODE_FONT_SIZE,
      uiFontFamily: "",
      codeFontFamily: "",
      fontSmoothing: false,
      setUiFontSize: (size) => set({ uiFontSize: clampFontSize(size) }),
      setCodeFontSize: (size) => set({ codeFontSize: clampFontSize(size) }),
      setUiFontFamily: (family) => set({ uiFontFamily: family }),
      setCodeFontFamily: (family) => set({ codeFontFamily: family }),
      setFontSmoothing: (enabled) => set({ fontSmoothing: enabled }),
      resetUiFontSize: () => set({ uiFontSize: DEFAULT_UI_FONT_SIZE }),
      resetCodeFontSize: () => set({ codeFontSize: DEFAULT_CODE_FONT_SIZE }),
    }),
    {
      name: "multica_typography",
      storage: createJSONStorage(() => defaultStorage),
    },
  ),
);
