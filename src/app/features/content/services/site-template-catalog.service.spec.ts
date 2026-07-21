import { TestBed } from '@angular/core/testing';

import { SiteTemplateCatalogService } from './site-template-catalog.service';

describe('SiteTemplateCatalogService', () => {
  it('exposes four unique, brand-safe presets', () => {
    const catalog = TestBed.inject(SiteTemplateCatalogService);
    const identifiers = catalog.presets.map((preset) => preset.id);

    expect(catalog.presets).toHaveLength(4);
    expect(new Set(identifiers).size).toBe(4);

    for (const preset of catalog.presets) {
      expect(preset.theme.presetId).toBe(preset.id);
      expect(preset.theme.colors.accent).toBe('#e36571');
      expect(preset.theme.layout.contentMaxWidthPx).toBeGreaterThanOrEqual(960);
      expect(preset.theme.layout.contentMaxWidthPx).toBeLessThanOrEqual(1920);
      expect(preset.theme.motion.revealDurationMs).toBeLessThanOrEqual(3000);
    }
  });
});
