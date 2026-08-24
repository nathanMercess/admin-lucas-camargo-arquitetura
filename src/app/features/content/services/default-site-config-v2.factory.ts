import { Injectable } from '@angular/core';
import { ContactFormSectionConfig } from '@shared/models/contact-form-section-config.model';
import { HeroSectionConfig } from '@shared/models/hero-section-config.model';
import { SiteConfigV1 } from '@shared/models/site-config-v1.model';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';

const APPROVED_CONTACT: SiteConfigV2['contact'] = {
  email: 'arquiteto@lucascamargo.com',
  phoneLabel: '11 98668-1572',
  phoneE164: '+5511986681572',
  instagramUrl: 'https://www.instagram.com/lucascamargo.arquiteto/',
  whatsappNumber: '5511986681572',
  whatsappDefaultMessage: 'Olá, gostaria de conversar sobre um projeto.',
};

@Injectable({ providedIn: 'root' })
export class DefaultSiteConfigV2Factory {
  public create(source: SiteConfigV1): SiteConfigV2 {
    const hero = this.createHero(source);

    return {
      schemaVersion: 2,
      releaseId: `draft-v2-${source.releaseId}`,
      publishedAt: source.publishedAt,
      locale: source.locale,
      identity: source.identity,
      seo: {
        ...source.seo,
        organization: {
          ...source.seo.organization,
          email: APPROVED_CONTACT.email,
          telephone: APPROVED_CONTACT.phoneE164,
        },
      },
      theme: source.theme,
      uiLabels: source.uiLabels,
      media: source.media,
      header: {
        ...source.header,
        primaryCta: {
          ...source.header.primaryCta,
          label: 'Conversar pelo WhatsApp',
          href: this.whatsappHref(),
          target: '_blank',
        },
      },
      navigationItems: [
        { id: 'projects', label: 'Projetos', href: '#projetos' },
        { id: 'contact', label: 'Contato', href: '#contato' },
      ],
      portfolioCategories: source.portfolioCategories,
      projects: source.projects,
      footer: {
        ...source.footer,
        socialLinks: this.withInstagram(source.footer.socialLinks),
      },
      contact: APPROVED_CONTACT,
      pages: [
        {
          id: 'home',
          slug: 'home',
          path: '/',
          order: 10,
          visible: true,
          seo: {
            title: source.seo.title,
            description: source.seo.description,
            canonicalPath: '/',
            imageMediaId: source.seo.openGraph.imageMediaId,
            noIndex: false,
          },
          sections: [
            hero,
            {
              id: 'projects',
              type: 'project-grid',
              order: 20,
              visible: true,
              anchor: 'projetos',
              variant: 'grid-v1',
              overline: 'PROJETOS',
              title: this.richText('Projetos selecionados'),
              description: ['Conheça os projetos selecionados para esta página.'],
              projectIds: [],
              maxColumns: 3,
            },
            {
              id: 'whatsapp',
              type: 'whatsapp-cta',
              order: 30,
              visible: true,
              anchor: 'contato',
              variant: 'editorial-v1',
              overline: 'CONTATO',
              title: this.richText('Vamos conversar sobre seu projeto?'),
              body: ['Envie uma mensagem para iniciar a conversa.'],
              label: 'Conversar pelo WhatsApp',
              message: APPROVED_CONTACT.whatsappDefaultMessage,
            },
            this.createContactForm(),
          ],
        },
      ],
    };
  }

  private createHero(source: SiteConfigV1): HeroSectionConfig {
    const existingHero = source.sections.find((section) => section.type === 'hero');

    if (existingHero?.type === 'hero')
      return { ...structuredClone(existingHero), order: 10 };

    const asset = source.media[0];

    if (!asset)
      throw new Error('É necessário cadastrar ao menos uma imagem antes de criar o conteúdo V2.');

    return {
      id: 'hero',
      type: 'hero',
      order: 10,
      visible: true,
      anchor: 'inicio',
      variant: 'editorial-v1',
      overline: source.identity.descriptor,
      title: this.richText(source.identity.brandName),
      supportingText: this.richText('Arquitetura pensada para permanecer.'),
      portfolioLink: {
        id: 'hero-projects',
        label: 'Ver projetos',
        href: '#projetos',
        target: '_self',
      },
      background: {
        assetId: asset.id,
        alt: '',
        decorative: false,
        focalPointX: 50,
        focalPointY: 50,
      },
      indexLabel: 'LC / 01',
      caption: '',
    };
  }

  private createContactForm(): ContactFormSectionConfig {
    return {
      id: 'contact-form',
      type: 'contact-form',
      order: 40,
      visible: true,
      anchor: 'mensagem',
      variant: 'default-v1',
      overline: 'MENSAGEM',
      title: this.richText('Conte um pouco sobre o seu projeto.'),
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

  private whatsappHref(): string {
    return `https://wa.me/${APPROVED_CONTACT.whatsappNumber}?text=${encodeURIComponent(APPROVED_CONTACT.whatsappDefaultMessage)}`;
  }

  private withInstagram(
    socialLinks: SiteConfigV2['footer']['socialLinks'],
  ): SiteConfigV2['footer']['socialLinks'] {
    const existing = socialLinks.find((link) =>
      link.id === 'instagram' || /instagram/i.test(link.network));

    if (existing)
      return socialLinks.map((link) => link.id === existing.id
        ? { ...link, href: APPROVED_CONTACT.instagramUrl }
        : link);

    return [
      ...socialLinks,
      {
        id: 'instagram',
        network: 'Instagram',
        label: 'Instagram',
        href: APPROVED_CONTACT.instagramUrl,
        icon: 'instagram',
      },
    ];
  }

  private richText(text: string): HeroSectionConfig['title'] {
    return { lines: [{ segments: [{ text, emphasis: false }] }] };
  }
}
