import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { MaintenancePageComponent } from '../features/maintenance/maintenance-page.component';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');

    await TestBed.configureTestingModule({
      declarations: [AppComponent, MaintenancePageComponent],
      imports: [RouterModule.forRoot([])],
    }).compileComponents();
  });

  afterEach(() => {
    window.sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('should show the admin routes when the preview key is valid', () => {
    window.history.replaceState({}, '', '/?key=2026082414');

    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-maintenance-page')).toBeFalsy();
  });

  it.each(['/', '/?key=invalid'])(
    'should show the maintenance page without a valid preview key at %s',
    (url) => {
      window.history.replaceState({}, '', url);

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;

      expect(compiled.querySelector('app-maintenance-page')).toBeTruthy();
      expect(compiled.querySelector('router-outlet')).toBeFalsy();
    },
  );

  it('should keep the preview enabled during the browser session', () => {
    window.history.replaceState({}, '', '/?key=2026082414');

    const firstFixture = TestBed.createComponent(AppComponent);
    firstFixture.detectChanges();

    firstFixture.destroy();
    window.history.replaceState({}, '', '/projects');

    const reloadedFixture = TestBed.createComponent(AppComponent);
    reloadedFixture.detectChanges();

    const compiled = reloadedFixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('router-outlet')).toBeTruthy();
    expect(compiled.querySelector('app-maintenance-page')).toBeFalsy();
  });
});
