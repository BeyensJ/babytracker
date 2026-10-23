import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Trash2, HelpCircle, Check, Info, AlertCircle } from 'lucide-react';

export function ConfirmModal() {
  const { confirmState, alertState, language } = useApp();
  const confirmBtnRef = useRef(null);
  const alertBtnRef = useRef(null);

  const isDutch = language === 'nl';

  // Keyboard accessibility (Escape to dismiss, auto-focus confirm)
  useEffect(() => {
    if (!confirmState && !alertState) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (confirmState?.onCancel) confirmState.onCancel();
        else if (alertState?.onClose) alertState.onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Auto-focus the action button
    const timer = setTimeout(() => {
      if (confirmBtnRef.current) confirmBtnRef.current.focus();
      else if (alertBtnRef.current) alertBtnRef.current.focus();
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
    };
  }, [confirmState, alertState]);

  if (confirmState) {
    const {
      title = isDutch ? 'Weet je het zeker?' : 'Are you sure?',
      message,
      confirmText = isDutch ? 'Bevestigen' : 'Confirm',
      cancelText = isDutch ? 'Annuleren' : 'Cancel',
      variant = 'danger', // 'danger' | 'warning' | 'primary'
      onConfirm,
      onCancel,
    } = confirmState;

    const Icon = variant === 'danger' ? Trash2 : variant === 'warning' ? AlertTriangle : HelpCircle;

    return (
      <div
        className="custom-confirm-overlay"
        onClick={onCancel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
      >
        <div
          className="custom-confirm-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`custom-confirm-icon-wrap ${variant}`}>
            <Icon size={24} />
          </div>

          <h3 id="confirm-modal-title" className="custom-confirm-title">
            {title}
          </h3>

          {message && (
            <p className="custom-confirm-message">
              {message}
            </p>
          )}

          <div className="custom-confirm-actions">
            <button
              type="button"
              className="custom-confirm-btn cancel"
              onClick={onCancel}
            >
              {cancelText}
            </button>
            <button
              ref={confirmBtnRef}
              type="button"
              className={`custom-confirm-btn confirm ${variant}`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (alertState) {
    const {
      title = isDutch ? 'Bericht' : 'Notice',
      message,
      buttonText = isDutch ? 'Begrepen' : 'OK',
      variant = 'primary',
      onClose,
    } = alertState;

    const Icon = variant === 'warning' ? AlertCircle : variant === 'success' ? Check : Info;

    return (
      <div
        className="custom-confirm-overlay"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="alert-modal-title"
      >
        <div
          className="custom-confirm-card"
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`custom-confirm-icon-wrap ${variant}`}>
            <Icon size={24} />
          </div>

          <h3 id="alert-modal-title" className="custom-confirm-title">
            {title}
          </h3>

          {message && (
            <p className="custom-confirm-message">
              {message}
            </p>
          )}

          <div className="custom-confirm-actions single">
            <button
              ref={alertBtnRef}
              type="button"
              className="custom-confirm-btn confirm primary"
              onClick={onClose}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
