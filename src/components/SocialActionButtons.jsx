import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Heart, MessageCircle } from 'lucide-react';

function formatRelativeTime(timestamp, language) {
  if (!timestamp) return '';
  const isDutch = language === 'nl';
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 45) return isDutch ? 'zojuist' : 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return isDutch ? `${diffHours}u` : `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return isDutch ? 'gisteren' : 'yesterday';
  return isDutch ? `${diffDays}d` : `${diffDays}d`;
}

export function SocialActionButtons({ event, className = '' }) {
  const {
    caregivers,
    activeCaregiver,
    toggleEventLike,
    openModal,
    events,
    language,
    t,
  } = useApp();

  const [hoveredType, setHoveredType] = useState(null); // 'likes' | 'comments' | null
  const isDutch = language === 'nl';

  if (!event) return null;

  // Ensure latest live data from state if available
  const liveEvent = (events || []).find((e) => e.id === event.id) || event;
  const likes = Array.isArray(liveEvent.likes) ? liveEvent.likes : [];
  const comments = Array.isArray(liveEvent.comments) ? liveEvent.comments : [];
  const activeCgId = activeCaregiver?.id || 'cg_mom';
  const isLikedByMe = likes.some((l) =>
    typeof l === 'string' ? l === activeCgId : l.caregiverId === activeCgId
  );

  const handleLikeClick = (e) => {
    e.stopPropagation();
    toggleEventLike(liveEvent.id);
  };

  const handleCommentClick = (e) => {
    e.stopPropagation();
    openModal('EVENT_DETAIL', liveEvent);
  };

  return (
    <div className={`social-actions-group ${className}`} onClick={(e) => e.stopPropagation()}>
      {/* 1. LIKE BUTTON & HOVER POPOVER */}
      <div
        className="social-btn-wrapper"
        onMouseEnter={() => setHoveredType('likes')}
        onMouseLeave={() => setHoveredType(null)}
      >
        <button
          type="button"
          className={`timeline-social-btn like-btn ${isLikedByMe ? 'liked' : ''}`}
          onClick={handleLikeClick}
          title={isLikedByMe ? t('timeline.liked') : t('timeline.like')}
          aria-label={isLikedByMe ? t('timeline.liked') : t('timeline.like')}
        >
          <Heart size={13} fill={isLikedByMe ? 'currentColor' : 'none'} />
          {likes.length > 0 && <span className="social-count">{likes.length}</span>}
        </button>

        {hoveredType === 'likes' && (
          <div className="social-hover-popover likes-popover" role="tooltip">
            {likes.length === 0 ? (
              <div className="popover-empty-state">
                <Heart size={14} className="popover-empty-icon heart" />
                <span>{isDutch ? 'Nog geen likes · Tik om te liken' : 'No likes yet · Tap to like'}</span>
              </div>
            ) : (
              <div className="popover-content">
                <div className="popover-header">
                  <Heart size={12} fill="currentColor" className="popover-header-icon heart" />
                  <span className="popover-title">
                    {isDutch
                      ? `${likes.length} ${likes.length === 1 ? 'persoon vindt dit leuk' : 'mensen vinden dit leuk'}`
                      : `${likes.length} ${likes.length === 1 ? 'like' : 'likes'}`}
                  </span>
                </div>
                <div className="popover-likers-list">
                  {likes.map((liker, idx) => {
                    const likerId = typeof liker === 'string' ? liker : liker.caregiverId;
                    const cg = (caregivers || []).find((c) => c.id === likerId) || (typeof liker === 'object' ? liker : null);
                    const name = cg?.name || (likerId === activeCgId ? (isDutch ? 'Jij' : 'You') : 'Caregiver');
                    const color = cg?.color || cg?.caregiverColor || '#CE6B4C';
                    const initial = (name || 'C')[0].toUpperCase();

                    return (
                      <div key={idx} className="popover-liker-item">
                        <span className="popover-avatar" style={{ backgroundColor: color }}>
                          {initial}
                        </span>
                        <span className="popover-liker-name">
                          {name}
                          {likerId === activeCgId && <span className="popover-you-tag"> ({isDutch ? 'jij' : 'you'})</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 2. COMMENT BUTTON & HOVER POPOVER */}
      <div
        className="social-btn-wrapper"
        onMouseEnter={() => setHoveredType('comments')}
        onMouseLeave={() => setHoveredType(null)}
      >
        <button
          type="button"
          className={`timeline-social-btn comment-btn ${comments.length > 0 ? 'has-comments' : ''}`}
          onClick={handleCommentClick}
          title={t('timeline.comments')}
          aria-label={t('timeline.comments')}
        >
          <MessageCircle size={13} />
          {comments.length > 0 && <span className="social-count">{comments.length}</span>}
        </button>

        {hoveredType === 'comments' && (
          <div className="social-hover-popover comments-popover" role="tooltip">
            {comments.length === 0 ? (
              <div className="popover-empty-state">
                <MessageCircle size={14} className="popover-empty-icon comment" />
                <span>{isDutch ? 'Nog geen reacties · Tik om te reageren' : 'No comments yet · Tap to comment'}</span>
              </div>
            ) : (
              <div className="popover-content">
                <div className="popover-header">
                  <MessageCircle size={12} className="popover-header-icon comment" />
                  <span className="popover-title">
                    {isDutch
                      ? `${comments.length} ${comments.length === 1 ? 'reactie' : 'reacties'}`
                      : `${comments.length} ${comments.length === 1 ? 'comment' : 'comments'}`}
                  </span>
                </div>
                <div className="popover-comments-list">
                  {comments.slice(-3).map((cmt) => {
                    const cAuthor = (caregivers || []).find((c) => c.id === cmt.caregiverId) || {
                      name: cmt.caregiverName,
                      color: cmt.caregiverColor,
                    };
                    const cColor = cAuthor?.color || cmt.caregiverColor || '#CE6B4C';
                    const cName = cAuthor?.name || cmt.caregiverName || 'Caregiver';
                    const cInitial = (cName || 'C')[0].toUpperCase();

                    return (
                      <div key={cmt.id} className="popover-comment-item">
                        <span className="popover-avatar" style={{ backgroundColor: cColor }}>
                          {cInitial}
                        </span>
                        <div className="popover-comment-body">
                          <div className="popover-comment-meta">
                            <span className="popover-comment-author">{cName}</span>
                            <span className="popover-comment-time">{formatRelativeTime(cmt.timestamp, language)}</span>
                          </div>
                          <p className="popover-comment-text">{cmt.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="popover-footer-hint">
                  <span>{isDutch ? 'Tik om te bekijken of te reageren' : 'Tap to view or add comment'}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
