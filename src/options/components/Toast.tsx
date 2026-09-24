/**
 * @file Transient confirmation toast with a single action, used for the mark-all-read undo.
 */

import React, { useEffect } from 'react';

const AUTO_DISMISS_MS = 7000;

/**
 * Props for Toast.
 */
interface ToastProps {
    /**
     * Message text shown in the toast.
     */
    message: string;

    /**
     * Label of the action button (e.g. "Undo").
     */
    actionLabel: string;

    /**
     * Called when the user activates the action button.
     */
    onAction: () => void;

    /**
     * Called when the toast is dismissed, either by timeout or explicitly.
     */
    onDismiss: () => void;
}

/**
 * Transient confirmation toast with a single action (e.g. Undo).
 * Announced politely to screen readers and dismissed automatically.
 *
 * @param root0 Component props.
 * @param root0.message Message text shown in the toast.
 * @param root0.actionLabel Label of the action button (e.g. "Undo").
 * @param root0.onAction Called when the user activates the action button.
 * @param root0.onDismiss Called when the toast is dismissed, either by timeout or explicitly.
 */
export function Toast({
    message,
    actionLabel,
    onAction,
    onDismiss,
}: ToastProps): React.JSX.Element {
    useEffect(() => {
        const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
        return () => clearTimeout(timer);
    }, [onDismiss]);

    return (
        <div className="toast" role="status" aria-live="polite">
            <span className="toast-message">{message}</span>
            <button type="button" className="toast-action" onClick={onAction}>
                {actionLabel}
            </button>
        </div>
    );
}
