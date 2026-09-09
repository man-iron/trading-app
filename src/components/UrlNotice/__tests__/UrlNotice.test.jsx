import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import UrlNotice from '../UrlNotice';

afterEach(() => {
  window.history.replaceState({}, '', '/');
});

describe('bug #19 — URL notices are plain text', () => {
  it('shows URL markup literally without creating injected elements', () => {
    const notice = '<strong>INJECTED NOTICE</strong>';
    window.history.replaceState({}, '', `/?notice=${encodeURIComponent(notice)}`);
    render(<UrlNotice />);
    const banner = screen.getByRole('note');
    expect(banner.querySelector('strong')).toBeNull();
    expect(banner.textContent).toBe(notice);
  });

  it('does not render a notice when the parameter is absent', () => {
    window.history.replaceState({}, '', '/');
    render(<UrlNotice />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});
