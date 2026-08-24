import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { isSiteConfigV1 } from '@shared/guards/site-document.guard';

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
  private readonly v1Draft = computed(() => {
    const draft = this.draftService.draft();

    return isSiteConfigV1(draft) ? draft : null;
  });
  protected readonly projectCount = computed(() => this.v1Draft()?.projects.length ?? 0);
  protected readonly mediaCount = computed(() => this.v1Draft()?.media.length ?? 0);
  protected readonly visibleSectionCount = computed(() =>
    this.v1Draft()?.sections.filter((section) => section.visible).length ?? 0);
  protected readonly totalSectionCount = computed(() => this.v1Draft()?.sections.length ?? 0);
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
