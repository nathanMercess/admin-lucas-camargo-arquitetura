import { CUSTOM_ELEMENTS_SCHEMA, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { vi } from 'vitest';

import { AdminSession } from '../core/session/models/admin-session.model';
import { SessionService } from '../core/session/services/session.service';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  const ready = signal(true);
  const session = signal<AdminSession | null>(null);
  const developmentFallback = signal(false);
  const load = vi.fn();

  beforeEach(async () => {
    ready.set(true);
    session.set(null);
    developmentFallback.set(false);
    load.mockClear();

    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      imports: [RouterModule.forRoot([])],
      providers: [{
        provide: SessionService,
        useValue: { ready, session, developmentFallback, load },
      }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();
  });

  it('loads the session and keeps the application covered while it is unresolved', () => {
    ready.set(false);

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(load).toHaveBeenCalledOnce();
    expect(compiled.querySelector('.app-loading')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeFalsy();
    expect(compiled.querySelector('app-login-page')).toBeFalsy();
  });

  it('shows the login when no administrative session exists', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-login-page')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeFalsy();
  });

  it('opens the admin routes only for an authenticated or local session', () => {
    session.set({
      subject: 'credentials:owner',
      email: 'nathan66merces@gmail.com',
      role: 'owner',
      permissions: ['session:read'],
      publishedContentBaseUrl: '/content',
    });

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-login-page')).toBeFalsy();
  });
});
