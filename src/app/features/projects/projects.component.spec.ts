import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { Confirmation, ConfirmationService } from 'primeng/api';

import { ContentDraftService } from '../content/services/content-draft.service';
import { ProjectsComponent } from './projects.component';
import { ProjectsModule } from './projects.module';

class ContentDraftServiceStub {
  public readonly draft = signal<SiteConfigV1 | null>({
    ...structuredClone(DEFAULT_SITE_CONFIG),
    projects: [
      {
        id: 'casa-jardim',
        slug: 'casa-jardim',
        title: 'Casa Jardim',
        summary: 'Projeto residencial',
        description: ['Projeto residencial completo.'],
        categoryIds: [],
        cover: {
          assetId: 'cover-1',
          alt: 'Fachada da Casa Jardim',
          decorative: false,
          focalPointX: 50,
          focalPointY: 50,
        },
        gallery: [],
        location: 'São Paulo',
        year: '2026',
        services: ['Arquitetura'],
        order: 10,
        visible: true,
        seo: {
          title: 'Casa Jardim',
          description: 'Projeto residencial Casa Jardim.',
          canonicalPath: '/portfolio/projeto/casa-jardim',
          imageMediaId: 'cover-1',
          noIndex: false,
        },
      },
    ],
  });
  public readonly loading = signal(false);
  public readonly saving = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly dirty = signal(false);
  public readonly developmentFallback = signal(false);
  public readonly load = vi.fn();
  public readonly save = vi.fn();

  public updateDraft(draft: SiteConfigV1): void {
    this.draft.set(draft);
    this.dirty.set(true);
  }
}

describe('ProjectsComponent drawers', () => {
  let fixture: ComponentFixture<ProjectsComponent>;
  let confirmationService: { confirm: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    confirmationService = { confirm: vi.fn() };

    await TestBed.configureTestingModule({
      imports: [ProjectsModule],
      providers: [
        { provide: ContentDraftService, useClass: ContentDraftServiceStub },
        { provide: ConfirmationService, useValue: confirmationService },
      ],
    })
      .overrideComponent(ProjectsComponent, {
        set: {
          template: `
            <button id="open-project" type="button" (click)="openNewProject()">Novo</button>
            <button id="edit-project" type="button" (click)="editProject(projectRows()[0])">Editar</button>
            <button id="close-project" type="button"
              (click)="handleProjectDrawerVisibleChange(false)">Cancelar</button>
            <button id="delete-project" type="button"
              (click)="requestDeleteProject(projectRows()[0])">Excluir</button>
            <span id="project-title">{{ projectDrawerTitle() }}</span>
            <span id="project-visible">{{ projectDrawerVisible() }}</span>
          `,
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ProjectsComponent);
    fixture.detectChanges();
  });

  it('uses a specific title for creation and returns focus after canceling', async () => {
    const openButton = fixture.nativeElement.querySelector('#open-project') as HTMLButtonElement;
    openButton.focus();
    openButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#project-title').textContent).toContain(
      'Adicionar projeto',
    );
    expect(fixture.nativeElement.querySelector('#project-visible').textContent).toContain('true');

    const closeButton = fixture.nativeElement.querySelector('#close-project') as HTMLButtonElement;
    closeButton.click();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#project-visible').textContent).toContain('false');
    expect(document.activeElement).toBe(openButton);
  });

  it('uses the edit title for an existing project', () => {
    const editButton = fixture.nativeElement.querySelector('#edit-project') as HTMLButtonElement;
    editButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('#project-title').textContent).toContain(
      'Editar projeto',
    );
  });

  it('requests destructive confirmation with specific actions and safe focus', () => {
    const deleteButton = fixture.nativeElement.querySelector('#delete-project') as HTMLButtonElement;
    deleteButton.click();

    expect(confirmationService.confirm).toHaveBeenCalledOnce();
    const confirmation = confirmationService.confirm.mock.calls[0][0] as Confirmation;
    expect(confirmation.key).toBe('project-actions');
    expect(confirmation.acceptLabel).toBe('Excluir projeto');
    expect(confirmation.rejectLabel).toBe('Cancelar');
  });
});
