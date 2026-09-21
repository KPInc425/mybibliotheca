import React, { useState } from 'react';

interface BookCoverProps {
  /** The book's cover_url. May be null, undefined, or an empty string. */
  src?: string | null;
  alt: string;
  className?: string;
}

/** Path to the bundled fallback. Served by the API at /static/, not from the SPA. */
const FALLBACK = '/static/bookshelf.png';

/**
 * A book cover that never renders a broken image.
 *
 * Two separate bugs lived in the twelve places that rendered covers directly:
 *
 *  1. They used `src={book.cover_url ?? '/bookshelf.png'}`. Nullish coalescing
 *     only catches null/undefined, but the API returns the EMPTY STRING for a
 *     book with no cover. `src=""` resolves to the page URL itself, which is not
 *     an image, so the browser showed a broken-image glyph. Production has 19
 *     books in that state.
 *  2. The fallback path was `/bookshelf.png`, which is a 404. The asset lives at
 *     `/static/bookshelf.png`, served by the API via nginx.
 *
 * This component fixes both and also downgrades the cover cleanly when a URL is
 * set but the remote image no longer resolves (covers rot).
 */
const BookCover: React.FC<BookCoverProps> = ({ src, alt, className }) => {
  const initial = src && src.trim() ? src : FALLBACK;
  const [current, setCurrent] = useState(initial);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (current !== FALLBACK) {
      setCurrent(FALLBACK);
      return;
    }
    // Even the fallback failed; stop retrying and let the container show its
    // own placeholder styling rather than a broken-image glyph.
    setFailed(true);
  };

  if (failed) {
    return (
      <div
        className={`${className ?? ''} flex items-center justify-center bg-base-200`}
        role="img"
        aria-label={alt}
      >
        <span className="text-xs text-base-content/40 text-center px-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );
};

export default BookCover;
