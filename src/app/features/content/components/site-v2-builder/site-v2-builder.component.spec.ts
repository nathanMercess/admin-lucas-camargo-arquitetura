import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';
import { SitePageV2 } from '@shared/models/site-page-v2.model';
import { ConfirmationService } from 'primeng/api';

import { DefaultSiteConfigV2Factory } from '../../services/default-site-config-v2.factory';
import { SiteV2BuilderService } from '../../services/site-v2-builder.service';
import { SiteV2BuilderComponent } from './site-v2-builder.component';

interface BuilderTestAccess {
  dropPage(event: CdkDragDrop<SitePageV2[]>): void;
  mediaPath(assetId: string): string;
  updateContact(
    field: 'email' | 'instagramUrl' | 'phoneE164' | 'whatsappDefaultMessage' | 'whatsappNumber',
    value: string,
  ): void;
}

describe('SiteV2BuilderComponent interactions', () => {
  let fixture: ComponentFixture<SiteV2BuilderComponent>;
  let document: SiteConfigV2;
  let access: BuilderTestAccess;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SiteV2BuilderComponent],
      providers: [{ provide: ConfirmationService, useValue: { confirm: vi.fn() } }],
    })
      .overrideComponent(SiteV2BuilderComponent, { set: { template: '' } })
      .compileComponents();

    const factory = TestBed.inject(DefaultSiteConfigV2Factory);
    const builder = TestBed.inject(SiteV2BuilderService);
    document = builder.createPage(factory.create(DEFAULT_SITE_CONFIG));
    fixture = TestBed.createComponent(SiteV2BuilderComponent);
    fixture.componentRef.setInput('document', document);
    fixture.detectChanges();
    access = fixture.componentInstance as unknown as BuilderTestAccess;
  });

  it('translates a page drag/drop event into an immutable ordered document', () => {
    let emitted: SiteConfigV2 | undefined;
    fixture.componentInstance.documentChange.subscribe((value) => emitted = value);
    access.dropPage({ previousIndex: 1, currentIndex: 0 } as CdkDragDrop<SitePageV2[]>);

    expect(emitted?.pages[0].id).toBe(document.pages[1].id);
    expect(emitted?.pages.map((page) => page.order)).toEqual([10, 20]);
    expect(document.pages[0].id).toBe('home');
  });

  it('resolves bundled preview images through the local public site', () => {
    expect(access.mediaPath('architecture-reference')).toBe(
      'http://localhost:4200/assets/editorial/architecture-reference.jpg',
    );
  });

  it('emits inspector changes only in the typed global contact contract', () => {
    let emitted: SiteConfigV2 | undefined;
    fixture.componentInstance.documentChange.subscribe((value) => emitted = value);
    access.updateContact('email', ' novo@exemplo.com ');

    expect(emitted?.contact.email).toBe('novo@exemplo.com');
    expect(emitted?.seo.organization.email).toBe('novo@exemplo.com');
    expect(emitted?.pages).toBe(document.pages);
    expect('visualBuilder' in (emitted ?? {})).toBe(false);
  });

  it('keeps WhatsApp and Instagram integrations synchronized with global contact fields', () => {
    const emitted: SiteConfigV2[] = [];
    fixture.componentInstance.documentChange.subscribe((value) => emitted.push(value));

    access.updateContact('phoneE164', '+5511000000000');
    access.updateContact('whatsappNumber', '5511888888888');
    access.updateContact('whatsappDefaultMessage', 'Olá pelo painel');
    access.updateContact('instagramUrl', 'https://www.instagram.com/novo/');

    expect(emitted[0].seo.organization.telephone).toBe('+5511000000000');
    expect(emitted[1].header.primaryCta.href).toContain('5511888888888');
    expect(emitted[2].header.primaryCta.href).toContain('Ol%C3%A1%20pelo%20painel');
    expect(emitted[3].footer.socialLinks.find((link) => link.id === 'instagram')?.href)
      .toBe('https://www.instagram.com/novo/');
  });
});
