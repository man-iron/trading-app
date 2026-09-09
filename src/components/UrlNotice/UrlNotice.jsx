import React from 'react';

/** Optional notice carried by a shared terminal URL. */
export default function UrlNotice({ className }) {
  const notice = new URLSearchParams(window.location.search).get('notice');
  if (!notice) return null;

  return (
    <div
      className={className}
      role="note"
      data-testid="url-notice"
      dangerouslySetInnerHTML={{ __html: notice }}
    />
  );
}
