import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';

import { DefaultSiteConfigV2Factory } from './default-site-config-v2.factory';
import { SiteV2BuilderService } from './site-v2-builder.service';

describe('SiteV2BuilderService', () => {
  let factory: DefaultSiteConfigV2Factory;
  let service: SiteV2BuilderService;

  beforeEach(() => {
    factory = TestBed.inject(DefaultSiteConfigV2Factory);
    service = TestBed.inject(SiteV2BuilderService);
  });

  it('creates and reorders pages without mutating the source document', () => {
    const original = factory.create(DEFAULT_SITE_CONFIG);
    const withPage = service.createPage(original);
    const reordered = service.reorderPages(withPage, 1, 0);

    expect(original.pages).toHaveLength(1);
    expect(withPage.pages).toHaveLength(2);
    expect(reordered.pages.map((page) => page.order)).toEqual([10, 20]);
    expect(reordered.pages[0].id).toBe(withPage.pages[1].id);
  });

  it('adds every typed catalog section and preserves an empty project selection', () => {
    let document = factory.create(DEFAULT_SITE_CONFIG);
    const pageId = document.pages[0].id;

    for (const definition of service.sectionDefinitions)
      document = service.addSection(document, pageId, definition.type);

    const addedSections = document.pages[0].sections.slice(4);

    expect(addedSections.map((section) => section.type)).toEqual([
      'hero',
      'project-grid',
      'whatsapp-cta',
      'contact-form',
    ]);
    const projectGrid = addedSections.find((section) => section.type === 'project-grid');
    expect(projectGrid?.type === 'project-grid' ? projectGrid.projectIds : null).toEqual([]);
  });

  it('reorders sections and assigns only registered media to a hero', () => {
    const document = factory.create(DEFAULT_SITE_CONFIG);
    const page = document.pages[0];
    const hero = page.sections[0];
    const targetAsset = document.media[1];
    const reordered = service.reorderSections(document, page.id, 0, 2);
    const updated = service.setHeroMedia(document, page.id, hero.id, targetAsset);

    expect(reordered.pages[0].sections[2].id).toBe(hero.id);
    expect(reordered.pages[0].sections.map((section) => section.order)).toEqual([10, 20, 30, 40]);
    const updatedHero = updated.pages[0].sections[0];
    expect(updatedHero.type === 'hero' ? updatedHero.background.assetId : null).toBe(targetAsset.id);
  });
});
