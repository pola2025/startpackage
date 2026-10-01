import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomepageSettingsPage from '@/app/dashboard/homepage/page';
import { HOMEPAGE_STYLE_OPTIONS } from '@/lib/homepage-styles';

describe('homepage style selection in the application form', () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => url === '/api/submission'
        ? { 로고시안확정: true }
        : { 홈페이지스타일: 'https://www.jnipartners.co.kr', 홈페이지컬러컨셉: '#31566A' },
    }));
    vi.stubGlobal('fetch', fetchMock);
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('keeps a previous style while browsing, updates only on explicit choice and sends no write', async () => {
    render(<HomepageSettingsPage />);
    const previous = await screen.findByRole('link', { name: '스타일 1' });
    expect(previous).toHaveAttribute('href', 'https://www.jnipartners.co.kr');
    expect(screen.queryAllByRole('tab', { name: /유료옵션/ })).toHaveLength(0);
    fireEvent.click(screen.getByRole('tab', { name: /신규 3 · 제안형/ }));
    expect(screen.getByRole('link', { name: '스타일 1' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '이 스타일 선택' }));
    const choice = HOMEPAGE_STYLE_OPTIONS.find(style => style.name === '신규 3 · 제안형')!;
    await waitFor(() => expect(screen.getByRole('link', { name: '신규 3 · 제안형' })).toHaveAttribute('href', choice.url));
    fireEvent.click(screen.getByRole('tab', { name: /스타일 6/ }));
    expect(screen.getByRole('link', { name: '신규 3 · 제안형' })).toHaveAttribute('href', choice.url);
    expect(fetchMock.mock.calls.every(([, options]) => !options?.method || options.method === 'GET')).toBe(true);
  });
});
