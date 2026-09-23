import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { notificationService } from '../services/notificationService';
import { Bell, Heart, Moon, Milk, Check, X } from 'lucide-react';

export function NotificationToast() {
  const { language } = useApp();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const unsubscribe = notificationService.onToast((newToast) => {
      setToast(newToast);
      // Auto-dismiss after 6 seconds
      const timer = setTimeout(() => {
        setToast((current) => (current === newToast ? null : current));
      }, 6000);
      return () => clearTimeout(timer);
    });

    return unsubscribe;
  }, []);

  if (!toast) return null;

  const getIcon = () => {
    if (toast.type === 'breast') return <Heart size={18} color="#FFF" />;
    if (toast.type === 'sleep') return <Moon size={18} color="#FFF" />;
    if (toast.type === 'pump') return <Milk size={18} color="#FFF" />;
    return <Bell size={18} color="#FFF" />;
  };

  const getBgColor = () => {
    if (toast.type === 'breast') return 'var(--color-terracotta)';
    if (toast.type === 'sleep') return 'var(--color-slate)';
    if (toast.type === 'pump') return 'var(--color-caramel)';
    return 'var(--color-terracotta)';
  };

  return (
    <div
      className="in-app-notification-toast"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        maxWidth: '92vw',
        width: '420px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.18), 0 2px 6px rgba(0, 0, 0, 0.08)',
        border: '1px solid var(--border-subtle)',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem',
        animation: 'slideInDown 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: '50%',
          backgroundColor: getBgColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.12)',
        }}
      >
        {getIcon()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: '0.88rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {toast.title}
        </div>
        <div
          style={{
            fontSize: '0.78rem',
            color: 'var(--text-secondary)',
            marginTop: '0.15rem',
            whiteSpace: 'pre-line',
            lineHeight: 1.3,
          }}
        >
          {toast.body}
        </div>
      </div>

      <button
        onClick={() => setToast(null)}
        style={{
          backgroundColor: 'transparent',
          border: 'none',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          padding: '0.3rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
        }}
        aria-label={language === 'nl' ? 'Melding sluiten' : 'Dismiss notification'}
      >
        <X size={16} />
      </button>
    </div>
  );
}
