import { Injectable } from '@angular/core';
import { ContactFormSectionConfig } from '@shared/models/contact-form-section-config.model';
import { ContactSectionConfig } from '@shared/models/contact-section-config.model';
import { PortfolioSectionConfig } from '@shared/models/portfolio-section-config.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';
import { SiteSection } from '@shared/models/site-section.model';
import { SiteSectionV2 } from '@shared/models/site-section-v2.model';

import { SiteV1MigrationAnalysis } from '../models/site-v1-migration-analysis.model';

const APPROVED_EMAIL = 'arquiteto@lucascamargo.com';
const APPROVED_PHONE_LABEL = '11 98668-1572';
const APPROVED_PHONE_E164 = '+5511986681572';
const APPROVED_WHATSAPP_NUMBER = '5511986681572';
const APPROVED_INSTAGRAM_URL = 'https://www.instagram.com/lucascamargo.arquiteto/';
const APPROVED_WHATSAPP_MESSAGE = 'Olá, gostaria de conversar sobre um projeto.';

@Injectable({ providedIn: 'root' })
export class SiteConfigV1MigrationService {
  public analyze(config: SiteConfigV1): SiteV1MigrationAnalysis {
    const blockers = config.sections
      .filter((section) => !['hero', 'portfolio', 'contact'].includes(section.type))
      .map((section) => `${this.sectionLabel(section)} (${section.id})`);

    if (this.hasLegacyVisualContent(config))
      blockers.push('Conteúdo criado no editor visual legado');

    return {
      canMigrate: blockers.length === 0,
      blockers,
    };
  }

  public migrate(config: SiteConfigV1): SiteConfigV2 {
    const analysis = this.analyze(config);

    if (!analysis.canMigrate)
      throw new Error(`Migração bloqueada: ${analysis.blockers.join(', ')}.`);

    const migratedSections = [...config.sections]
      .sort((first, second) => first.order - second.order)
      .map((section) => this.migrateSection(section, config));
    const contactForm = this.createContactForm(migratedSections.length);
    const contact = this.createContact();

    return {
      schemaVersion: 2,
      releaseId: config.releaseId,
      publishedAt: config.publishedAt,
      locale: config.locale,
      identity: config.identity,
      seo: {
        ...config.seo,
        organization: {
          ...config.seo.organization,
          email: contact.email,
          telephone: contact.phoneE164,
        },
      },
      theme: config.theme,
      uiLabels: config.uiLabels,
      media: config.media,
      header: {
        ...config.header,
        primaryCta: {
          ...config.header.primaryCta,
          label: 'Conversar pelo WhatsApp',
          href: this.whatsappHref(contact),
          target: '_blank',
        },
      },
      navigationItems: [
        { id: 'projects', label: 'Projetos', href: '#projetos' },
        { id: 'contact', label: 'Contato', href: '#contato' },
      ],
      portfolioCategories: config.portfolioCategories,
      projects: config.projects,
      footer: {
        ...config.footer,
        socialLinks: this.withInstagram(config.footer.socialLinks, contact.instagramUrl),
      },
      contact,
      pages: [
        {
          id: 'home',
          slug: 'home',
          path: '/',
          order: 10,
          visible: true,
          seo: {
            title: config.seo.title,
            description: config.seo.description,
            canonicalPath: '/',
            imageMediaId: config.seo.openGraph.imageMediaId,
            noIndex: false,
          },
          sections: [...migratedSections, contactForm]
            .map((section, index) => ({ ...section, order: (index + 1) * 10 })),
        },
      ],
    };
  }

  private migrateSection(section: SiteSection, config: SiteConfigV1): SiteSectionV2 {
    switch (section.type) {
      case 'hero':
        return structuredClone(section);
      case 'portfolio':
        return this.migratePortfolio(section, config);
      case 'contact':
        return this.migrateContact(section);
      default:
        throw new Error(`A seção ${section.id} não pertence ao catálogo V2.`);
    }
  }

  private migratePortfolio(
    section: PortfolioSectionConfig,
    config: SiteConfigV1,
  ): SiteSectionV2 {
    const projectIds = config.projects
      .filter((project) => project.visible && project.categoryIds
        .some((categoryId) => section.categoryIds.includes(categoryId)))
      .sort((first, second) => first.order - second.order)
      .map((project) => project.id);

    return {
      id: section.id,
      type: 'project-grid',
      order: section.order,
      visible: section.visible,
      anchor: section.anchor,
      variant: 'grid-v1',
      overline: section.overline,
      title: section.title,
      description: section.description,
      projectIds,
      maxColumns: 3,
    };
  }

  private migrateContact(section: ContactSectionConfig): SiteSectionV2 {
    return {
      id: section.id,
      type: 'whatsapp-cta',
      order: section.order,
      visible: section.visible,
      anchor: section.anchor,
      variant: 'editorial-v1',
      overline: section.overline,
      title: section.title,
      body: section.contactChannels.map((channel) => `${channel.label}: ${channel.value}`),
      label: section.cta.label,
      message: APPROVED_WHATSAPP_MESSAGE,
    };
  }

  private createContactForm(sectionCount: number): ContactFormSectionConfig {
    return {
      id: 'contact-form',
      type: 'contact-form',
      order: (sectionCount + 1) * 10,
      visible: true,
      anchor: 'mensagem',
      variant: 'default-v1',
      overline: 'MENSAGEM',
      title: {
        lines: [{ segments: [{ text: 'Conte um pouco sobre o seu projeto.', emphasis: false }] }],
      },
      description: ['Preencha os campos abaixo para iniciar uma conversa.'],
      nameLabel: 'Nome',
      emailLabel: 'E-mail',
      phoneLabel: 'Telefone',
      subjectLabel: 'Assunto',
      messageLabel: 'Mensagem',
      submitLabel: 'Enviar mensagem',
      successMessage: 'Mensagem enviada. Em breve entraremos em contato.',
      errorMessage: 'Não foi possível enviar agora. Tente novamente.',
      privacyNotice: 'Seus dados serão usados apenas para responder ao seu contato.',
    };
  }

  private createContact(): SiteConfigV2['contact'] {
    return {
      email: APPROVED_EMAIL,
      phoneLabel: APPROVED_PHONE_LABEL,
      phoneE164: APPROVED_PHONE_E164,
      instagramUrl: APPROVED_INSTAGRAM_URL,
      whatsappNumber: APPROVED_WHATSAPP_NUMBER,
      whatsappDefaultMessage: APPROVED_WHATSAPP_MESSAGE,
    };
  }

  private whatsappHref(contact: SiteConfigV2['contact']): string {
    return `https://wa.me/${contact.whatsappNumber}?text=${encodeURIComponent(contact.whatsappDefaultMessage)}`;
  }

  private withInstagram(
    socialLinks: SiteConfigV2['footer']['socialLinks'],
    href: string,
  ): SiteConfigV2['footer']['socialLinks'] {
    const existing = socialLinks.find((link) =>
      link.id === 'instagram' || /instagram/i.test(link.network));

    if (existing)
      return socialLinks.map((link) => link.id === existing.id ? { ...link, href } : link);

    return [
      ...socialLinks,
      {
        id: 'instagram',
        network: 'Instagram',
        label: 'Instagram',
        href,
        icon: 'instagram',
      },
    ];
  }

  private hasLegacyVisualContent(config: SiteConfigV1): boolean {
    const visualBuilder = config.visualBuilder;

    if (!visualBuilder)
      return false;

    const projectKeys = Object.keys(visualBuilder.projectData)
      .filter((key) => key !== '__visualBuilderAdmin');

    return Boolean(visualBuilder.html.trim() || visualBuilder.css.trim() || projectKeys.length > 0);
  }

  private sectionLabel(section: SiteSection): string {
    const labels: Record<SiteSection['type'], string> = {
      hero: 'Abertura',
      manifesto: 'Manifesto',
      practice: 'Atuação',
      portfolio: 'Portfólio',
      metrics: 'Indicadores',
      about: 'Sobre',
      process: 'Processo',
      contact: 'Contato',
    };

    return labels[section.type];
  }
}
