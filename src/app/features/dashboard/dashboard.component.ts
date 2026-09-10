import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { isSiteConfigV1, isSiteConfigV2 } from '@shared/guards/site-document.guard';

import { ContactInboxService } from '../contact-inbox/services/contact-inbox.service';
import { ContentDraftService } from '../content/services/content-draft.service';
import { PublicationService } from '../publications/services/publication.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class DashboardComponent implements OnInit {
  protected readonly draftService = inject(ContentDraftService);
  protected readonly inboxService = inject(ContactInboxService);
  protected readonly publicationService = inject(PublicationService);
  protected readonly projectCount = computed(() => this.draftService.draft()?.projects.length ?? 0);
  protected readonly mediaCount = computed(() => this.draftService.draft()?.media.length ?? 0);
  protected readonly newMessageCount = computed(() => this.inboxService.messages().length);
  protected readonly newMessageCountLabel = computed(() => {
    const count = this.newMessageCount();

    return this.inboxService.nextCursor() ? `${count}+` : count.toString();
  });
  protected readonly newMessageHeading = computed(() => {
    const count = this.newMessageCount();

    if (count === 1)
      return $localize`:@@admin.dashboard.oneNewMessage:Há uma nova mensagem esperando por você.`;

    return $localize`:@@admin.dashboard.newMessages:Há ${count}:messageCount: novas mensagens esperando por você.`;
  });
  protected readonly latestRelease = computed(() => [...this.publicationService.releases()]
    .sort((first, second) => second.publishedAt.localeCompare(first.publishedAt))[0] ?? null);
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
    this.refresh();
  }

  protected refresh(): void {
    this.draftService.load();
    this.inboxService.load('new');
    this.publicationService.load();
  }
}
