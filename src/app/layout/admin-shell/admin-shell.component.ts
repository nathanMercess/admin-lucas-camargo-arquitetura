import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { MenuItem } from 'primeng/api';

import { SessionService } from '../../core/session/services/session.service';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AdminShellComponent implements OnInit {
  protected readonly sessionService = inject(SessionService);
  protected readonly sessionInitials = computed(() => {
    const email = this.sessionService.session()?.email;

    if (!email)
      return '--';

    return email
      .split(/[.@_-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly roleLabel = computed(() => {
    const role = this.sessionService.session()?.role;

    if (role === 'owner')
      return $localize`:@@admin.session.owner:Proprietário`;

    if (role === 'publisher')
      return $localize`:@@admin.session.publisher:Publicador`;

    if (role === 'auditor')
      return $localize`:@@admin.session.auditor:Auditor`;

    return $localize`:@@admin.session.editor:Editor`;
  });
  protected readonly navigationItems: MenuItem[] = [
    {
      label: $localize`:@@admin.navigation.dashboard:Visão geral`,
      routerLink: ['/dashboard'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.content:Conteúdo do site`,
      routerLink: ['/content'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.projects:Projetos`,
      routerLink: ['/projects'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.media:Mídia`,
      routerLink: ['/media'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.publications:Publicações`,
      routerLink: ['/publications'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.audit:Auditoria`,
      routerLink: ['/audit'],
      routerLinkActiveOptions: { exact: true },
    },
  ];

  public ngOnInit(): void {
    this.sessionService.load();
  }
}
