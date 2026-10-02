import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Camera as CameraIcon, Image as ImageIcon, X, Loader2, Eye, Sparkles } from 'lucide-react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
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
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const [showSourceSheet, setShowSourceSheet] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const isDutch = language === 'nl';

  const closeSourceSheet = useCallback((e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    // Block ghost click bleed-through
    const swallow = (evt) => {
      evt.preventDefault();
      evt.stopPropagation();
    };
    window.addEventListener('click', swallow, { capture: true, once: true });
    setTimeout(() => {
      window.removeEventListener('click', swallow, { capture: true });
    }, 350);

    setShowSourceSheet(false);
  }, []);

  // Handle Android back button & Escape key for source sheet
  useEffect(() => {
    if (!showSourceSheet) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeSourceSheet(e);
    };
    window.addEventListener('keydown', handleKeyDown);

    const stateId = `photo_picker_${Date.now()}`;
    window.history.pushState({ [stateId]: true }, '');

    const handlePopState = () => {
      setShowSourceSheet(false);
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('popstate', handlePopState);
      if (window.history.state?.[stateId]) {
        window.history.back();
      }
    };
  }, [showSourceSheet, closeSourceSheet]);

  const processAndSaveImage = async (source) => {
    triggerHaptic('light', haptics);
    setIsProcessing(true);

    try {
      // 1. Compress image to high quality yet snappy size (< 200KB)
      const { dataUrl } = await compressImage(source, 1280, 0.82);

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

  const handleTakePhoto = async (e) => {
    if (e) e.stopPropagation();
    setShowSourceSheet(false);

    if (Capacitor.isNativePlatform()) {
      try {
        setIsProcessing(true);
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Camera,
        });

        if (image?.dataUrl) {
          await processAndSaveImage(image.dataUrl);
        } else {
          setIsProcessing(false);
        }
      } catch (err) {
        console.warn('[Camera] Take photo cancelled or failed:', err);
        setIsProcessing(false);
      }
    } else {
      cameraInputRef.current?.click();
    }
  };

  const handleChooseGallery = async (e) => {
    if (e) e.stopPropagation();
    setShowSourceSheet(false);

    if (Capacitor.isNativePlatform()) {
      try {
        setIsProcessing(true);
        const image = await Camera.getPhoto({
          quality: 85,
          allowEditing: false,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Photos,
        });

        if (image?.dataUrl) {
          await processAndSaveImage(image.dataUrl);
        } else {
          setIsProcessing(false);
        }
      } catch (err) {
        console.warn('[Camera] Gallery selection cancelled or failed:', err);
        setIsProcessing(false);
      }
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processAndSaveImage(file);
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    triggerHaptic('light', haptics);
    onChange(null);
  };

  const openPicker = (e) => {
    if (e) e.stopPropagation();
    triggerHaptic('selection', haptics);
    setShowSourceSheet(true);
  };

  const resolvedUrl = photoUrl ? syncService.resolveMediaUrl(photoUrl) : '';

  const sourceSheetModal = showSourceSheet && typeof document !== 'undefined' ? (
    createPortal(
      <div
        className="photo-source-overlay"
        onClick={closeSourceSheet}
        role="dialog"
        aria-modal="true"
        aria-label={isDutch ? 'Foto bron kiezen' : 'Choose photo source'}
      >
        <div
          className="photo-source-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="photo-source-header">
            <span className="photo-source-title">
              {isDutch ? 'Foto toevoegen' : 'Add Photo'}
            </span>
            <button
              type="button"
              className="photo-action-btn remove"
              onClick={closeSourceSheet}
              style={{ border: 'none', background: 'transparent', padding: '4px' }}
              aria-label={isDutch ? 'Sluiten' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>

          <div className="photo-source-options">
            <button
              type="button"
              className="photo-source-btn"
              onClick={handleTakePhoto}
            >
              <div className="photo-source-btn-icon">
                <CameraIcon size={22} />
              </div>
              <div className="photo-source-btn-info">
                <span className="photo-source-btn-title">
                  {isDutch ? 'Foto maken' : 'Take Photo'}
                </span>
                <span className="photo-source-btn-subtitle">
                  {isDutch ? 'Open de camera van je toestel' : 'Use your device camera'}
                </span>
              </div>
            </button>

            <button
              type="button"
              className="photo-source-btn"
              onClick={handleChooseGallery}
            >
              <div className="photo-source-btn-icon">
                <ImageIcon size={22} />
              </div>
              <div className="photo-source-btn-info">
                <span className="photo-source-btn-title">
                  {isDutch ? 'Kiezen uit galerij' : 'Choose from Gallery'}
                </span>
                <span className="photo-source-btn-subtitle">
                  {isDutch ? 'Selecteer een bestaande foto' : 'Select an existing photo'}
                </span>
              </div>
            </button>
          </div>

          <button
            type="button"
            className="photo-source-cancel"
            onClick={closeSourceSheet}
          >
            {isDutch ? 'Annuleren' : 'Cancel'}
          </button>
        </div>
      </div>,
      document.body
    )
  ) : null;

  return (
    <div className="photo-upload-container">
      {/* Hidden file inputs for Web/PWA camera & gallery fallbacks */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <input
        ref={galleryInputRef}
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
          <div
            className="photo-preview-thumbnail-wrap"
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setShowPreview(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowPreview(true);
              }
            }}
          >
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
                onClick={openPicker}
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
          onClick={openPicker}
        >
          {isProcessing ? (
            <div className="photo-upload-loading">
              <Loader2 size={20} className="spin-animate" />
              <span>{isDutch ? 'Foto verwerken...' : 'Processing photo...'}</span>
            </div>
          ) : (
            <div className="photo-upload-prompt">
              <div className="photo-icon-bubble">
                <CameraIcon size={20} />
              </div>
              <div className="photo-upload-text">
                <span className="photo-upload-title">{isDutch ? 'Foto maken of kiezen' : 'Take or Choose Photo'}</span>
                <span className="photo-upload-subtitle">{isDutch ? 'Maak een foto met camera of kies uit galerij' : 'Take with camera or pick from gallery'}</span>
              </div>
            </div>
          )}
        </button>
      )}

      {sourceSheetModal}

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
