import { DEFAULT_SITE_CONFIG } from '../config/default-site-config';

import { isSiteConfigV1, isSiteConfigV2 } from './site-document.guard';

describe('site document guards', () => {
  it('identifies version-one documents exclusively', () => {
    expect(isSiteConfigV1(DEFAULT_SITE_CONFIG)).toBe(true);
    expect(isSiteConfigV2(DEFAULT_SITE_CONFIG)).toBe(false);
  });

  it('identifies version-two documents exclusively', () => {
    const document = { schemaVersion: 2, pages: [], contact: {} };

    expect(isSiteConfigV2(document)).toBe(true);
    expect(isSiteConfigV1(document)).toBe(false);
  });

  it('rejects unsupported versions and non-object values', () => {
    expect(isSiteConfigV1({ schemaVersion: 3 })).toBe(false);
    expect(isSiteConfigV2({ schemaVersion: 3 })).toBe(false);
    expect(isSiteConfigV1(null)).toBe(false);
    expect(isSiteConfigV2([])).toBe(false);
  });
});
