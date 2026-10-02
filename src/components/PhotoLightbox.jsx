import React, { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Download } from 'lucide-react';
import { formatTime, formatDateHeading } from '../utils/formatters';
import { syncService } from '../services/syncService';

export function PhotoLightbox({ photoUrl, caption, timestamp, language = 'nl', onClose }) {
  const isClosingRef = useRef(false);
  const isBackdropPointerDownRef = useRef(false);

  const handleClose = useCallback((e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    // Suppress delayed synthetic ghost clicks on touch devices (Android WebView / Chrome)
    const swallowGhostClick = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
      if (typeof evt.stopImmediatePropagation === 'function') {
        evt.stopImmediatePropagation();
      }
    };

    window.addEventListener('click', swallowGhostClick, { capture: true, once: true });
    window.addEventListener('touchend', swallowGhostClick, { capture: true, once: true });

    setTimeout(() => {
      window.removeEventListener('click', swallowGhostClick, { capture: true });
      window.removeEventListener('touchend', swallowGhostClick, { capture: true });
    }, 450);

    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // Handle hardware / gesture back button on Android and Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose(e);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Push dummy history entry for Android back button support
    const stateId = `lightbox_${Date.now()}`;
    window.history.pushState({ [stateId]: true }, '');

    const handlePopState = () => {
      handleClose();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      // Clean up history entry if closed via button / backdrop instead of back button
      if (window.history.state?.[stateId]) {
        window.history.back();
      }
    };
  }, [handleClose]);

  if (!photoUrl) return null;

  const resolvedUrl = syncService.resolveMediaUrl(photoUrl);

  const handleDownload = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = `baby_photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleOverlayPointerDown = (e) => {
    isBackdropPointerDownRef.current = e.target === e.currentTarget;
  };

  const handleOverlayClick = (e) => {
    if (isBackdropPointerDownRef.current && e.target === e.currentTarget) {
      handleClose(e);
    }
    isBackdropPointerDownRef.current = false;
  };

  const content = (
    <div
      className="photo-lightbox-overlay"
      onPointerDown={handleOverlayPointerDown}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-label={caption || 'Photo preview'}
    >
      <div
        className="photo-lightbox-container"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="photo-lightbox-header">
          <div className="photo-lightbox-date">
            {timestamp && (
              <>
                <Calendar size={14} />
                <span>{formatDateHeading(new Date(timestamp).toISOString().split('T')[0], language)} · {formatTime(timestamp, language)}</span>
              </>
            )}
          </div>
          <div className="photo-lightbox-actions">
            <button
              type="button"
              className="photo-lightbox-btn"
              onClick={handleDownload}
              title={language === 'nl' ? 'Foto downloaden' : 'Download photo'}
              aria-label={language === 'nl' ? 'Foto downloaden' : 'Download photo'}
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              className="photo-lightbox-btn close"
              onClick={handleClose}
              title={language === 'nl' ? 'Sluiten' : 'Close'}
              aria-label={language === 'nl' ? 'Sluiten' : 'Close'}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="photo-lightbox-image-wrap">
          <img src={resolvedUrl} alt={caption || 'Baby activity photo'} className="photo-lightbox-img" />
        </div>

        {caption && (
          <div className="photo-lightbox-caption">
            <p>{caption}</p>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
}
