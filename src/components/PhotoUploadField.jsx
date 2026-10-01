import React, { useState, useRef } from 'react';
import { Camera, X, Loader2, Image as ImageIcon, Eye } from 'lucide-react';
import { compressImage } from '../utils/imageCompressor';
import { syncService } from '../services/syncService';
import { triggerHaptic } from '../utils/haptics';
import { PhotoLightbox } from './PhotoLightbox';

export function PhotoUploadField({
  photoUrl,
  onChange,
  language = 'nl',
  haptics = true,
  label = null,
}) {
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isDutch = language === 'nl';

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected if needed
    e.target.value = '';

    triggerHaptic('light', haptics);
    setIsProcessing(true);

    try {
      // 1. Compress image client-side to keep size minimal & snappy (< 200KB)
      const { dataUrl } = await compressImage(file, 1280, 0.82);

      // 2. Upload to server (or fallback to dataUrl if offline)
      const serverUrl = await syncService.uploadImage(dataUrl);

      onChange(serverUrl || dataUrl);
      triggerHaptic('success', haptics);
    } catch (err) {
      console.error('[PhotoUpload] Failed to process image:', err);
      alert(isDutch ? 'Kon de foto niet verwerken. Probeer het opnieuw.' : 'Could not process photo. Please try again.');
      triggerHaptic('warning', haptics);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    triggerHaptic('light', haptics);
    onChange(null);
  };

  const resolvedUrl = photoUrl ? syncService.resolveMediaUrl(photoUrl) : '';

  return (
    <div className="photo-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="photo-upload-header">
        <label className="form-label" style={{ marginBottom: 0 }}>
          {label || (isDutch ? 'Foto toevoegen (optioneel)' : 'Add Photo (Optional)')}
        </label>
      </div>

      {photoUrl ? (
        <div className="photo-upload-preview-card">
          <div className="photo-preview-thumbnail-wrap" onClick={() => setShowPreview(true)}>
            <img src={resolvedUrl} alt="Attached photo" className="photo-preview-thumbnail" />
            <div className="photo-preview-overlay">
              <Eye size={18} />
              <span>{isDutch ? 'Bekijken' : 'View'}</span>
            </div>
          </div>

          <div className="photo-preview-info">
            <div className="photo-preview-status">
              <ImageIcon size={14} color="var(--color-sage)" />
              <span>{isDutch ? 'Foto toegevoegd' : 'Photo attached'}</span>
            </div>
            <div className="photo-preview-actions">
              <button
                type="button"
                className="photo-action-btn change"
                onClick={() => fileInputRef.current?.click()}
              >
                {isDutch ? 'Wijzigen' : 'Change'}
              </button>
              <button
                type="button"
                className="photo-action-btn remove"
                onClick={handleRemove}
                title={isDutch ? 'Foto verwijderen' : 'Remove photo'}
                aria-label={isDutch ? 'Foto verwijderen' : 'Remove photo'}
              >
                <X size={14} />
                <span>{isDutch ? 'Verwijderen' : 'Remove'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="photo-upload-dropzone"
          disabled={isProcessing}
          onClick={() => fileInputRef.current?.click()}
        >
          {isProcessing ? (
            <div className="photo-upload-loading">
              <Loader2 size={20} className="spin-animate" />
              <span>{isDutch ? 'Foto verwerken...' : 'Processing photo...'}</span>
            </div>
          ) : (
            <div className="photo-upload-prompt">
              <div className="photo-icon-bubble">
                <Camera size={20} />
              </div>
              <div className="photo-upload-text">
                <span className="photo-upload-title">{isDutch ? 'Foto maken of kiezen' : 'Take or Choose Photo'}</span>
                <span className="photo-upload-subtitle">{isDutch ? 'Voeg een herinnering of observatie toe' : 'Attach a memory or observation'}</span>
              </div>
            </div>
          )}
        </button>
      )}

      {showPreview && photoUrl && (
        <PhotoLightbox
          photoUrl={photoUrl}
          language={language}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
