import { CdkDrag, CdkDragDrop } from '@angular/cdk/drag-drop';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ContactFormSectionConfig } from '@shared/models/contact-form-section-config.model';
import { HeroSectionConfig } from '@shared/models/hero-section-config.model';
import { MediaAsset } from '@shared/models/media-asset.model';
import { ProjectGridSectionConfig } from '@shared/models/project-grid-section-config.model';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';
import { SiteContact } from '@shared/models/site-contact.model';
import { SitePageV2 } from '@shared/models/site-page-v2.model';
import { SiteSectionV2 } from '@shared/models/site-section-v2.model';
import { SiteTemplateId } from '@shared/models/site-template-id.type';
import { ThemeConfig } from '@shared/models/theme-config.model';
import { WhatsappCtaSectionConfig } from '@shared/models/whatsapp-cta-section-config.model';
import { ConfirmationService } from 'primeng/api';

import { SiteV2BuilderSelection } from '../../models/site-v2-builder-selection.model';
import { SiteV2SectionDefinition } from '../../models/site-v2-section-definition.model';
import { SiteV2BuilderService } from '../../services/site-v2-builder.service';

type ContactFormTextField =
  | 'nameLabel'
  | 'emailLabel'
  | 'phoneLabel'
  | 'subjectLabel'
  | 'messageLabel'
  | 'submitLabel'
  | 'successMessage'
  | 'errorMessage'
  | 'privacyNotice';

type BuilderView = 'content' | 'templates' | 'preview' | 'settings';

@Component({
  selector: 'app-site-v2-builder',
  templateUrl: './site-v2-builder.component.html',
  styleUrl: './site-v2-builder.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SiteV2BuilderComponent {
  private readonly builder = inject(SiteV2BuilderService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly browserDocument = inject(DOCUMENT);
  private handledTemplateId: SiteTemplateId | null = null;

  public readonly document = input.required<SiteConfigV2>();
  public readonly dirty = input(false);
  public readonly saving = input(false);
  public readonly saveError = input<string | null>(null);
  public readonly initialTemplateId = input<SiteTemplateId | null>(null);
  public readonly documentChange = output<SiteConfigV2>();
  public readonly save = output<void>();
  public readonly back = output<void>();
  public readonly templateEntryConsumed = output<void>();

  protected readonly sectionDefinitions = this.builder.sectionDefinitions;
  protected readonly activePageId = signal('');
  protected readonly selection = signal<SiteV2BuilderSelection | null>(null);
  protected readonly device = signal<'desktop' | 'mobile'>('desktop');
  protected readonly view = signal<BuilderView>('content');
  protected readonly operationMessage = signal<string | null>(null);
  protected readonly pages = computed(() => [...this.document().pages]
    .sort((first, second) => first.order - second.order));
  protected readonly activePage = computed(() => this.pages()
    .find((page) => page.id === this.activePageId()) ?? this.pages()[0] ?? null);
  protected readonly selectedSection = computed(() => {
    const selection = this.selection();
    const page = this.activePage();

    if (!page || selection?.kind !== 'section' || selection.pageId !== page.id)
      return null;

    return page.sections.find((section) => section.id === selection.sectionId) ?? null;
  });
  protected readonly selectedPage = computed(() => {
    const selection = this.selection();

    if (selection?.kind !== 'page')
      return null;

    return this.pages().find((page) => page.id === selection.pageId) ?? null;
  });
  protected readonly mediaAssets = computed(() => [...this.document().media]);
  protected readonly projects = computed(() => [...this.document().projects]
    .sort((first, second) => first.order - second.order));
  protected readonly heroDropIds = computed(() => (this.activePage()?.sections ?? [])
    .filter((section) => section.type === 'hero')
    .map((section) => this.heroMediaDropId(section.id)));
  protected readonly mediaDropPredicate = (drag: CdkDrag<unknown>): boolean =>
    this.isMediaAsset(drag.data);

  public constructor() {
    effect(() => {
      const initialTemplateId = this.initialTemplateId();

      if (initialTemplateId && initialTemplateId !== this.handledTemplateId) {
        this.handledTemplateId = initialTemplateId;
        this.view.set('templates');
      } else if (!initialTemplateId) {
        this.handledTemplateId = null;
      }

      const pages = this.pages();
      const activePage = pages.find((page) => page.id === this.activePageId()) ?? pages[0];

      if (!activePage)
        return;

      if (activePage.id !== this.activePageId())
        this.activePageId.set(activePage.id);

      const selection = this.selection();

      if (!selection || selection.pageId !== activePage.id) {
        const firstSection = [...activePage.sections].sort((first, second) => first.order - second.order)[0];

        this.selection.set(firstSection
          ? { kind: 'section', pageId: activePage.id, sectionId: firstSection.id }
          : { kind: 'page', pageId: activePage.id });
      }
    });
  }

  protected applyTheme(theme: ThemeConfig): void {
    this.emit({ ...this.document(), theme: structuredClone(theme) });
    this.templateEntryConsumed.emit();
  }

  protected selectPage(pageId: string): void {
    const page = this.pages().find((candidate) => candidate.id === pageId);
    const firstSection = page === undefined
      ? undefined
      : [...page.sections].sort((first, second) => first.order - second.order)[0];

    this.activePageId.set(pageId);
    this.selection.set(firstSection
      ? { kind: 'section', pageId, sectionId: firstSection.id }
      : { kind: 'page', pageId });
    this.view.set('content');
  }

  protected selectSection(sectionId: string): void {
    const page = this.activePage();

    if (!page)
      return;

    this.selection.set({ kind: 'section', pageId: page.id, sectionId });
    this.view.set('content');
  }

  protected addPage(): void {
    const updated = this.builder.createPage(this.document());
    const page = updated.pages[updated.pages.length - 1];

    this.emit(updated);

    if (page)
      this.selectPage(page.id);
  }

  protected requestRemovePage(page: SitePageV2): void {
    if (this.document().pages.length <= 1) {
      this.operationMessage.set(
        $localize`:@@admin.v2.page.keepOne:O site precisa manter ao menos uma página.`,
      );
      return;
    }

    this.confirmationService.confirm({
      header: $localize`:@@admin.v2.page.removeTitle:Excluir esta página?`,
      message: $localize`:@@admin.v2.page.removeMessage:A página e suas seções serão removidas do rascunho.`,
      acceptLabel: $localize`:@@admin.v2.page.removeAccept:Excluir página`,
      rejectLabel: $localize`:@@admin.v2.cancel:Cancelar`,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        const updated = this.builder.removePage(this.document(), page.id);
        this.emit(updated);
        this.selectPage(updated.pages[0]?.id ?? '');
      },
    });
  }

  protected dropPage(event: CdkDragDrop<SitePageV2[]>): void {
    if (event.previousIndex === event.currentIndex)
      return;

    this.emit(this.builder.reorderPages(this.document(), event.previousIndex, event.currentIndex));
  }

  protected dropSection(event: CdkDragDrop<readonly SiteSectionV2[]>): void {
    const page = this.activePage();

    if (!page)
      return;

    if (event.previousContainer === event.container) {
      if (event.previousIndex !== event.currentIndex)
        this.emit(this.builder.reorderSections(
          this.document(),
          page.id,
          event.previousIndex,
          event.currentIndex,
        ));
      return;
    }

    const definition = event.item.data;

    if (!this.isSectionDefinition(definition))
      return;

    try {
      const updated = this.builder.addSection(
        this.document(),
        page.id,
        definition.type,
        event.currentIndex,
      );
      this.emit(updated);
      const section = updated.pages
        .find((current) => current.id === page.id)?.sections[event.currentIndex];

      if (section)
        this.selectSection(section.id);
    } catch (error) {
      this.operationMessage.set(error instanceof Error ? error.message : 'Não foi possível adicionar a seção.');
    }
  }

  protected addSection(definition: SiteV2SectionDefinition): void {
    const page = this.activePage();

    if (!page)
      return;

    try {
      const updated = this.builder.addSection(this.document(), page.id, definition.type);
      this.emit(updated);
      const section = updated.pages.find((current) => current.id === page.id)?.sections.at(-1);

      if (section)
        this.selectSection(section.id);
    } catch (error) {
      this.operationMessage.set(error instanceof Error ? error.message : 'Não foi possível adicionar a seção.');
    }
  }

  protected requestRemoveSection(section: SiteSectionV2): void {
    const page = this.activePage();

    if (!page)
      return;

    this.confirmationService.confirm({
      header: $localize`:@@admin.v2.section.removeTitle:Excluir esta seção?`,
      message: $localize`:@@admin.v2.section.removeMessage:A seção será removida desta página do rascunho.`,
      acceptLabel: $localize`:@@admin.v2.section.removeAccept:Excluir seção`,
      rejectLabel: $localize`:@@admin.v2.cancel:Cancelar`,
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.emit(this.builder.removeSection(this.document(), page.id, section.id));
        this.selection.set({ kind: 'page', pageId: page.id });
      },
    });
  }

  protected moveSection(section: SiteSectionV2, offset: -1 | 1): void {
    const page = this.activePage();

    if (!page)
      return;

    const currentIndex = page.sections.findIndex((current) => current.id === section.id);
    const destination = currentIndex + offset;

    if (currentIndex < 0 || destination < 0 || destination >= page.sections.length)
      return;

    this.emit(this.builder.reorderSections(this.document(), page.id, currentIndex, destination));
  }

  protected dropHeroMedia(event: CdkDragDrop<unknown>, sectionId: string): void {
    const page = this.activePage();
    const asset = event.item.data;

    if (!page || !this.isMediaAsset(asset))
      return;

    this.emit(this.builder.setHeroMedia(this.document(), page.id, sectionId, asset));
    this.selectSection(sectionId);
  }

  protected updatePageIdentity(page: SitePageV2, field: 'path' | 'slug', value: string): void {
    const normalizedValue = value.trim();
    const updatedPage = {
      ...page,
      [field]: field === 'path'
        ? this.normalizePath(normalizedValue)
        : this.normalizeSlug(normalizedValue),
    };

    this.emit(this.builder.updatePage(this.document(), {
      ...updatedPage,
      seo: field === 'path'
        ? { ...updatedPage.seo, canonicalPath: updatedPage.path }
        : updatedPage.seo,
    }));
  }

  protected updatePageVisibility(page: SitePageV2, visible: boolean): void {
    this.emit(this.builder.updatePage(this.document(), { ...page, visible }));
  }

  protected updatePageSeo(
    page: SitePageV2,
    field: 'description' | 'title',
    value: string,
  ): void {
    this.emit(this.builder.updatePage(this.document(), {
      ...page,
      seo: { ...page.seo, [field]: value },
    }));
  }

  protected updateSectionVisibility(section: SiteSectionV2, visible: boolean): void {
    this.updateSection({ ...section, visible });
  }

  protected updateSectionCommon(
    section: SiteSectionV2,
    field: 'anchor' | 'overline',
    value: string,
  ): void {
    this.updateSection({ ...section, [field]: value });
  }

  protected updateSectionTitle(section: SiteSectionV2, value: string): void {
    this.updateSection({ ...section, title: this.richText(value) });
  }

  protected updateHeroField(
    section: HeroSectionConfig,
    field: 'caption' | 'indexLabel',
    value: string,
  ): void {
    this.updateSection({ ...section, [field]: value });
  }

  protected updateHeroSupportingText(section: HeroSectionConfig, value: string): void {
    this.updateSection({ ...section, supportingText: this.richText(value) });
  }

  protected updateHeroLink(
    section: HeroSectionConfig,
    field: 'href' | 'label',
    value: string,
  ): void {
    this.updateSection({
      ...section,
      portfolioLink: { ...section.portfolioLink, [field]: value },
    });
  }

  protected updateProjectDescription(section: ProjectGridSectionConfig, value: string): void {
    this.updateSection({ ...section, description: this.lines(value) });
  }

  protected updateProjectIds(section: ProjectGridSectionConfig, projectIds: string[]): void {
    this.updateSection({ ...section, projectIds: [...projectIds] });
  }

  protected updateMaxColumns(section: ProjectGridSectionConfig, value: number | null): void {
    if (!value || ![1, 2, 3, 4].includes(value))
      return;

    this.updateSection({ ...section, maxColumns: value as 1 | 2 | 3 | 4 });
  }

  protected updateWhatsappBody(section: WhatsappCtaSectionConfig, value: string): void {
    this.updateSection({ ...section, body: this.lines(value) });
  }

  protected updateWhatsappField(
    section: WhatsappCtaSectionConfig,
    field: 'label' | 'message',
    value: string,
  ): void {
    this.updateSection({ ...section, [field]: value });
  }

  protected updateContactFormDescription(
    section: ContactFormSectionConfig,
    value: string,
  ): void {
    this.updateSection({ ...section, description: this.lines(value) });
  }

  protected updateContactFormField(
    section: ContactFormSectionConfig,
    field: ContactFormTextField,
    value: string,
  ): void {
    this.updateSection({ ...section, [field]: value });
  }

  protected updateContact(field: keyof SiteContact, value: string): void {
    const document = this.document();
    const contact = { ...document.contact, [field]: value.trim() };
    const organization = {
      ...document.seo.organization,
      ...(field === 'email' ? { email: contact.email } : {}),
      ...(field === 'phoneE164' ? { telephone: contact.phoneE164 } : {}),
    };
    const primaryCta = field === 'whatsappNumber' || field === 'whatsappDefaultMessage'
      ? { ...document.header.primaryCta, href: this.whatsappHref(contact) }
      : document.header.primaryCta;
    const footer = field === 'instagramUrl'
      ? {
          ...document.footer,
          socialLinks: this.withInstagram(document.footer.socialLinks, contact.instagramUrl),
        }
      : document.footer;

    this.emit({
      ...document,
      contact,
      seo: { ...document.seo, organization },
      header: { ...document.header, primaryCta },
      footer,
    });
  }

  protected updateContactFromEvent(field: keyof SiteContact, event: Event): void {
    const target = event.target;

    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)
      this.updateContact(field, target.value);
  }

  protected sectionLabel(section: SiteSectionV2): string {
    return this.sectionDefinitions.find((definition) => definition.type === section.type)?.label
      ?? section.type;
  }

  protected richTextValue(block: RichTextBlock): string {
    return block.lines
      .map((line) => line.segments.map((segment) => segment.text).join(''))
      .join('\n');
  }

  protected stringListValue(value: readonly string[]): string {
    return value.join('\n');
  }

  protected heroMediaDropId(sectionId: string): string {
    return `v2-hero-media-${sectionId}`;
  }

  protected mediaPath(assetId: string): string {
    const path = this.document().media.find((asset) => asset.id === assetId)?.path;

    if (!path || path.startsWith('https://'))
      return path ?? '';

    const currentLocation = this.browserDocument.defaultView?.location;
    const localHostname = currentLocation?.hostname;
    const baseUrl = localHostname === 'localhost' || localHostname === '127.0.0.1'
      ? `${currentLocation?.protocol}//${localHostname}:4200`
      : this.document().identity.canonicalUrl;

    try {
      return new URL(path, baseUrl).toString();
    } catch {
      return '';
    }
  }

  private updateSection(section: SiteSectionV2): void {
    const page = this.activePage();

    if (!page)
      return;

    this.emit(this.builder.updateSection(this.document(), page.id, section));
  }

  private emit(document: SiteConfigV2): void {
    this.operationMessage.set(null);
    this.documentChange.emit(document);
  }

  private richText(value: string): RichTextBlock {
    const lines = value.split('\n');

    return {
      lines: lines.map((line) => ({ segments: [{ text: line, emphasis: false }] })),
    };
  }

  private lines(value: string): readonly string[] {
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  private normalizeSlug(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private normalizePath(value: string): string {
    if (!value || value === '/')
      return '/';

    return `/${value.replace(/^\/+|\/+$/g, '')}`;
  }

  private whatsappHref(contact: SiteContact): string {
    return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.whatsappDefaultMessage)}`;
  }

  private withInstagram(
    socialLinks: SiteConfigV2['footer']['socialLinks'],
    href: string,
  ): SiteConfigV2['footer']['socialLinks'] {
    const existingIndex = socialLinks.findIndex((link) =>
      link.id === 'instagram' || /instagram/i.test(link.network));
    const instagram = {
      id: existingIndex >= 0 ? socialLinks[existingIndex].id : 'instagram',
      network: 'Instagram',
      label: 'Instagram',
      href,
      icon: 'instagram',
    };

    return existingIndex >= 0
      ? socialLinks.map((link, index) => index === existingIndex ? { ...link, href } : link)
      : [...socialLinks, instagram];
  }

  private isSectionDefinition(value: unknown): value is SiteV2SectionDefinition {
    return typeof value === 'object' && value !== null && 'type' in value
      && this.sectionDefinitions.some((definition) => definition.type === value.type);
  }

  private isMediaAsset(value: unknown): value is MediaAsset {
    return typeof value === 'object' && value !== null && 'id' in value && 'path' in value;
  }
}
