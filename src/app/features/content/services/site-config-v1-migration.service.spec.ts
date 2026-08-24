import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';

import { SiteConfigV1MigrationService } from './site-config-v1-migration.service';

describe('SiteConfigV1MigrationService', () => {
  let service: SiteConfigV1MigrationService;

  beforeEach(() => {
    service = TestBed.inject(SiteConfigV1MigrationService);
  });

  it('blocks migration and names every section that the V2 catalog cannot represent', () => {
    const analysis = service.analyze(DEFAULT_SITE_CONFIG);

    expect(analysis.canMigrate).toBe(false);
    expect(analysis.blockers).toEqual(expect.arrayContaining([
      'Manifesto (manifesto)',
      'Atuação (practice)',
      'Indicadores (metrics)',
      'Sobre (about)',
      'Processo (process)',
    ]));
    expect(() => service.migrate(DEFAULT_SITE_CONFIG)).toThrowError(/Migração bloqueada/);
  });

  it('migrates supported sections, real project references and adds the contact form', () => {
    const supportedTypes = new Set(['hero', 'portfolio', 'contact']);
    const config: SiteConfigV1 = {
      ...DEFAULT_SITE_CONFIG,
      sections: DEFAULT_SITE_CONFIG.sections.filter((section) => supportedTypes.has(section.type)),
    };
    const migrated = service.migrate(config);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.projects).toEqual(config.projects);
    expect(migrated.pages[0].sections.map((section) => section.type)).toEqual([
      'hero',
      'project-grid',
      'whatsapp-cta',
      'contact-form',
    ]);
    const projectGrid = migrated.pages[0].sections[1];
    expect(projectGrid.type === 'project-grid' ? projectGrid.projectIds : null).toEqual([]);
    expect(migrated.contact.whatsappNumber).toBe('5511986681572');
    expect(migrated.seo.organization.email).toBe(migrated.contact.email);
    expect(migrated.seo.organization.telephone).toBe(migrated.contact.phoneE164);
    expect(migrated.navigationItems.map((item) => item.href)).toEqual(['#projetos', '#contato']);
  });

  it('blocks legacy visual documents instead of dropping their HTML or project data', () => {
    const legacyVisual: SiteConfigV1 = {
      ...DEFAULT_SITE_CONFIG,
      sections: DEFAULT_SITE_CONFIG.sections.filter((section) =>
        ['hero', 'portfolio', 'contact'].includes(section.type)),
      visualBuilder: {
        enabled: true,
        html: '<section>Legado</section>',
        css: '',
        projectData: {},
      },
    };

    expect(service.analyze(legacyVisual).blockers).toContain('Conteúdo criado no editor visual legado');
  });
});
