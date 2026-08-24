import { Injectable } from '@angular/core';
import { HeroSectionConfig } from '@shared/models/hero-section-config.model';
import { MediaAsset } from '@shared/models/media-asset.model';
import { RichTextBlock } from '@shared/models/rich-text-block.model';
import { SiteConfigV2 } from '@shared/models/site-config-v2.model';
import { SitePageV2 } from '@shared/models/site-page-v2.model';
import { SiteSectionV2 } from '@shared/models/site-section-v2.model';

import { SiteV2SectionDefinition } from '../models/site-v2-section-definition.model';

@Injectable({ providedIn: 'root' })
export class SiteV2BuilderService {
  public readonly sectionDefinitions: readonly SiteV2SectionDefinition[] = [
    {
      type: 'hero',
      label: $localize`:@@admin.v2.section.hero:Abertura`,
      description: $localize`:@@admin.v2.section.heroDescription:Imagem principal, título e chamada inicial.`,
      icon: 'pi-image',
    },
    {
      type: 'project-grid',
      label: $localize`:@@admin.v2.section.projectGrid:Grade de projetos`,
      description: $localize`:@@admin.v2.section.projectGridDescription:Projetos reais selecionados e organizados em grade.`,
      icon: 'pi-th-large',
    },
    {
      type: 'whatsapp-cta',
      label: $localize`:@@admin.v2.section.whatsapp:Chamada para WhatsApp`,
      description: $localize`:@@admin.v2.section.whatsappDescription:Convite direto usando o contato global aprovado.`,
      icon: 'pi-whatsapp',
    },
    {
      type: 'contact-form',
      label: $localize`:@@admin.v2.section.contactForm:Formulário de contato`,
      description: $localize`:@@admin.v2.section.contactFormDescription:Apresentação dos campos do formulário público, sem definir infraestrutura.`,
      icon: 'pi-envelope',
    },
  ];

  public createPage(document: SiteConfigV2): SiteConfigV2 {
    const pageNumber = document.pages.length + 1;
    const id = this.uniqueId(`pagina-${pageNumber}`, document.pages.map((page) => page.id));
    const slug = this.uniqueId(`pagina-${pageNumber}`, document.pages.map((page) => page.slug));
    const page: SitePageV2 = {
      id,
      slug,
      path: `/${slug}`,
      order: (document.pages.length + 1) * 10,
      visible: false,
      seo: {
        title: `${document.identity.brandName} · Página ${pageNumber}`,
        description: document.seo.description,
        canonicalPath: `/${slug}`,
        imageMediaId: document.seo.openGraph.imageMediaId,
        noIndex: true,
      },
      sections: [],
    };

    return { ...document, pages: [...document.pages, page] };
  }

  public updatePage(document: SiteConfigV2, page: SitePageV2): SiteConfigV2 {
    return {
      ...document,
      pages: document.pages.map((current) => current.id === page.id ? page : current),
    };
  }

  public removePage(document: SiteConfigV2, pageId: string): SiteConfigV2 {
    if (document.pages.length <= 1)
      return document;

    return this.withNormalizedPages(
      document,
      document.pages.filter((page) => page.id !== pageId),
    );
  }

  public reorderPages(document: SiteConfigV2, previousIndex: number, currentIndex: number): SiteConfigV2 {
    return this.withNormalizedPages(
      document,
      this.move(document.pages, previousIndex, currentIndex),
    );
  }

  public addSection(
    document: SiteConfigV2,
    pageId: string,
    type: SiteSectionV2['type'],
    index?: number,
  ): SiteConfigV2 {
    const page = document.pages.find((current) => current.id === pageId);

    if (!page)
      return document;

    const section = this.createSection(document, page, type);
    const sections = [...page.sections];
    sections.splice(index ?? sections.length, 0, section);

    return this.updatePage(document, {
      ...page,
      sections: this.normalizeSections(sections),
    });
  }

  public updateSection(
    document: SiteConfigV2,
    pageId: string,
    section: SiteSectionV2,
  ): SiteConfigV2 {
    const page = document.pages.find((current) => current.id === pageId);

    if (!page)
      return document;

    return this.updatePage(document, {
      ...page,
      sections: page.sections.map((current) => current.id === section.id ? section : current),
    });
  }

  public removeSection(document: SiteConfigV2, pageId: string, sectionId: string): SiteConfigV2 {
    const page = document.pages.find((current) => current.id === pageId);

    if (!page)
      return document;

    return this.updatePage(document, {
      ...page,
      sections: this.normalizeSections(page.sections.filter((section) => section.id !== sectionId)),
    });
  }

  public reorderSections(
    document: SiteConfigV2,
    pageId: string,
    previousIndex: number,
    currentIndex: number,
  ): SiteConfigV2 {
    const page = document.pages.find((current) => current.id === pageId);

    if (!page)
      return document;

    return this.updatePage(document, {
      ...page,
      sections: this.normalizeSections(this.move(page.sections, previousIndex, currentIndex)),
    });
  }

  public setHeroMedia(
    document: SiteConfigV2,
    pageId: string,
    sectionId: string,
    asset: MediaAsset,
  ): SiteConfigV2 {
    const page = document.pages.find((current) => current.id === pageId);
    const section = page?.sections.find((current) => current.id === sectionId);

    if (!page || !section || section.type !== 'hero')
      return document;

    return this.updateSection(document, pageId, {
      ...section,
      background: {
        ...section.background,
        assetId: asset.id,
      },
    });
  }

  private createSection(
    document: SiteConfigV2,
    page: SitePageV2,
    type: SiteSectionV2['type'],
  ): SiteSectionV2 {
    const id = this.uniqueId(type, page.sections.map((section) => section.id));
    const anchor = this.uniqueId(type, page.sections.map((section) => section.anchor));
    const base = {
      id,
      order: (page.sections.length + 1) * 10,
      visible: true,
      anchor,
    };

    switch (type) {
      case 'hero': {
        const asset = document.media[0];

        if (!asset)
          throw new Error('Adicione uma imagem à biblioteca antes de criar uma abertura.');

        return {
          ...base,
          type: 'hero',
          variant: 'editorial-v1',
          overline: document.identity.descriptor,
          title: this.richText(document.identity.brandName),
          supportingText: this.richText('Do primeiro traço à construção.'),
          portfolioLink: {
            id: `${id}-projects`,
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
        } satisfies HeroSectionConfig;
      }
      case 'project-grid':
        return {
          ...base,
          type: 'project-grid',
          variant: 'grid-v1',
          overline: 'PROJETOS',
          title: this.richText('Projetos selecionados'),
          description: ['Conheça os projetos selecionados para esta página.'],
          projectIds: [],
          maxColumns: 3,
        };
      case 'whatsapp-cta':
        return {
          ...base,
          type: 'whatsapp-cta',
          variant: 'editorial-v1',
          overline: 'CONTATO',
          title: this.richText('Vamos conversar sobre seu projeto?'),
          body: ['Envie uma mensagem para iniciar a conversa.'],
          label: 'Conversar pelo WhatsApp',
          message: document.contact.whatsappDefaultMessage,
        };
      case 'contact-form':
        return {
          ...base,
          type: 'contact-form',
          variant: 'default-v1',
          overline: 'CONTATO',
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
  }

  private withNormalizedPages(
    document: SiteConfigV2,
    pages: readonly SitePageV2[],
  ): SiteConfigV2 {
    return {
      ...document,
      pages: pages.map((page, index) => ({ ...page, order: (index + 1) * 10 })),
    };
  }

  private normalizeSections(sections: readonly SiteSectionV2[]): readonly SiteSectionV2[] {
    return sections.map((section, index) => ({ ...section, order: (index + 1) * 10 }));
  }

  private move<T>(items: readonly T[], previousIndex: number, currentIndex: number): readonly T[] {
    const movedItems = [...items];
    const [item] = movedItems.splice(previousIndex, 1);

    if (item === undefined)
      return items;

    movedItems.splice(currentIndex, 0, item);
    return movedItems;
  }

  private uniqueId(base: string, currentIds: readonly string[]): string {
    if (!currentIds.includes(base))
      return base;

    let suffix = 2;

    while (currentIds.includes(`${base}-${suffix}`))
      suffix += 1;

    return `${base}-${suffix}`;
  }

  private richText(text: string): RichTextBlock {
    return {
      lines: [{ segments: [{ text, emphasis: false }] }],
    };
  }
}
