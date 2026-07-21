import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, Validators } from '@angular/forms';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteSection } from '@shared/models/site-section.model';
import { SiteTemplateId } from '@shared/models/site-template-id.type';
import { ThemeConfig } from '@shared/models/theme-config.model';
import { ConfirmationService } from 'primeng/api';

import { ContentSectionEditorItem } from './models/content-section-editor-item.model';
import { ContentDraftService } from './services/content-draft.service';
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
  private isHydrating = false;
  private hydratedDraft: SiteConfigV1 | null = null;

  protected readonly draftService = inject(ContentDraftService);
  protected readonly sectionItems = signal<ContentSectionEditorItem[]>([]);
  protected readonly contentForm = this.formBuilder.nonNullable.group({
    identity: this.formBuilder.nonNullable.group({
      brandName: ['', [Validators.required, Validators.maxLength(80)]],
      descriptor: ['', [Validators.required, Validators.maxLength(120)]],
      canonicalUrl: ['', [Validators.required, Validators.pattern(/^https:\/\/.+/)]],
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
        imageAlt: ['', [Validators.required, Validators.maxLength(180)]],
      }),
      twitter: this.formBuilder.nonNullable.group({
        title: ['', [Validators.required, Validators.maxLength(70)]],
        description: ['', [Validators.required, Validators.maxLength(200)]],
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

  protected readonly colorFields = [
    {
      id: 'theme-accent',
      label: $localize`:@@admin.content.theme.accent:Destaque`,
      control: this.contentForm.controls.theme.controls.colors.controls.accent,
    },
    {
      id: 'theme-accent-soft',
      label: $localize`:@@admin.content.theme.accentSoft:Destaque suave`,
      control: this.contentForm.controls.theme.controls.colors.controls.accentSoft,
    },
    {
      id: 'theme-ink',
      label: $localize`:@@admin.content.theme.ink:Tinta`,
      control: this.contentForm.controls.theme.controls.colors.controls.ink,
    },
    {
      id: 'theme-ink-deep',
      label: $localize`:@@admin.content.theme.inkDeep:Tinta profunda`,
      control: this.contentForm.controls.theme.controls.colors.controls.inkDeep,
    },
    {
      id: 'theme-surface-muted',
      label: $localize`:@@admin.content.theme.surfaceMuted:Fundo secundário`,
      control: this.contentForm.controls.theme.controls.colors.controls.surfaceMuted,
    },
    {
      id: 'theme-surface',
      label: $localize`:@@admin.content.theme.surface:Fundo principal`,
      control: this.contentForm.controls.theme.controls.colors.controls.surface,
    },
    {
      id: 'theme-text-muted',
      label: $localize`:@@admin.content.theme.textMuted:Texto secundário`,
      control: this.contentForm.controls.theme.controls.colors.controls.textMuted,
    },
    {
      id: 'theme-border',
      label: $localize`:@@admin.content.theme.border:Bordas`,
      control: this.contentForm.controls.theme.controls.colors.controls.border,
    },
    {
      id: 'theme-focus',
      label: $localize`:@@admin.content.theme.focus:Foco`,
      control: this.contentForm.controls.theme.controls.colors.controls.focus,
    },
  ];

  protected readonly layoutFields = [
    {
      id: 'theme-content-width',
      label: $localize`:@@admin.content.theme.contentWidth:Largura máxima`,
      suffix: ' px',
      control: this.contentForm.controls.theme.controls.layout.controls.contentMaxWidthPx,
    },
    {
      id: 'theme-gutter-min',
      label: $localize`:@@admin.content.theme.gutterMin:Margem mínima`,
      suffix: ' px',
      control: this.contentForm.controls.theme.controls.layout.controls.pageGutterMinPx,
    },
    {
      id: 'theme-gutter-preferred',
      label: $localize`:@@admin.content.theme.gutterPreferred:Margem fluida`,
      suffix: ' vw',
      control: this.contentForm.controls.theme.controls.layout.controls.pageGutterPreferredVw,
    },
    {
      id: 'theme-gutter-max',
      label: $localize`:@@admin.content.theme.gutterMax:Margem máxima`,
      suffix: ' px',
      control: this.contentForm.controls.theme.controls.layout.controls.pageGutterMaxPx,
    },
  ];

  protected readonly motionFields = [
    {
      id: 'theme-reveal-duration',
      label: $localize`:@@admin.content.theme.revealDuration:Duração da revelação`,
      control: this.contentForm.controls.theme.controls.motion.controls.revealDurationMs,
    },
    {
      id: 'theme-transform-duration',
      label: $localize`:@@admin.content.theme.transformDuration:Duração do movimento`,
      control: this.contentForm.controls.theme.controls.motion.controls.revealTransformDurationMs,
    },
  ];

  protected readonly trackSection = (_index: number, item: ContentSectionEditorItem): string =>
    item.id;

  public constructor() {
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

  protected handleSectionReorder(): void {
    const reorderedItems = this.sectionItems().map((item, index) => ({
      ...item,
      section: {
        ...item.section,
        order: (index + 1) * 10,
      },
    }));

    this.sectionItems.set(reorderedItems);
    this.syncSectionsToDraft(reorderedItems);
  }

  protected handleSectionVisibilityChange(item: ContentSectionEditorItem): void {
    const updatedItems = this.sectionItems().map((currentItem) => {
      if (currentItem.id !== item.id)
        return currentItem;

      return {
        ...currentItem,
        section: {
          ...currentItem.section,
          visible: item.visibilityControl.value,
        },
      };
    });

    this.sectionItems.set(updatedItems);
    this.syncSectionsToDraft(updatedItems);
  }

  protected handleConfigChange(config: SiteConfigV1): void {
    this.draftService.updateDraft(config);
  }

  protected handleSectionContentChange(section: SiteSection): void {
    const updatedItems = this.sectionItems().map((item) => item.id === section.id
      ? { ...item, section }
      : item);
    this.sectionItems.set(updatedItems);
    this.syncSectionsToDraft(updatedItems);
  }

  protected handleTemplateChange(theme: ThemeConfig): void {
    this.contentForm.controls.theme.setValue({
      presetId: theme.presetId,
      colors: { ...theme.colors },
      typography: { ...theme.typography },
      layout: { ...theme.layout },
      motion: { ...theme.motion },
    });
  }

  private hydrateEditor(draft: SiteConfigV1): void {
    this.isHydrating = true;
    this.hydratedDraft = draft;

    this.contentForm.setValue({
      identity: {
        brandName: draft.identity.brandName,
        descriptor: draft.identity.descriptor,
        canonicalUrl: draft.identity.canonicalUrl,
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
          imageAlt: draft.seo.openGraph.imageAlt,
        },
        twitter: {
          title: draft.seo.twitter.title,
          description: draft.seo.twitter.description,
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

    const sectionItems = [...draft.sections]
      .sort((firstSection, secondSection) => firstSection.order - secondSection.order)
      .map((section) => this.createSectionItem(section));

    this.sectionItems.set(sectionItems);
    this.contentForm.markAsPristine();
    this.isHydrating = false;
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
      label: this.getSectionLabel(section),
      section,
      visibilityControl: new FormControl(section.visible, { nonNullable: true }),
    };
  }

  private getSectionLabel(section: SiteSection): string {
    switch (section.type) {
      case 'hero':
        return $localize`:@@admin.content.section.hero:Abertura`;
      case 'manifesto':
        return $localize`:@@admin.content.section.manifesto:Manifesto`;
      case 'practice':
        return $localize`:@@admin.content.section.practice:Atuação`;
      case 'portfolio':
        return $localize`:@@admin.content.section.portfolio:Portfólio`;
      case 'metrics':
        return $localize`:@@admin.content.section.metrics:Indicadores`;
      case 'about':
        return $localize`:@@admin.content.section.about:Sobre`;
      case 'process':
        return $localize`:@@admin.content.section.process:Processo`;
      case 'contact':
        return $localize`:@@admin.content.section.contact:Contato`;
    }
  }
}
