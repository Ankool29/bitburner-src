import React, { useEffect, useState } from "react";
import GlobalStyles from "@mui/material/GlobalStyles";
import Box from "@mui/material/Box";

// Include landscape phones without changing normal desktop/tablet layouts.
export const mobileQuery = "(max-width: 600px), (max-width: 900px) and (max-height: 500px) and (pointer: coarse)";
export const mobileMedia = `@media ${mobileQuery}`;

export const mobileStack = {
  [mobileMedia]: { gridTemplateColumns: "minmax(0, 1fr)", flexDirection: "column", minWidth: 0 },
} as const;

export function responsiveGrid(columns: string) {
  return { gridTemplateColumns: columns, ...mobileStack };
}

/** Contain fixed-size maps/boards without scaling or changing their hit targets. */
export function ResponsiveScroll({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <Box
      role="region"
      aria-label={label}
      tabIndex={0}
      className="bb-scroll-region"
      sx={{
        display: "contents",
        [mobileMedia]: {
          display: "block",
          overflow: "auto",
          maxWidth: "100%",
          borderBottom: "2px solid",
          borderColor: "primary.main",
        },
      }}
    >
      {children}
    </Box>
  );
}

export interface AvailableViewport {
  width: number;
  height: number;
  top: number;
  left: number;
}

export function readViewport(): AvailableViewport {
  const viewport = window.visualViewport;
  return {
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
    top: viewport?.offsetTop ?? 0,
    left: viewport?.offsetLeft ?? 0,
  };
}

/** One subscription implementation for keyboard, rotation and viewport panning. */
export function observeViewport(update: (viewport: AvailableViewport) => void): () => void {
  const viewport = window.visualViewport;
  let frame = 0;
  const schedule = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => update(readViewport()));
  };
  update(readViewport());
  window.addEventListener("resize", schedule);
  viewport?.addEventListener("resize", schedule);
  viewport?.addEventListener("scroll", schedule);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    viewport?.removeEventListener("resize", schedule);
    viewport?.removeEventListener("scroll", schedule);
  };
}

export function useAvailableViewport() {
  const [viewport, setViewport] = useState(readViewport);
  useEffect(() => observeViewport(setViewport), []);
  return viewport;
}

export function revealFocusedControl(): void {
  const input = document.activeElement;
  if (!(input instanceof HTMLElement) || !input.matches("input, textarea, [contenteditable=true]")) return;
  const scrollport = input.closest<HTMLElement>(".bb-modal-content");
  if (!scrollport) return;
  const field = input.getBoundingClientRect();
  const bounds = scrollport.getBoundingClientRect();
  if (field.bottom > bounds.bottom) scrollport.scrollTop += field.bottom - bounds.bottom + 8;
  else if (field.top < bounds.top) scrollport.scrollTop -= bounds.top - field.top + 8;
}

export function ResponsiveLayout() {
  useEffect(
    () =>
      observeViewport((viewport) => {
        for (const [key, value] of Object.entries(viewport)) {
          document.documentElement.style.setProperty(`--bb-ui-${key}`, `${value}px`);
        }
        revealFocusedControl();
      }),
    [],
  );

  return (
    <GlobalStyles
      styles={{
        [mobileMedia]: {
          html: { fontSize: "var(--bb-ui-font-size, 16px)", overflowX: "hidden" },
          body: { fontSize: "var(--bb-ui-font-size, 16px)", overflowX: "hidden" },
          "#root": { width: "100%", minWidth: 0, maxWidth: "100%" },
          "body .bb-responsive-page": { minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" },
          "body .MuiTypography-root": { overflowWrap: "anywhere", lineHeight: 1.5 },
          "body .MuiTypography-body1": { fontSize: "1rem" },
          "body .MuiTypography-body2": { fontSize: "0.9375rem" },
          "body .MuiTypography-h4": { fontSize: "1.5rem" },
          "body .MuiTypography-h5, body .MuiTypography-h6": { fontSize: "1.125rem" },
          "body .MuiButton-root, body .MuiTab-root": { minHeight: 44, fontSize: "0.875rem", whiteSpace: "normal" },
          "body .MuiIconButton-root": { minWidth: 44, minHeight: 44 },
          "body .MuiMenuItem-root": { minHeight: 48, whiteSpace: "normal", overflowWrap: "anywhere" },
          "body .MuiInputBase-root": { maxWidth: "100%", minWidth: 0, fontSize: "max(16px, 1rem)" },
          "body .MuiInputBase-input": { fontSize: "max(16px, 1rem)", minHeight: 28 },
          "body .MuiFormControl-root, body .MuiContainer-root": { maxWidth: "100%", minWidth: 0 },
          "body .bb-responsive-page .MuiBox-root, body .bb-modal-content .MuiBox-root": {
            minWidth: 0,
            maxWidth: "100%",
          },
          "body .bb-modal-content > *": { maxWidth: "100%", minWidth: 0 },
          "body .MuiButtonGroup-root": { flexWrap: "wrap", maxWidth: "100%" },
          "body .MuiTabs-root": { maxWidth: "100%", minWidth: 0 },
          "body .MuiTabs-scroller": { overflowX: "auto !important" },
          "body .MuiTable-root:not([data-game-grid]), body .bb-responsive-page table:not([data-game-grid]), body .bb-modal-content table:not([data-game-grid])":
            {
              display: "block",
              width: "100%",
              maxWidth: "100%",
              overflowX: "auto",
              borderBottom: "2px solid var(--bb-theme-welllight)",
            },
          "body .MuiTable-root:not([data-game-grid]) .MuiTableCell-root": { padding: "8px", fontSize: "0.9375rem" },
          "body .MuiTableContainer-root": { maxWidth: "100%", overflowX: "auto" },
          "body .bb-responsive-page pre, body .bb-modal-content pre": {
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
          },
          "body .bb-modal-content img, body .bb-responsive-page img": { maxWidth: "100%", height: "auto" },
          "body .bb-modal-content .MuiFormControl-root": { flexShrink: 1, minWidth: 0 },
          "body .MuiPopover-paper": {
            maxWidth: "calc(var(--bb-ui-width, 100vw) - 16px) !important",
            maxHeight: "calc(var(--bb-ui-height, 100dvh) - 16px) !important",
            top: "calc(var(--bb-ui-top, 0px) + 8px) !important",
            left: "calc(var(--bb-ui-left, 0px) + 8px) !important",
            overflowY: "auto",
          },
          // Override the legacy global rule hiding every scrollbar. Keep Monaco's own scrollers intact.
          "body table, body .MuiTableContainer-root, body .bb-modal-content, body .bb-scroll-region, body .MuiPopover-paper":
            {
              scrollbarWidth: "thin",
              scrollbarColor: "var(--bb-theme-primary) var(--bb-theme-well)",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              "&::-webkit-scrollbar": { display: "block", height: 8, width: 8 },
              "&::-webkit-scrollbar-thumb": { backgroundColor: "var(--bb-theme-primary)" },
              "&::-webkit-scrollbar-track": { backgroundColor: "var(--bb-theme-well)" },
            },
        },
      }}
    />
  );
}
