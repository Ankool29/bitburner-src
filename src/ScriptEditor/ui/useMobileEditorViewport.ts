import { useEffect, useRef } from "react";

/** Keep the editor inside the visible viewport without recreating its Monaco model. */
export function useMobileEditorViewport() {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = window.visualViewport;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const root = rootRef.current;
        if (!root) return;
        root.style.setProperty("--mobile-editor-height", `${viewport?.height ?? window.innerHeight}px`);
        root.style.setProperty("--mobile-editor-top", `${viewport?.offsetTop ?? 0}px`);
      });
    };
    update();
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return rootRef;
}
