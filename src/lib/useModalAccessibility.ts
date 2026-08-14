import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const openDialogs: HTMLElement[] = [];
let bodyOverflowBeforeModal: string | null = null;

/**
 * Provides the keyboard contract shared by modal dialogs: initial focus,
 * focus trapping, Escape-to-close, and focus restoration to the opener.
 */
export function useModalAccessibility(onClose: () => void, isOpen = true) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const dialog = dialogRef.current;
    if (!dialog || typeof document === "undefined") return;

    if (openDialogs.length === 0) {
      bodyOverflowBeforeModal = document.body.style.overflow;
    }
    openDialogs.push(dialog);

    const isTopmostDialog = () => openDialogs.at(-1) === dialog;

    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

    const getFocusable = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    // Focusing a text field on open makes the mobile keyboard spring up over the
    // dialog's own content before the user has decided to type anything. Landing
    // on the first non-typing control instead still satisfies 「開啟後將焦點移至
    // 標題或第一個可操作元素」 from docs/ui/Dialog and Sheet.md.
    //
    // This is the structural half of that rule: removing `data-autofocus` from
    // the inputs alone was not enough, because the fallback below would just pick
    // the next text input in the dialog and open the keyboard anyway.
    const opensKeyboard = (el: HTMLElement) => {
      if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
      if (!(el instanceof HTMLInputElement)) return false;
      // Checkboxes, radios and buttons render as inputs but summon no keyboard.
      return !["button", "checkbox", "color", "file", "image", "radio", "range", "reset", "submit"].includes(el.type);
    };

    const focusInitialControl = () => {
      if (!isTopmostDialog()) return;
      // An explicit `data-autofocus` is still honoured — it is a deliberate
      // opt-in, and none currently sit on a text field.
      const preferred = dialog.querySelector<HTMLElement>("[data-autofocus]");
      const focusable = getFocusable();
      (preferred ?? focusable.find((el) => !opensKeyboard(el)) ?? focusable[0] ?? dialog).focus();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog()) return;

      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const frame = window.requestAnimationFrame(focusInitialControl);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      const dialogIndex = openDialogs.lastIndexOf(dialog);
      if (dialogIndex >= 0) openDialogs.splice(dialogIndex, 1);
      if (openDialogs.length === 0) {
        document.body.style.overflow = bodyOverflowBeforeModal ?? "";
        bodyOverflowBeforeModal = null;
        if (previousFocus?.isConnected) previousFocus.focus();
      }
    };
  }, [isOpen]);

  return dialogRef;
}
