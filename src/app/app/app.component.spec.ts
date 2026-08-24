import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';

import { MaintenancePageComponent } from '../features/maintenance/maintenance-page.component';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent, MaintenancePageComponent],
      imports: [RouterModule.forRoot([])],
    }).compileComponents();
  });

  it('should create the admin application', () => {
    const fixture = TestBed.createComponent(AppComponent);

    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should show the maintenance page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('app-maintenance-page')).toBeTruthy();
    expect(compiled.querySelector('h1')?.getAttribute('aria-label')).toBe('Painel em manutenção');
  });
});
