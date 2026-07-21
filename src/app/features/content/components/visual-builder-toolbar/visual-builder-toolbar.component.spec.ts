import { FormsModule } from '@angular/forms';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';

import { VisualBuilderToolbarComponent } from './visual-builder-toolbar.component';

describe('VisualBuilderToolbarComponent', () => {
  let fixture: ComponentFixture<VisualBuilderToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [VisualBuilderToolbarComponent],
      imports: [ButtonModule, FormsModule, ToggleSwitchModule, TooltipModule],
    }).compileComponents();

    fixture = TestBed.createComponent(VisualBuilderToolbarComponent);
    fixture.componentRef.setInput('pageName', 'Página inicial');
    fixture.detectChanges();
  });

  it('emits explicit viewport actions', () => {
    let fitRequests = 0;
    let actualSizeRequests = 0;
    let centerRequests = 0;

    fixture.componentInstance.fitViewport.subscribe(() => fitRequests += 1);
    fixture.componentInstance.actualSize.subscribe(() => actualSizeRequests += 1);
    fixture.componentInstance.centerPage.subscribe(() => centerRequests += 1);

    const rootElement = fixture.nativeElement as HTMLElement;

    rootElement.querySelector<HTMLButtonElement>('[aria-label="Ajustar página à tela"]')!.click();
    rootElement.querySelector<HTMLButtonElement>('[aria-label="Mostrar página em tamanho real"]')!.click();
    rootElement.querySelector<HTMLButtonElement>('[aria-label="Centralizar página"]')!.click();

    expect(fitRequests).toBe(1);
    expect(actualSizeRequests).toBe(1);
    expect(centerRequests).toBe(1);
  });

  it('emits custom zoom and incremental controls', () => {
    const zoomValues: number[] = [];
    let zoomInRequests = 0;
    let zoomOutRequests = 0;

    fixture.componentInstance.zoomChange.subscribe((zoom) => zoomValues.push(zoom));
    fixture.componentInstance.zoomIn.subscribe(() => zoomInRequests += 1);
    fixture.componentInstance.zoomOut.subscribe(() => zoomOutRequests += 1);

    const rootElement = fixture.nativeElement as HTMLElement;
    const zoomInput = rootElement.querySelector<HTMLInputElement>('.visual-builder-zoom input')!;

    zoomInput.value = '75';
    zoomInput.dispatchEvent(new Event('input'));
    rootElement.querySelector<HTMLButtonElement>('[aria-label="Aumentar zoom"]')!.click();
    rootElement.querySelector<HTMLButtonElement>('[aria-label="Reduzir zoom"]')!.click();

    expect(zoomValues).toEqual([75]);
    expect(zoomInRequests).toBe(1);
    expect(zoomOutRequests).toBe(1);
  });

  it('communicates fullscreen state without changing the page data', () => {
    let fullscreenRequests = 0;

    fixture.componentInstance.fullscreenChange.subscribe(() => fullscreenRequests += 1);
    fixture.componentRef.setInput('fullscreen', true);
    fixture.detectChanges();

    const fullscreenButton = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('[aria-label="Sair da tela cheia"]');

    expect(fullscreenButton?.getAttribute('aria-pressed')).toBe('true');

    fullscreenButton!.click();

    expect(fullscreenRequests).toBe(1);
  });

  it('exposes toolbar groups, keyboard shortcuts and the save status relationship', () => {
    fixture.componentRef.setInput('dirty', true);
    fixture.componentRef.setInput('canUndo', true);
    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;
    const toolbar = rootElement.querySelector<HTMLElement>('[role="toolbar"]')!;
    const undoButton = rootElement.querySelector<HTMLButtonElement>('[aria-label="Desfazer"]')!;
    const pageName = rootElement.querySelector<HTMLInputElement>('.visual-builder-page-name input')!;
    const status = rootElement.querySelector<HTMLElement>('#visual-builder-save-status')!;

    expect(toolbar.getAttribute('aria-label')).toBe('Ferramentas do editor visual');
    expect(undoButton.getAttribute('aria-keyshortcuts')).toBe('Control+Z');
    expect(pageName.getAttribute('aria-describedby')).toBe(status.id);
    expect(status.getAttribute('role')).toBe('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
  });

  it('communicates selected device, view mode and the current zoom value', () => {
    fixture.componentRef.setInput('device', 'mobile');
    fixture.componentRef.setInput('viewMode', 'actual');
    fixture.componentRef.setInput('zoom', 75);
    fixture.detectChanges();

    const rootElement = fixture.nativeElement as HTMLElement;
    const mobileButton = rootElement
      .querySelector<HTMLButtonElement>('[aria-label="Visualizar no celular"]')!;
    const actualSizeButton = rootElement
      .querySelector<HTMLButtonElement>('[aria-label="Mostrar página em tamanho real"]')!;
    const zoomInput = rootElement.querySelector<HTMLInputElement>('#visual-builder-zoom')!;

    expect(mobileButton.getAttribute('aria-pressed')).toBe('true');
    expect(actualSizeButton.getAttribute('aria-pressed')).toBe('true');
    expect(zoomInput.getAttribute('aria-valuetext')).toBe('75%');
    expect(zoomInput.getAttribute('aria-describedby')).toBe('visual-builder-zoom-value');
  });
});
