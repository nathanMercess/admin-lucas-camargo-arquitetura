import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { FooterLink } from '@shared/models/footer-link.model';
import { MediaAsset } from '@shared/models/media-asset.model';
import { MediaReference } from '@shared/models/media-reference.model';
import { NavigationItem } from '@shared/models/navigation-item.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteLink } from '@shared/models/site-link.model';
import { SocialLink } from '@shared/models/social-link.model';
import { ConfirmationService } from 'primeng/api';

import { MediaReferenceFormValue } from '../../../../shared/models/media-reference-form-value.model';
import { SiteLinkFormValue } from '../../models/site-link-form-value.model';
import { FormArrayEditorService } from '../../services/form-array-editor.service';
import { safeHrefValidator } from '../../validators/safe-href.validator';

@Component({
  selector: 'app-site-structure-editor',
  templateUrl: './site-structure-editor.component.html',
  styleUrl: './site-structure-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SiteStructureEditorComponent {
  private readonly arrayEditor = inject(FormArrayEditorService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  private hydratedConfig: SiteConfigV1 | null = null;
  public readonly config = input.required<SiteConfigV1>();
  public readonly configChange = output<SiteConfigV1>();
  public readonly assetUploaded = output<MediaAsset>();
  protected readonly targetOptions = [
    { label: $localize`:@@admin.structure.targetSame:Mesma aba`, value: '_self' },
    { label: $localize`:@@admin.structure.targetNew:Nova aba`, value: '_blank' },
  ];
  protected readonly structureForm = this.formBuilder.nonNullable.group({
    headerLogo: this.createMediaReferenceForm(),
    homeLink: this.createSiteLinkForm(),
    primaryCta: this.createSiteLinkForm(),
    navigationItems: this.formBuilder.array([this.createNavigationItemForm()]),
    uiLabels: this.formBuilder.nonNullable.group({
      skipToContent: ['', Validators.required],
      mainNavigation: ['', Validators.required],
      footerNavigation: ['', Validators.required],
      openMenu: ['', Validators.required],
      closeMenu: ['', Validators.required],
      pausePortfolio: ['', Validators.required],
      resumePortfolio: ['', Validators.required],
      referenceImage: ['', Validators.required],
      exploreCategory: ['', Validators.required],
    }),
    footerLogo: this.createMediaReferenceForm(),
    footerLinks: this.formBuilder.array([this.createFooterLinkForm()]),
    socialLinks: this.formBuilder.array([this.createSocialLinkForm()]),
    footer: this.formBuilder.nonNullable.group({
      statement: ['', [Validators.required, Validators.maxLength(180)]],
      location: ['', [Validators.required, Validators.maxLength(120)]],
      copyrightOwner: ['', [Validators.required, Validators.maxLength(120)]],
    }),
    backToTopLink: this.createSiteLinkForm(),
  });

  public constructor() {
    effect(() => {
      const config = this.config();

      if (config === this.hydratedConfig)
        return;

      this.hydrate(config);
    });
  }

  protected apply(): void {
    if (this.structureForm.invalid) {
      this.structureForm.markAllAsTouched();
      return;
    }

    const config = this.config();
    const value = this.structureForm.getRawValue();
    const updatedConfig: SiteConfigV1 = {
      ...config,
      header: {
        logo: this.toMediaReference(value.headerLogo),
        homeLink: this.toSiteLink(value.homeLink),
        primaryCta: this.toSiteLink(value.primaryCta),
      },
      navigationItems: value.navigationItems.map((item): NavigationItem => ({
        id: item.id.trim(),
        label: item.label.trim(),
        href: item.href.trim(),
      })),
      uiLabels: value.uiLabels,
      footer: {
        logo: this.toMediaReference(value.footerLogo),
        links: value.footerLinks.map((link): FooterLink => ({
          id: link.id.trim(),
          label: link.label.trim(),
          href: link.href.trim(),
        })),
        socialLinks: value.socialLinks.map((link): SocialLink => ({
          id: link.id.trim(),
          network: link.network.trim(),
          label: link.label.trim(),
          href: link.href.trim(),
          icon: link.icon.trim(),
        })),
        statement: value.footer.statement.trim(),
        location: value.footer.location.trim(),
        copyrightOwner: value.footer.copyrightOwner.trim(),
        backToTopLink: this.toSiteLink(value.backToTopLink),
      },
    };

    this.hydratedConfig = updatedConfig;
    this.structureForm.markAsPristine();
    this.configChange.emit(updatedConfig);
  }

  protected addNavigationItem(): void {
    this.structureForm.controls.navigationItems.push(this.createNavigationItemForm());
  }

  protected removeNavigationItem(index: number): void {
    this.requestRemoval('item do menu', () =>
      this.arrayEditor.remove(this.structureForm.controls.navigationItems, index));
  }

  protected moveNavigationItem(index: number, offset: -1 | 1): void {
    this.arrayEditor.move(this.structureForm.controls.navigationItems, index, offset);
  }

  protected duplicateNavigationItem(index: number): void {
    const item = this.structureForm.controls.navigationItems.at(index).getRawValue();
    this.structureForm.controls.navigationItems.insert(index + 1, this.createNavigationItemForm({
      ...item,
      id: crypto.randomUUID(),
      label: `${item.label} (cópia)`,
    }));
    this.structureForm.controls.navigationItems.markAsDirty();
  }

  protected addFooterLink(): void {
    this.structureForm.controls.footerLinks.push(this.createFooterLinkForm());
  }

  protected removeFooterLink(index: number): void {
    this.requestRemoval('link do rodapé', () =>
      this.arrayEditor.remove(this.structureForm.controls.footerLinks, index));
  }

  protected moveFooterLink(index: number, offset: -1 | 1): void {
    this.arrayEditor.move(this.structureForm.controls.footerLinks, index, offset);
  }

  protected duplicateFooterLink(index: number): void {
    const link = this.structureForm.controls.footerLinks.at(index).getRawValue();
    this.structureForm.controls.footerLinks.insert(index + 1, this.createFooterLinkForm({
      ...link,
      id: crypto.randomUUID(),
      label: `${link.label} (cópia)`,
    }));
    this.structureForm.controls.footerLinks.markAsDirty();
  }

  protected addSocialLink(): void {
    this.structureForm.controls.socialLinks.push(this.createSocialLinkForm());
  }

  protected removeSocialLink(index: number): void {
    this.requestRemoval('rede social', () =>
      this.arrayEditor.remove(this.structureForm.controls.socialLinks, index));
  }

  protected moveSocialLink(index: number, offset: -1 | 1): void {
    this.arrayEditor.move(this.structureForm.controls.socialLinks, index, offset);
  }

  protected duplicateSocialLink(index: number): void {
    const link = this.structureForm.controls.socialLinks.at(index).getRawValue();
    this.structureForm.controls.socialLinks.insert(index + 1, this.createSocialLinkForm({
      ...link,
      id: crypto.randomUUID(),
      label: `${link.label} (cópia)`,
    }));
    this.structureForm.controls.socialLinks.markAsDirty();
  }

  private requestRemoval(label: string, accept: () => void): void {
    this.confirmationService.confirm({
      header: $localize`:@@admin.structure.removeTitle:Excluir ${label}:itemLabel:?`,
      message: $localize`:@@admin.structure.removeMessage:Essa alteração será aplicada ao rascunho quando você salvar esta área.`,
      acceptLabel: $localize`:@@admin.structure.removeAccept:Excluir item`,
      rejectLabel: $localize`:@@admin.structure.removeReject:Cancelar`,
      acceptButtonStyleClass: 'p-button-danger',
      accept,
    });
  }

  private hydrate(config: SiteConfigV1): void {
    this.hydratedConfig = config;
    this.structureForm.controls.headerLogo.setValue(this.mediaReferenceValue(config.header.logo));
    this.structureForm.controls.homeLink.setValue(this.linkValue(config.header.homeLink));
    this.structureForm.controls.primaryCta.setValue(this.linkValue(config.header.primaryCta));
    this.replaceNavigationItems(config.navigationItems);
    this.structureForm.controls.uiLabels.setValue(config.uiLabels);
    this.structureForm.controls.footerLogo.setValue(this.mediaReferenceValue(config.footer.logo));
    this.replaceFooterLinks(config.footer.links);
    this.replaceSocialLinks(config.footer.socialLinks);
    this.structureForm.controls.footer.setValue({
      statement: config.footer.statement,
      location: config.footer.location,
      copyrightOwner: config.footer.copyrightOwner,
    });
    this.structureForm.controls.backToTopLink.setValue(this.linkValue(config.footer.backToTopLink));
    this.structureForm.markAsPristine();
  }

  private replaceNavigationItems(items: readonly NavigationItem[]): void {
    const controls = this.structureForm.controls.navigationItems;
    controls.clear();
    items.forEach((item) => controls.push(this.createNavigationItemForm(item)));
  }

  private replaceFooterLinks(links: readonly FooterLink[]): void {
    const controls = this.structureForm.controls.footerLinks;
    controls.clear();
    links.forEach((link) => controls.push(this.createFooterLinkForm(link)));
  }

  private replaceSocialLinks(links: readonly SocialLink[]): void {
    const controls = this.structureForm.controls.socialLinks;
    controls.clear();
    links.forEach((link) => controls.push(this.createSocialLinkForm(link)));
  }

  private createNavigationItemForm(item?: NavigationItem) {
    return this.formBuilder.nonNullable.group({
      id: [item?.id ?? crypto.randomUUID(), [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      label: [item?.label ?? '', [Validators.required, Validators.maxLength(80)]],
      href: [item?.href ?? '', [Validators.required, safeHrefValidator]],
    });
  }

  private createFooterLinkForm(link?: FooterLink) {
    return this.formBuilder.nonNullable.group({
      id: [link?.id ?? crypto.randomUUID(), [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      label: [link?.label ?? '', [Validators.required, Validators.maxLength(100)]],
      href: [link?.href ?? '', [Validators.required, safeHrefValidator]],
    });
  }

  private createSocialLinkForm(link?: SocialLink) {
    return this.formBuilder.nonNullable.group({
      id: [link?.id ?? crypto.randomUUID(), [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      network: [link?.network ?? '', [Validators.required, Validators.maxLength(40)]],
      label: [link?.label ?? '', [Validators.required, Validators.maxLength(100)]],
      href: [link?.href ?? '', [Validators.required, safeHrefValidator]],
      icon: [link?.icon ?? 'link', [Validators.required, Validators.pattern(/^[a-z0-9_-]+$/i)]],
    });
  }

  private createSiteLinkForm(link?: SiteLink) {
    return this.formBuilder.nonNullable.group({
      id: [link?.id ?? crypto.randomUUID(), [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      label: [link?.label ?? '', [Validators.required, Validators.maxLength(100)]],
      href: [link?.href ?? '', [Validators.required, safeHrefValidator]],
      ariaLabel: [link?.ariaLabel ?? '', Validators.maxLength(160)],
      target: this.formBuilder.nonNullable.control<'_self' | '_blank'>(link?.target ?? '_self'),
    });
  }

  private createMediaReferenceForm(reference?: MediaReference) {
    return this.formBuilder.nonNullable.group({
      assetId: [reference?.assetId ?? '', Validators.required],
      alt: [reference?.alt ?? '', Validators.maxLength(240)],
      decorative: [reference?.decorative ?? false],
      focalPointX: [reference?.focalPointX ?? 50, [Validators.min(0), Validators.max(100)]],
      focalPointY: [reference?.focalPointY ?? 50, [Validators.min(0), Validators.max(100)]],
      caption: [reference?.caption ?? '', Validators.maxLength(240)],
    });
  }

  private linkValue(link: SiteLink) {
    return {
      id: link.id,
      label: link.label,
      href: link.href,
      ariaLabel: link.ariaLabel ?? '',
      target: link.target ?? '_self' as const,
    };
  }

  private mediaReferenceValue(reference: MediaReference): MediaReferenceFormValue {
    return {
      assetId: reference.assetId,
      alt: reference.alt,
      decorative: reference.decorative,
      focalPointX: reference.focalPointX,
      focalPointY: reference.focalPointY,
      caption: reference.caption ?? '',
    };
  }

  private toSiteLink(value: SiteLinkFormValue): SiteLink {
    return {
      id: value.id.trim(),
      label: value.label.trim(),
      href: value.href.trim(),
      ...(value.ariaLabel.trim() ? { ariaLabel: value.ariaLabel.trim() } : {}),
      target: value.target,
    };
  }

  private toMediaReference(value: MediaReferenceFormValue): MediaReference {
    return {
      assetId: value.assetId.trim(),
      alt: value.decorative ? '' : value.alt.trim(),
      decorative: value.decorative,
      focalPointX: value.focalPointX,
      focalPointY: value.focalPointY,
      ...(value.caption.trim() ? { caption: value.caption.trim() } : {}),
    };
  }
}
