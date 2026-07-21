import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';

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
  protected readonly visibleSectionCount = computed(() =>
    this.draftService.draft()?.sections.filter((section) => section.visible).length ?? 0);
  protected readonly totalSectionCount = computed(() => this.draftService.draft()?.sections.length ?? 0);
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
