import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * A11Y-02: Focus trap hook for modal dialogs.
 * - Moves focus into the container on mount
 * - Traps Tab/Shift+Tab within the container
 * - Restores focus to the previously-focused element on unmount
 *
 * @param {React.RefObject} containerRef - ref attached to the modal container element
 * @param {boolean} active - whether the trap is active (default true)
 */
export function useFocusTrap(containerRef, active = true) {
  const previouslyFocused = useRef(null);

  useEffect(() => {
    if (!active) return;

    // Save current focus so we can restore it when the modal closes
    previouslyFocused.current = document.activeElement;

    // Move focus into the container (first focusable element, or the container itself)
    const container = containerRef?.current;
    if (container) {
      const first = container.querySelectorAll(FOCUSABLE_SELECTORS)[0];
      if (first) {
        first.focus();
      } else {
        container.focus();
      }
    }

    const handleKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (!container) return;

      const focusable = Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS));
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if focus is on first element, wrap to last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: if focus is on last element, wrap to first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // Restore focus to the element that was focused before the modal opened
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === 'function') {
        previouslyFocused.current.focus();
      }
    };
  }, [active, containerRef]);
}
