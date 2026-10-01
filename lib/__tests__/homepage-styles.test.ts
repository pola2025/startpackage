import { describe, expect, it } from 'vitest';
import { HOMEPAGE_STYLE_OPTIONS, RETIRED_HOMEPAGE_STYLES, getHomepageStyleName, isPaidHomepageStyle } from '../homepage-styles';

describe('homepage replacement catalog', () => {
  it('excludes retired choices and keeps their historical labels', () => {
    for (const retired of RETIRED_HOMEPAGE_STYLES) {
      expect(HOMEPAGE_STYLE_OPTIONS.some(option => option.url === retired.url)).toBe(false);
      expect(getHomepageStyleName(retired.url + '/')).toBe(retired.name);
    }
    expect(RETIRED_HOMEPAGE_STYLES.map(option => option.name)).toEqual(['스타일 1', '스타일 2', '스타일 4', '스타일 5']);
  });
  it('offers only five retained and five new basic styles', () => {
    expect(HOMEPAGE_STYLE_OPTIONS).toHaveLength(10);
    expect(HOMEPAGE_STYLE_OPTIONS.filter(option => !option.paid)).toHaveLength(10);
    expect(HOMEPAGE_STYLE_OPTIONS.filter(option => option.category === 'current').map(option => option.name)).toEqual(['스타일 3', '스타일 6', '스타일 7', '스타일 8', '스타일 9']);
    expect(HOMEPAGE_STYLE_OPTIONS.filter(option => option.category === 'new')).toHaveLength(5);
    expect(HOMEPAGE_STYLE_OPTIONS.filter(option => option.paid)).toHaveLength(0);
    expect(new Set(HOMEPAGE_STYLE_OPTIONS.map(option => option.url)).size).toBe(HOMEPAGE_STYLE_OPTIONS.length);
    for (const option of HOMEPAGE_STYLE_OPTIONS) {
      expect(getHomepageStyleName(option.url)).toBe(option.name);
      expect(isPaidHomepageStyle(option.url)).toBe(false);
    }
  });
  it('keeps pre-existing demo and excluded paid URL compatibility', () => {
    expect(getHomepageStyleName('https://jmbiz.imweb.me/')).toBe('스타일 3');
    expect(getHomepageStyleName('https://startpackage-demo2.vercel.app/')).toBe('스타일 8');
    expect(getHomepageStyleName('https://jsbizfunding.kr/')).toBe('유료옵션 1');
    expect(getHomepageStyleName('https://startpackage-demo4.vercel.app/')).toBe('유료옵션 2');
    expect(getHomepageStyleName('https://richway-biz.com/')).toBe('유료옵션 3');
    expect(isPaidHomepageStyle('https://jsbizfunding.kr/')).toBe(true);
    expect(isPaidHomepageStyle('https://startpackage-demo4.vercel.app/')).toBe(true);
    expect(isPaidHomepageStyle('https://richway-biz.com/')).toBe(true);
    expect(isPaidHomepageStyle('https://startpackagedemo5.vercel.app/')).toBe(true);
  });
});
