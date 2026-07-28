import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { filter, startWith } from 'rxjs';

import { SessionService } from '../../core/session/services/session.service';

@Component({
  selector: 'app-admin-shell',
  templateUrl: './admin-shell.component.html',
  styleUrl: './admin-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class AdminShellComponent implements OnInit {
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly sessionService = inject(SessionService);
  protected readonly focusedEditor = signal(false);
  protected readonly navigationCollapsed = signal(false);
  protected readonly navigationToggleLabel = computed(() =>
    this.navigationCollapsed()
      ? $localize`:@@admin.navigation.show:Mostrar menu`
      : $localize`:@@admin.navigation.hide:Recolher menu`,
  );
  protected readonly sessionInitials = computed(() => {
    const email = this.sessionService.session()?.email;

    if (!email)
      return this.sessionService.developmentFallback() ? 'LC' : '--';

    return email
      .split(/[.@_-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  });
  protected readonly roleLabel = computed(() => {
    const role = this.sessionService.session()?.role;

    if (this.sessionService.loading())
      return $localize`:@@admin.session.loadingShort:Carregando`;

    if (this.sessionService.developmentFallback())
      return $localize`:@@admin.session.localMode:Modo local`;

    if (!role)
      return $localize`:@@admin.session.unavailableShort:Indisponível`;

    if (role === 'owner')
      return $localize`:@@admin.session.owner:Proprietário`;

    if (role === 'publisher')
      return $localize`:@@admin.session.publisher:Publicador`;

    if (role === 'auditor')
      return $localize`:@@admin.session.auditor:Auditor`;

    return $localize`:@@admin.session.editor:Editor`;
  });
  protected readonly roleSeverity = computed<'danger' | 'info' | 'warn'>(() => {
    if (this.sessionService.error())
      return 'danger';

    if (this.sessionService.developmentFallback())
      return 'warn';

    return 'info';
  });
  protected readonly navigationItems: MenuItem[] = [
    {
      label: $localize`:@@admin.navigation.dashboard:Visão geral`,
      icon: 'pi pi-home',
      routerLink: ['/dashboard'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.content:Conteúdo do site`,
      icon: 'pi pi-pencil',
      routerLink: ['/content'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.projects:Projetos`,
      icon: 'pi pi-building',
      routerLink: ['/projects'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.media:Mídia`,
      icon: 'pi pi-images',
      routerLink: ['/media'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.publications:Publicações`,
      icon: 'pi pi-send',
      routerLink: ['/publications'],
      routerLinkActiveOptions: { exact: true },
    },
    {
      label: $localize`:@@admin.navigation.audit:Auditoria`,
      icon: 'pi pi-history',
      routerLink: ['/audit'],
      routerLinkActiveOptions: { exact: true },
    },
  ];

  public constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith(null),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.synchronizeShellMode());
  }

  public ngOnInit(): void {
    this.sessionService.load();
  }

  protected toggleNavigation(): void {
    this.navigationCollapsed.update((collapsed) => !collapsed);
  }

  protected retrySession(): void {
    this.sessionService.load();
  }

  private synchronizeShellMode(): void {
    const focusedEditor = this.hasFocusedEditorMode(this.activatedRoute.snapshot);

    if (focusedEditor === this.focusedEditor())
      return;

    this.focusedEditor.set(focusedEditor);
    this.navigationCollapsed.set(focusedEditor);
  }

  private hasFocusedEditorMode(snapshot: ActivatedRouteSnapshot): boolean {
    let currentSnapshot: ActivatedRouteSnapshot | null = snapshot;

    while (currentSnapshot) {
      if (currentSnapshot.data['adminShellMode'] === 'focused-editor')
        return true;

      currentSnapshot = currentSnapshot.firstChild;
    }

    return this.router.parseUrl(this.router.url).queryParams['editor'] === 'visual';
  }
}
