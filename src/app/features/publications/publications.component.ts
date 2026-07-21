import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormControl } from '@angular/forms';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { SiteSection } from '@shared/models/site-section.model';
import { ConfirmationService } from 'primeng/api';

import { ContentDraftService } from '../content/services/content-draft.service';
import { PreviewViewport } from './models/preview-viewport.model';
import { ReleaseRecord } from './models/release-record.model';
import { PublicationService } from './services/publication.service';

@Component({
  selector: 'app-publications',
  templateUrl: './publications.component.html',
  styleUrl: './publications.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class PublicationsComponent implements OnInit {
  private readonly confirmationService = inject(ConfirmationService);
  protected readonly draftService = inject(ContentDraftService);
  protected readonly publicationService = inject(PublicationService);
  protected readonly viewportControl = new FormControl<'mobile' | 'tablet' | 'desktop'>(
    'desktop',
    { nonNullable: true },
  );
  protected readonly viewports: PreviewViewport[] = [
    { label: $localize`:@@admin.preview.mobile:Celular`, value: 'mobile', width: '390px' },
    { label: $localize`:@@admin.preview.tablet:Tablet`, value: 'tablet', width: '768px' },
    { label: $localize`:@@admin.preview.desktop:Desktop`, value: 'desktop', width: '100%' },
  ];
  protected readonly previewWidth = computed(() =>
    this.viewports.find((viewport) => viewport.value === this.viewportControl.value)?.width ?? '100%',
  );
  protected readonly visibleSections = computed(() =>
    [...(this.draftService.draft()?.sections ?? [])]
      .filter((section) => section.visible)
      .sort((first, second) => first.order - second.order),
  );

  public ngOnInit(): void {
    this.draftService.load();
    this.publicationService.load();
  }

  protected publish(): void {
    const etag = this.draftService.etag();

    if (!etag)
      return;

    this.confirmationService.confirm({
      header: $localize`:@@admin.publications.publishTitle:Publicar rascunho?`,
      message: $localize`:@@admin.publications.publishMessage:O site público passará a usar exatamente esta versão.`,
      acceptLabel: $localize`:@@admin.publications.publishAccept:Publicar agora`,
      rejectLabel: $localize`:@@admin.publications.cancel:Cancelar`,
      accept: () => this.publicationService.publish(etag, () => this.draftService.load()),
    });
  }

  protected rollback(release: ReleaseRecord): void {
    const etag = this.draftService.etag();

    if (!etag)
      return;

    this.confirmationService.confirm({
      header: $localize`:@@admin.publications.rollbackTitle:Restaurar versão?`,
      message: $localize`:@@admin.publications.rollbackMessage:A versão ${release.releaseId} voltará ao ar e a ação ficará registrada na auditoria.`,
      acceptLabel: $localize`:@@admin.publications.rollbackAccept:Restaurar versão`,
      rejectLabel: $localize`:@@admin.publications.cancel:Cancelar`,
      accept: () => this.publicationService.rollback(
        release.releaseId,
        etag,
        () => this.draftService.load(),
      ),
    });
  }

  protected sectionTitle(section: SiteSection): string {
    if (section.type === 'process')
      return section.title;

    if (section.type === 'metrics')
      return section.ariaLabel;

    return this.richText(section.title);
  }

  protected richText(block: RichTextBlock): string {
    return block.lines
      .map((line) => line.segments.map((segment) => segment.text).join(''))
      .join(' ');
  }
}
