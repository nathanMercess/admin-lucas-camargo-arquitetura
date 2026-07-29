import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaAsset } from '@shared/models/media-asset.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteSection } from '@shared/models/site-section.model';
import { SiteTemplateId } from '@shared/models/site-template-id.type';
import { ThemeConfig } from '@shared/models/theme-config.model';
import { VisualBuilderDocument } from '@shared/models/visual-builder-document.model';
import { ConfirmationService } from 'primeng/api';

import { PublicationService } from '../publications/services/publication.service';
import { ContentSectionEditorItem } from './models/content-section-editor-item.model';
import { SitePageDefinition } from './models/site-page-definition.model';
import { ContentDraftService } from './services/content-draft.service';
import { SiteSectionRegistryService } from './services/site-section-registry.service';
import { approvedThemeColorValidator } from './validators/approved-theme-color.validator';

@Component({
  selector: 'app-content-editor',
  templateUrl: './content-editor.component.html',
  styleUrl: './content-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class ContentEditorComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly activatedRoute = inject(ActivatedRoute, { optional: true });
  private readonly router = inject(Router);
  private readonly sectionRegistry = inject(SiteSectionRegistryService);
  protected readonly publicationService = inject(PublicationService);
  private isHydrating = false;
  private hydratedDraft: SiteConfigV1 | null = null;

  protected readonly draftService = inject(ContentDraftService);
  protected readonly activeTab = signal<string>('section-content');
  protected readonly layoutChoice = signal<'gallery' | 'balanced' | 'spacious'>('balanced');
  protected readonly motionChoice = signal<'off' | 'soft' | 'expressive'>('soft');
  protected readonly focusedSectionId = signal<string | null>(null);
  protected readonly sectionItems = signal<ContentSectionEditorItem[]>([]);
  protected readonly sectionDefinitions = [...this.sectionRegistry.definitions];
  protected readonly newSectionType = signal<SiteSection['type']>('manifesto');
  protected readonly contentForm = this.formBuilder.nonNullable.group({
    identity: this.formBuilder.nonNullable.group({
      brandName: ['', [Validators.required, Validators.maxLength(80)]],
      descriptor: ['', [Validators.required, Validators.maxLength(120)]],
      canonicalUrl: ['', [Validators.required, Validators.pattern(/^https:\/\/.+/)]],
      logoLightMediaId: ['', Validators.required],
      logoDarkMediaId: ['', Validators.required],
      faviconMediaId: ['', Validators.required],
    }),
    seo: this.formBuilder.nonNullable.group({
      title: ['', [Validators.required, Validators.maxLength(70)]],
      description: ['', [Validators.required, Validators.maxLength(170)]],
      canonicalUrl: ['', [Validators.required, Validators.pattern(/^https:\/\/.+/)]],
      robots: ['', Validators.required],
      themeColor: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      openGraph: this.formBuilder.nonNullable.group({
        title: ['', [Validators.required, Validators.maxLength(70)]],
        description: ['', [Validators.required, Validators.maxLength(200)]],
        imageMediaId: ['', Validators.required],
        imageAlt: ['', [Validators.required, Validators.maxLength(180)]],
      }),
      twitter: this.formBuilder.nonNullable.group({
        title: ['', [Validators.required, Validators.maxLength(70)]],
        description: ['', [Validators.required, Validators.maxLength(200)]],
        imageMediaId: ['', Validators.required],
        imageAlt: ['', [Validators.required, Validators.maxLength(180)]],
      }),
      organization: this.formBuilder.nonNullable.group({
        name: ['', [Validators.required, Validators.maxLength(120)]],
        url: ['', [Validators.required, Validators.pattern(/^https:\/\/.+/)]],
        email: ['', [Validators.required, Validators.email]],
        telephone: ['', [Validators.required, Validators.maxLength(30)]],
        addressLocality: ['', [Validators.required, Validators.maxLength(80)]],
        addressRegion: ['', [Validators.required, Validators.maxLength(80)]],
        addressCountry: ['', [Validators.required, Validators.maxLength(2)]],
      }),
    }),
    theme: this.formBuilder.nonNullable.group({
      presetId: this.formBuilder.nonNullable.control<SiteTemplateId>('lucas-camargo-v1', {
        validators: [Validators.required],
      }),
      colors: this.formBuilder.nonNullable.group({
        accent: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        accentSoft: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        ink: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        inkDeep: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        surfaceMuted: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        surface: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        textMuted: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
        border: ['', [Validators.required, approvedThemeColorValidator]],
        focus: ['', [Validators.required, Validators.pattern(/^#[0-9a-fA-F]{6}$/)]],
      }),
      typography: this.formBuilder.nonNullable.group({
        brandFontFamily: ['', Validators.required],
        dataFontFamily: ['', Validators.required],
      }),
      layout: this.formBuilder.nonNullable.group({
        contentMaxWidthPx: [1440, [Validators.required, Validators.min(320)]],
        pageGutterMinPx: [20, [Validators.required, Validators.min(0)]],
        pageGutterPreferredVw: [5, [Validators.required, Validators.min(0)]],
        pageGutterMaxPx: [80, [Validators.required, Validators.min(0)]],
      }),
      motion: this.formBuilder.nonNullable.group({
        revealEnabled: [true],
        revealDurationMs: [700, [Validators.required, Validators.min(0)]],
        revealTransformDurationMs: [900, [Validators.required, Validators.min(0)]],
      }),
    }),
  });

  protected readonly saveLabel = computed(() =>
    this.draftService.developmentFallback()
      ? $localize`:@@admin.content.applyLocally:Aplicar localmente`
      : $localize`:@@admin.content.saveDraft:Salvar rascunho`,
  );

  protected readonly themePreviewTitle = computed(() => {
    const hero = this.draftService.draft()?.sections.find((section) => section.type === 'hero');

    if (!hero || hero.type !== 'hero')
      return $localize`:@@admin.content.previewFallback:Espaços que permanecem.`;

    return hero.title.lines
      .map((line) => line.segments.map((segment) => segment.text).join(''))
      .join(' ');
  });

  protected readonly themePreviewSupportingText = computed(() => {
    const hero = this.draftService.draft()?.sections.find((section) => section.type === 'hero');

    if (!hero || hero.type !== 'hero')
      return '';

    return hero.supportingText.lines
      .map((line) => line.segments.map((segment) => segment.text).join(''))
      .join(' ');
  });

  protected readonly colorFields = [
    {
      id: 'theme-accent',
      label: $localize`:@@admin.content.theme.accent:Destaque`,
      control: this.contentForm.controls.theme.controls.colors.controls.accent,
      advanced: false,
    },
    {
      id: 'theme-accent-soft',
      label: $localize`:@@admin.content.theme.accentSoft:Destaque suave`,
      control: this.contentForm.controls.theme.controls.colors.controls.accentSoft,
      advanced: true,
    },
    {
      id: 'theme-ink',
      label: $localize`:@@admin.content.theme.ink:Texto principal`,
      control: this.contentForm.controls.theme.controls.colors.controls.ink,
      advanced: false,
    },
    {
      id: 'theme-ink-deep',
      label: $localize`:@@admin.content.theme.inkDeep:Texto de alto contraste`,
      control: this.contentForm.controls.theme.controls.colors.controls.inkDeep,
      advanced: true,
    },
    {
      id: 'theme-surface-muted',
      label: $localize`:@@admin.content.theme.surfaceMuted:Fundo secundário`,
      control: this.contentForm.controls.theme.controls.colors.controls.surfaceMuted,
      advanced: true,
    },
    {
      id: 'theme-surface',
      label: $localize`:@@admin.content.theme.surface:Fundo principal`,
      control: this.contentForm.controls.theme.controls.colors.controls.surface,
      advanced: false,
    },
    {
      id: 'theme-text-muted',
      label: $localize`:@@admin.content.theme.textMuted:Texto secundário`,
      control: this.contentForm.controls.theme.controls.colors.controls.textMuted,
      advanced: true,
    },
    {
      id: 'theme-border',
      label: $localize`:@@admin.content.theme.border:Linhas e divisões`,
      control: this.contentForm.controls.theme.controls.colors.controls.border,
      advanced: true,
    },
    {
      id: 'theme-focus',
      label: $localize`:@@admin.content.theme.focus:Contorno ao navegar`,
      control: this.contentForm.controls.theme.controls.colors.controls.focus,
      advanced: true,
    },
  ];

  public constructor() {
    (this.activatedRoute?.queryParamMap ?? this.router.routerState.root.queryParamMap)
      .pipe(takeUntilDestroyed())
      .subscribe((parameters) => {
        this.activeTab.set(parameters.get('editor') === 'visual' ? 'sections' : 'section-content');
      });

    this.contentForm.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.syncDraftFromForm());

    effect(() => {
      const draft = this.draftService.draft();

      if (!draft || this.draftService.dirty() || draft === this.hydratedDraft)
        return;

      this.hydrateEditor(draft);
    });
  }

  public ngOnInit(): void {
    this.draftService.load();
  }

  @HostListener('window:beforeunload', ['$event'])
  public handleBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.draftService.dirty())
      return;

    event.preventDefault();
    event.returnValue = '';
  }

  public hasUnsavedChanges(): boolean {
    return this.draftService.dirty();
  }

  protected saveDraft(): void {
    if (this.contentForm.invalid) {
      this.contentForm.markAllAsTouched();
      return;
    }

    this.syncDraftFromForm();
    this.draftService.save();
  }

  protected requestReload(): void {
    if (!this.draftService.dirty()) {
      this.draftService.load();
      return;
    }

    this.confirmationService.confirm({
      header: $localize`:@@admin.content.reloadConfirmTitle:Descartar alterações?`,
      message: $localize`:@@admin.content.reloadConfirmMessage:As alterações ainda não salvas serão perdidas.`,
      acceptLabel: $localize`:@@admin.content.reloadConfirmAccept:Descartar e recarregar`,
      rejectLabel: $localize`:@@admin.content.reloadConfirmReject:Continuar editando`,
      accept: () => this.draftService.load(),
    });
  }

  protected showError(control: AbstractControl): boolean {
    return control.invalid && (control.dirty || control.touched);
  }

  protected getPageStatusLabel(status: SitePageDefinition['status']): string {
    switch (status) {
      case 'available':
        return $localize`:@@admin.pages.status.available:Disponível no site`;
      case 'empty':
        return $localize`:@@admin.pages.status.empty:Aguardando conteúdo`;
      case 'hidden':
        return $localize`:@@admin.pages.status.hidden:Oculta no site`;
    }
  }

  protected getPageEditorAreaLabel(editorArea: SitePageDefinition['editorArea']): string {
    switch (editorArea) {
      case 'content':
        return $localize`:@@admin.pages.area.content:Conteúdo e editor visual`;
      case 'projects':
        return $localize`:@@admin.pages.area.projects:Projetos e categorias`;
      case 'system':
        return $localize`:@@admin.pages.area.system:Roteamento do site`;
    }
  }

  protected getPageKindLabel(page: SitePageDefinition): string {
    switch (page.kind) {
      case 'concrete-page':
        return $localize`:@@admin.pages.kind.concrete:Página concreta`;
      case 'shared-template':
        return $localize`:@@admin.pages.kind.template:Template compartilhado`;
      case 'dynamic-data':
        return $localize`:@@admin.pages.kind.dynamic:Dados dinâmicos`;
      case 'system-page':
        return $localize`:@@admin.pages.kind.system:Página de sistema`;
    }
  }

  protected getPageRouteLabel(page: SitePageDefinition): string {
    switch (page.routeKind) {
      case 'fixed':
        return page.listedInNavigation
          ? $localize`:@@admin.pages.route.fixedMenu:Rota fixa · no menu`
          : $localize`:@@admin.pages.route.fixedOutside:Rota fixa · fora do menu`;
      case 'parameterized':
        return $localize`:@@admin.pages.route.parameterized:Rota parametrizada · fora do menu`;
      case 'dynamic':
        return page.listedInNavigation
          ? $localize`:@@admin.pages.route.dynamicMenu:Rota dinâmica · no menu`
          : $localize`:@@admin.pages.route.dynamic:Rota dinâmica · fora do menu`;
      case 'fallback':
        return $localize`:@@admin.pages.route.fallback:Fallback 404 · fora do menu`;
    }
  }

  protected getPageDataSourceLabel(dataSource: SitePageDefinition['dataSource']): string {
    switch (dataSource) {
      case 'site-sections':
        return $localize`:@@admin.pages.source.sections:Seções da página inicial`;
      case 'portfolio-index':
        return $localize`:@@admin.pages.source.portfolio:Categorias e projetos`;
      case 'portfolio-categories':
        return $localize`:@@admin.pages.source.categories:Cadastro de categorias`;
      case 'portfolio-projects':
        return $localize`:@@admin.pages.source.projects:Cadastro de projetos e galerias`;
      case 'router':
        return $localize`:@@admin.pages.source.router:Roteador público`;
    }
  }

  protected getPageActionLabel(page: SitePageDefinition): string {
    if (page.editorArea === 'content')
      return $localize`:@@admin.pages.action.edit:Editar layout e seções`;

    if (page.kind === 'shared-template')
      return $localize`:@@admin.pages.action.editTemplate:Editar dados do template`;

    return $localize`:@@admin.pages.action.manageData:Editar dados`;
  }

  protected getPagePreviewUrl(page: SitePageDefinition): string | null {
    const canonicalUrl = this.draftService.draft()?.identity.canonicalUrl;

    if (!canonicalUrl || page.routeKind === 'parameterized' || page.routeKind === 'fallback')
      return null;

    try {
      return new URL(page.route, canonicalUrl).toString();
    } catch {
      return null;
    }
  }

  protected openPageEditor(page: SitePageDefinition): void {
    if (page.editorArea === 'content') {
      this.changeActiveTab('sections');
      return;
    }

    if (page.editorArea === 'system')
      return;

    void this.router.navigate(['/projects']);
  }

  protected openProjects(): void {
    void this.router.navigate(['/projects']);
  }

  protected changeActiveTab(tab: string | number | undefined): void {
    if (typeof tab !== 'string')
      return;

    const editor = tab === 'sections' ? 'visual' : null;

    this.activeTab.set(tab);
    if (!this.activatedRoute)
      return;

    void this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: { editor },
      queryParamsHandling: 'merge',
    });
  }

  protected addSection(): void {
    const sections = this.sectionItems().map((item) => item.section);
    const section = this.sectionRegistry.create(this.newSectionType(), sections);

    this.replaceSections([...sections, section], section.id);
  }

  protected moveSection(sectionId: string, offset: -1 | 1): void {
    const sections = this.sectionItems().map((item) => item.section);
    const index = sections.findIndex((section) => section.id === sectionId);
    const destination = index + offset;

    if (index < 0 || destination < 0 || destination >= sections.length)
      return;

    const reorderedSections = [...sections];
    const [section] = reorderedSections.splice(index, 1);

    if (!section)
      return;

    reorderedSections.splice(destination, 0, section);
    this.replaceSections(reorderedSections, sectionId);
  }

  protected duplicateSection(sectionId: string): void {
    const sections = this.sectionItems().map((item) => item.section);
    const index = sections.findIndex((section) => section.id === sectionId);
    const source = sections[index];

    if (!source)
      return;

    const duplicate = this.sectionRegistry.duplicate(source, sections);
    const updatedSections = [...sections];
    updatedSections.splice(index + 1, 0, duplicate);
    this.replaceSections(updatedSections, duplicate.id);
  }

  protected requestSectionRemoval(sectionId: string): void {
    const item = this.sectionItems().find((sectionItem) => sectionItem.id === sectionId);

    if (!item)
      return;

    this.confirmationService.confirm({
      header: $localize`:@@admin.content.removeSectionTitle:Excluir esta seção?`,
      message: $localize`:@@admin.content.removeSectionMessage:A seção ${item.label}:sectionLabel: e seu conteúdo serão removidos do rascunho.`,
      acceptLabel: $localize`:@@admin.content.removeSectionAccept:Excluir seção`,
      rejectLabel: $localize`:@@admin.content.removeSectionReject:Cancelar`,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const sections = this.sectionItems()
          .filter((sectionItem) => sectionItem.id !== sectionId)
          .map((sectionItem) => sectionItem.section);
        this.replaceSections(sections, sections[0]?.id ?? null);
      },
    });
  }

  protected handleConfigChange(config: SiteConfigV1): void {
    this.draftService.updateDraft(config);
  }

  protected registerUploadedAsset(asset: MediaAsset): void {
    this.draftService.registerMediaAsset(asset);
  }

  protected handleSectionContentChange(section: SiteSection): void {
    const updatedItems = this.sectionItems().map((item) => item.id === section.id
      ? { ...item, section }
      : item);
    this.sectionItems.set(updatedItems);
    this.syncSectionsToDraft(updatedItems);
  }

  protected handleTemplateChange(theme: ThemeConfig): void {
    this.syncVisualChoices(theme);
    this.contentForm.controls.theme.setValue({
      presetId: theme.presetId,
      colors: { ...theme.colors },
      typography: { ...theme.typography },
      layout: { ...theme.layout },
      motion: { ...theme.motion },
    });
  }

  protected handleVisualBuilderChange(document: VisualBuilderDocument): void {
    const draft = this.draftService.draft();

    if (!draft)
      return;

    this.draftService.updateDraft({
      ...draft,
      visualBuilder: {
        ...document,
        enabled: draft.visualBuilder?.enabled ?? false,
      },
    });
  }

  protected publishDraft(): void {
    const etag = this.draftService.etag();

    if (!etag || this.draftService.dirty())
      return;

    this.confirmationService.confirm({
      header: $localize`:@@admin.content.publishTitle:Publicar esta página?`,
      message: $localize`:@@admin.content.publishMessage:A versão salva será validada e passará a ser usada no site público.`,
      acceptLabel: $localize`:@@admin.content.publishAccept:Publicar agora`,
      rejectLabel: $localize`:@@admin.content.publishReject:Cancelar`,
      accept: () => this.publicationService.publish(etag, () => this.draftService.load()),
    });
  }

  protected customizeTemplate(theme: ThemeConfig): void {
    this.handleTemplateChange(theme);
    this.activeTab.set('appearance');
  }

  protected applyLayoutChoice(choice: 'gallery' | 'balanced' | 'spacious'): void {
    const layouts = {
      gallery: { contentMaxWidthPx: 1760, pageGutterMinPx: 16, pageGutterPreferredVw: 3, pageGutterMaxPx: 52 },
      balanced: { contentMaxWidthPx: 1440, pageGutterMinPx: 22, pageGutterPreferredVw: 4.5, pageGutterMaxPx: 76 },
      spacious: { contentMaxWidthPx: 1160, pageGutterMinPx: 24, pageGutterPreferredVw: 6, pageGutterMaxPx: 104 },
    } as const;

    this.layoutChoice.set(choice);
    this.contentForm.controls.theme.controls.layout.setValue(layouts[choice]);
  }

  protected applyMotionChoice(choice: 'off' | 'soft' | 'expressive'): void {
    const motions = {
      off: { revealEnabled: false, revealDurationMs: 0, revealTransformDurationMs: 0 },
      soft: { revealEnabled: true, revealDurationMs: 550, revealTransformDurationMs: 800 },
      expressive: { revealEnabled: true, revealDurationMs: 850, revealTransformDurationMs: 1100 },
    } as const;

    this.motionChoice.set(choice);
    this.contentForm.controls.theme.controls.motion.setValue(motions[choice]);
  }

  private hydrateEditor(draft: SiteConfigV1): void {
    this.isHydrating = true;
    this.hydratedDraft = draft;

    this.contentForm.setValue({
      identity: {
        brandName: draft.identity.brandName,
        descriptor: draft.identity.descriptor,
        canonicalUrl: draft.identity.canonicalUrl,
        logoLightMediaId: draft.identity.logoLightMediaId,
        logoDarkMediaId: draft.identity.logoDarkMediaId,
        faviconMediaId: draft.identity.faviconMediaId,
      },
      seo: {
        title: draft.seo.title,
        description: draft.seo.description,
        canonicalUrl: draft.seo.canonicalUrl,
        robots: draft.seo.robots,
        themeColor: draft.seo.themeColor,
        openGraph: {
          title: draft.seo.openGraph.title,
          description: draft.seo.openGraph.description,
          imageMediaId: draft.seo.openGraph.imageMediaId,
          imageAlt: draft.seo.openGraph.imageAlt,
        },
        twitter: {
          title: draft.seo.twitter.title,
          description: draft.seo.twitter.description,
          imageMediaId: draft.seo.twitter.imageMediaId,
          imageAlt: draft.seo.twitter.imageAlt,
        },
        organization: {
          name: draft.seo.organization.name,
          url: draft.seo.organization.url,
          email: draft.seo.organization.email,
          telephone: draft.seo.organization.telephone,
          addressLocality: draft.seo.organization.addressLocality,
          addressRegion: draft.seo.organization.addressRegion,
          addressCountry: draft.seo.organization.addressCountry,
        },
      },
      theme: {
        presetId: draft.theme.presetId,
        colors: { ...draft.theme.colors },
        typography: { ...draft.theme.typography },
        layout: { ...draft.theme.layout },
        motion: { ...draft.theme.motion },
      },
    });
    this.syncVisualChoices(draft.theme);

    const sectionItems = [...draft.sections]
      .sort((firstSection, secondSection) => firstSection.order - secondSection.order)
      .map((section) => this.createSectionItem(section));

    this.sectionItems.set(sectionItems);
    if (!sectionItems.some((item) => item.id === this.focusedSectionId()))
      this.focusedSectionId.set(sectionItems[0]?.id ?? null);
    this.contentForm.markAsPristine();
    this.isHydrating = false;
  }

  private syncVisualChoices(theme: ThemeConfig): void {
    const width = theme.layout.contentMaxWidthPx;
    this.layoutChoice.set(width >= 1600 ? 'gallery' : width <= 1250 ? 'spacious' : 'balanced');

    if (!theme.motion.revealEnabled)
      this.motionChoice.set('off');
    else
      this.motionChoice.set(theme.motion.revealDurationMs >= 800 ? 'expressive' : 'soft');
  }

  private syncDraftFromForm(): void {
    if (this.isHydrating)
      return;

    const draft = this.draftService.draft();

    if (!draft)
      return;

    const value = this.contentForm.getRawValue();
    const updatedDraft: SiteConfigV1 = {
      ...draft,
      identity: {
        ...draft.identity,
        ...value.identity,
      },
      seo: {
        ...draft.seo,
        title: value.seo.title,
        description: value.seo.description,
        canonicalUrl: value.seo.canonicalUrl,
        robots: value.seo.robots,
        themeColor: value.seo.themeColor,
        openGraph: {
          ...draft.seo.openGraph,
          ...value.seo.openGraph,
        },
        twitter: {
          ...draft.seo.twitter,
          ...value.seo.twitter,
        },
        organization: {
          ...draft.seo.organization,
          ...value.seo.organization,
        },
      },
      theme: {
        ...draft.theme,
        presetId: value.theme.presetId,
        colors: value.theme.colors,
        typography: value.theme.typography,
        layout: value.theme.layout,
        motion: value.theme.motion,
      },
    };

    this.draftService.updateDraft(updatedDraft);
  }

  private syncSectionsToDraft(items: readonly ContentSectionEditorItem[]): void {
    const draft = this.draftService.draft();

    if (!draft)
      return;

    this.draftService.updateDraft({
      ...draft,
      sections: items.map((item) => item.section),
    });
  }

  private createSectionItem(section: SiteSection): ContentSectionEditorItem {
    return {
      id: section.id,
      label: this.sectionRegistry.label(section.type),
      section,
      visibilityControl: new FormControl(section.visible, { nonNullable: true }),
    };
  }

  private replaceSections(sections: readonly SiteSection[], focusedSectionId: string | null): void {
    const items = this.sectionRegistry.normalizeOrder(sections)
      .map((section) => this.createSectionItem(section));

    this.sectionItems.set(items);
    this.focusedSectionId.set(focusedSectionId);
    this.syncSectionsToDraft(items);
  }
}
