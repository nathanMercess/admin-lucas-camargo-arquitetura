import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { isSiteConfigV1, isSiteConfigV2 } from '@shared/guards/site-document.guard';

import { ContentDraftService } from '../content/services/content-draft.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DashboardComponent implements OnInit {
  protected readonly draftService = inject(ContentDraftService);
  protected readonly projectCount = computed(() => this.draftService.draft()?.projects.length ?? 0);
  protected readonly mediaCount = computed(() => this.draftService.draft()?.media.length ?? 0);
  protected readonly visibleSectionCount = computed(() => {
    const draft = this.draftService.draft();

    if (isSiteConfigV1(draft))
      return draft.sections.filter((section) => section.visible).length;

    if (isSiteConfigV2(draft))
      return draft.pages.flatMap((page) => page.sections).filter((section) => section.visible).length;

    return 0;
  });
  protected readonly totalSectionCount = computed(() => {
    const draft = this.draftService.draft();

    if (isSiteConfigV1(draft))
      return draft.sections.length;

    if (isSiteConfigV2(draft))
      return draft.pages.flatMap((page) => page.sections).length;

    return 0;
  });
  protected readonly editorReady = computed(() => isSiteConfigV2(this.draftService.draft()));
  protected readonly draftStatus = computed(() => {
    if (this.draftService.loading())
      return $localize`:@@admin.dashboard.loading:Carregando`;

    if (this.draftService.error() && !this.draftService.draft())
      return $localize`:@@admin.dashboard.unavailable:Indisponível`;

    if (this.draftService.dirty())
      return $localize`:@@admin.dashboard.pending:Pendente`;

    return $localize`:@@admin.dashboard.synchronized:Em dia`;
  });

  public ngOnInit(): void {
    this.draftService.load();
  }
}
