import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { providePrimeNG } from 'primeng/config';

import { AdminShellComponent } from './admin-shell.component';
import { AdminShellModule } from './admin-shell.module';

describe('AdminShellComponent', () => {
  let fixture: ComponentFixture<AdminShellComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminShellModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        providePrimeNG(),
      ],
    }).compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminShellComponent);
    fixture.detectChanges();

    const request = httpTestingController.expectOne('/api/v1/session');
    request.flush({
      subject: 'development:nathan66merces@gmail.com',
      email: 'nathan66merces@gmail.com',
      role: 'owner',
      permissions: [
        'session:read',
        'content:read',
        'content:write',
        'release:read',
        'release:publish',
        'release:rollback',
        'media:read',
        'media:write',
        'audit:read',
      ],
      publishedContentBaseUrl: 'https://content.example.com/content',
    });

    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('renders every primary destination as keyboard-accessible navigation links', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const navigationMenu = rootElement.querySelector<HTMLElement>(
      '.admin-navigation .p-menu-list',
    );
    const navigationLinks = rootElement.querySelectorAll<HTMLAnchorElement>(
      '.admin-navigation .p-menu-item-link',
    );

    expect(navigationMenu?.closest('nav')?.getAttribute('aria-label')).toBe('Navegação do painel');
    expect(navigationLinks).toHaveLength(6);
    expect([...navigationLinks].every((link) => link.tabIndex === 0)).toBe(true);
    expect([...navigationLinks].every((link) => Boolean(link.getAttribute('aria-label')))).toBe(true);
    expect([...navigationLinks].map((link) => link.getAttribute('href'))).toEqual([
      '/dashboard',
      '/content',
      '/projects',
      '/media',
      '/publications',
      '/audit',
    ]);
  });

  it('keeps PrimeNG structural classes enabled for the branded theme', () => {
    const rootElement = fixture.nativeElement as HTMLElement;

    expect(rootElement.querySelector('.p-menu-list')).not.toBeNull();
    expect(rootElement.querySelector('.p-avatar')).not.toBeNull();
    expect(rootElement.querySelector('.p-tag')).not.toBeNull();
  });

  it('shows the authenticated identity instead of a permanent unidentified state', () => {
    const rootElement = fixture.nativeElement as HTMLElement;

    expect(rootElement.textContent).toContain('nathan66merces@gmail.com');
    expect(rootElement.textContent).not.toContain('Sessão não identificada');
  });

  it('toggles the navigation in place without replacing the routed content', () => {
    const rootElement = fixture.nativeElement as HTMLElement;
    const outlet = rootElement.querySelector('router-outlet');
    const toggle = rootElement.querySelector<HTMLButtonElement>(
      '.admin-shell-navigation-toggle button',
    );

    expect(rootElement.querySelector('.admin-shell--navigation-collapsed')).toBeNull();

    toggle?.click();
    fixture.detectChanges();

    expect(rootElement.querySelector('.admin-shell--navigation-collapsed')).not.toBeNull();
    expect(rootElement.querySelector('router-outlet')).toBe(outlet);
  });

  it('keeps the content route in the standard panel layout by default', () => {
    const router = TestBed.inject(Router);
    const shellRoute = router.config.find((route) => route.path === '');
    const contentRoute = shellRoute?.children?.find((route) => route.path === 'content');

    expect(contentRoute?.data?.['adminShellMode']).toBeUndefined();
  });
});
