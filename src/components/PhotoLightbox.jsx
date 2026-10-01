import React, { useEffect } from 'react';
import { X, Calendar, Download } from 'lucide-react';
import { formatTime, formatDateHeading } from '../utils/formatters';
import { syncService } from '../services/syncService';

export function PhotoLightbox({ photoUrl, caption, timestamp, language = 'nl', onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!photoUrl) return null;

  const resolvedUrl = syncService.resolveMediaUrl(photoUrl);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = resolvedUrl;
    a.download = `baby_photo_${Date.now()}.jpg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="photo-lightbox-overlay" onClick={onClose}>
      <div className="photo-lightbox-container" onClick={(e) => e.stopPropagation()}>
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
              onClick={onClose}
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
}
