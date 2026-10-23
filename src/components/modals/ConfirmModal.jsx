import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { triggerHaptic } from '../../utils/haptics';

export function ConfirmModal() {
  const { confirmDialog, t, preferences } = useApp();
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (!confirmDialog) return;

    if (confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        triggerHaptic('light', preferences?.haptics);
        confirmDialog.resolve(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        triggerHaptic('medium', preferences?.haptics);
        confirmDialog.resolve(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog, preferences?.haptics]);

  if (!confirmDialog) return null;

  const {
    title,
    message,
    confirmText,
    cancelText,
    type = 'danger',
    icon: CustomIcon,
    isAlert = false,
    resolve,
  } = confirmDialog;

  const handleConfirm = () => {
    triggerHaptic('medium', preferences?.haptics);
    if (resolve) resolve(true);
  };

  const handleCancel = () => {
    triggerHaptic('light', preferences?.haptics);
    if (resolve) resolve(false);
  };

  const renderIcon = () => {
    if (CustomIcon) return <CustomIcon size={26} />;
    switch (type) {
      case 'danger':
        return <Trash2 size={26} />;
      case 'warning':
        return <AlertTriangle size={26} />;
      case 'success':
        return <CheckCircle2 size={26} />;
      case 'info':
      default:
        return <AlertCircle size={26} />;
    }
  };

  const resolvedTitle = title || (
    isAlert
      ? t('common.alertTitle')
      : (type === 'danger' ? t('common.deleteConfirmTitle') : t('common.confirmTitle'))
  );

  const resolvedConfirmText = confirmText || (
    isAlert
      ? t('common.ok')
      : (type === 'danger' ? t('common.delete') : t('common.confirm'))
  );

  const resolvedCancelText = cancelText || t('common.cancel');

  const getConfirmBtnClass = () => {
    if (type === 'danger') return 'confirm-btn confirm-btn-danger';
    if (type === 'success') return 'confirm-btn confirm-btn-success';
    return 'confirm-btn confirm-btn-primary';
  };

  return (
    <div
      className="confirm-modal-overlay"
      onClick={isAlert ? handleConfirm : handleCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div
        className="confirm-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`confirm-icon-wrap ${type}`}>
          {renderIcon()}
        </div>

        <h3 id="confirm-dialog-title" className="confirm-title">
          {resolvedTitle}
        </h3>

        {message && (
          <div className="confirm-message">
            {message}
          </div>
        )}

        <div className="confirm-actions">
          {!isAlert && (
            <button
              type="button"
              className="confirm-btn confirm-btn-cancel"
              onClick={handleCancel}
            >
              {resolvedCancelText}
            </button>
          )}

          <button
            ref={confirmBtnRef}
            type="button"
            className={getConfirmBtnClass()}
            onClick={handleConfirm}
          >
            {resolvedConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
