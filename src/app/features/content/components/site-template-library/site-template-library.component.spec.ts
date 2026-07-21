import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { ThemeConfig } from '@shared/models/theme-config.model';

import { ContentModule } from '../../content.module';
import { SiteTemplateLibraryComponent } from './site-template-library.component';

describe('SiteTemplateLibraryComponent', () => {
  let fixture: ComponentFixture<SiteTemplateLibraryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ContentModule],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteTemplateLibraryComponent);
    fixture.componentRef.setInput('currentTheme', DEFAULT_SITE_CONFIG.theme);
    fixture.detectChanges();
  });

  it('renders four previews and identifies the active template', () => {
    const rootElement = fixture.nativeElement as HTMLElement;

    expect(rootElement.querySelectorAll('.site-template-card')).toHaveLength(4);
    expect(rootElement.querySelector('[data-template-id="lucas-camargo-v1"]')?.textContent)
      .toContain('Em uso');
  });

  it('emits a cloned theme without changing the current value', () => {
    const emittedThemes: ThemeConfig[] = [];
    const rootElement = fixture.nativeElement as HTMLElement;

    fixture.componentInstance.themeChange.subscribe((theme) => emittedThemes.push(theme));

    const galleryButton = rootElement.querySelector<HTMLButtonElement>(
      '[data-template-id="gallery-v1"] button',
    );

    expect(galleryButton).not.toBeNull();

    galleryButton!.click();
    fixture.detectChanges();

    expect(emittedThemes).toHaveLength(1);
    expect(emittedThemes[0].presetId).toBe('gallery-v1');
    expect(emittedThemes[0]).not.toBe(DEFAULT_SITE_CONFIG.theme);
    expect(fixture.componentInstance.currentTheme().presetId).toBe('lucas-camargo-v1');
  });

  it('allows the current preset to be restored after a manual token change', () => {
    const emittedThemes: ThemeConfig[] = [];
    const customizedTheme: ThemeConfig = {
      ...DEFAULT_SITE_CONFIG.theme,
      colors: {
        ...DEFAULT_SITE_CONFIG.theme.colors,
        accent: '#d55f6b',
      },
    };

    fixture.componentRef.setInput('currentTheme', customizedTheme);
    fixture.componentInstance.themeChange.subscribe((theme) => emittedThemes.push(theme));
    fixture.detectChanges();

    const editorialButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[data-template-id="lucas-camargo-v1"] button');

    expect(editorialButton?.disabled).toBe(false);

    editorialButton!.click();

    expect(emittedThemes[0].colors.accent).toBe('#e36571');
  });
});
