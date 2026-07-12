import { useCallback, type KeyboardEvent } from "react";

type Options = {
  page: number; // 0-indexed or 1-indexed, caller decides
  totalPages: number;
  firstPage: number;
  onChange: (next: number) => void;
  /** Force RTL mapping; defaults to reading document direction at event time. */
  rtl?: boolean;
};

/**
 * Keyboard handler for pagination controls with RTL awareness.
 *
 * Mapping (respects the container's writing direction):
 *   - ArrowLeft  → next in RTL, previous in LTR
 *   - ArrowRight → previous in RTL, next in LTR
 *   - Home       → first page
 *   - End        → last page
 *   - PageUp     → previous page (dir-independent)
 *   - PageDown   → next page (dir-independent)
 *
 * Tab / Shift+Tab are intentionally not intercepted — they follow DOM
 * order which already reads correctly in both directions.
 */
export function usePaginationKeys({ page, totalPages, firstPage, onChange, rtl }: Options) {
  return useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      const target = e.target as HTMLElement | null;
      // Don't hijack arrows inside inputs / selects nested in the pagination row.
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) {
          return;
        }
      }

      const lastPage = firstPage + totalPages - 1;
      const isRtl =
        rtl ??
        (typeof document !== "undefined" &&
          (e.currentTarget.closest("[dir]")?.getAttribute("dir") ?? document.dir) === "rtl");

      const prev = () => onChange(Math.max(firstPage, page - 1));
      const next = () => onChange(Math.min(lastPage, page + 1));

      switch (e.key) {
        case "ArrowLeft":
          e.preventDefault();
          isRtl ? next() : prev();
          break;
        case "ArrowRight":
          e.preventDefault();
          isRtl ? prev() : next();
          break;
        case "PageUp":
          e.preventDefault();
          prev();
          break;
        case "PageDown":
          e.preventDefault();
          next();
          break;
        case "Home":
          e.preventDefault();
          onChange(firstPage);
          break;
        case "End":
          e.preventDefault();
          onChange(lastPage);
          break;
      }
    },
    [page, totalPages, firstPage, onChange, rtl],
  );
}
