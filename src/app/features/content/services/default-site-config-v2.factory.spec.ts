import { TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';

import { DefaultSiteConfigV2Factory } from './default-site-config-v2.factory';

describe('DefaultSiteConfigV2Factory', () => {
  it('creates an explicit safe V2 bootstrap without inventing projects', () => {
    const document = TestBed.inject(DefaultSiteConfigV2Factory).create(DEFAULT_SITE_CONFIG);

    expect(document.schemaVersion).toBe(2);
    expect(document.releaseId).toContain('draft-v2-');
    expect(document.projects).toEqual(DEFAULT_SITE_CONFIG.projects);
    expect(document.pages[0].sections.map((section) => section.type)).toEqual([
      'hero',
      'project-grid',
      'whatsapp-cta',
      'contact-form',
    ]);
    const projectGrid = document.pages[0].sections[1];
    expect(projectGrid.type === 'project-grid' ? projectGrid.projectIds : null).toEqual([]);
    expect(projectGrid.type === 'project-grid' ? projectGrid.description : []).not.toHaveLength(0);
    expect(document.contact).toEqual({
      email: 'arquiteto@lucascamargo.com',
      phoneLabel: '11 98668-1572',
      phoneE164: '+5511986681572',
      instagramUrl: 'https://www.instagram.com/lucascamargo.arquiteto/',
      whatsappNumber: '5511986681572',
      whatsappDefaultMessage: 'Olá, gostaria de conversar sobre um projeto.',
    });
    expect(document.seo.organization.email).toBe(document.contact.email);
    expect(document.seo.organization.telephone).toBe(document.contact.phoneE164);
    expect(document.header.primaryCta.href).toContain('https://wa.me/5511986681572');
    expect(document.navigationItems).toEqual([
      { id: 'projects', label: 'Projetos', href: '#projetos' },
      { id: 'contact', label: 'Contato', href: '#contato' },
    ]);
    expect(document.footer.socialLinks.find((link) => link.id === 'instagram')?.href)
      .toBe(document.contact.instagramUrl);
  });
});
