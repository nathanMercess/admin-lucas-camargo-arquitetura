import { Injectable } from '@angular/core';
import { DEFAULT_SITE_CONFIG } from '@shared/config/default-site-config';
import { SiteSection } from '@shared/models/site-section.model';

import { SiteSectionDefinition } from '../models/site-section-definition.model';

@Injectable({ providedIn: 'root' })
export class SiteSectionRegistryService {
  public readonly definitions: readonly SiteSectionDefinition[] = [
    {
      type: 'hero',
      label: $localize`:@@admin.section.hero:Abertura`,
      description: $localize`:@@admin.section.heroDescription:Imagem principal, título e chamada inicial.`,
      icon: 'pi-image',
    },
    {
      type: 'manifesto',
      label: $localize`:@@admin.section.manifesto:Manifesto`,
      description: $localize`:@@admin.section.manifestoDescription:Mensagem central e texto de posicionamento.`,
      icon: 'pi-align-left',
    },
    {
      type: 'practice',
      label: $localize`:@@admin.section.practice:Atuação`,
      description: $localize`:@@admin.section.practiceDescription:Lista de serviços ou áreas de atuação.`,
      icon: 'pi-briefcase',
    },
    {
      type: 'portfolio',
      label: $localize`:@@admin.section.portfolio:Portfólio`,
      description: $localize`:@@admin.section.portfolioDescription:Categorias e apresentação dos projetos.`,
      icon: 'pi-images',
    },
    {
      type: 'metrics',
      label: $localize`:@@admin.section.metrics:Indicadores`,
      description: $localize`:@@admin.section.metricsDescription:Números e resultados do escritório.`,
      icon: 'pi-chart-bar',
    },
    {
      type: 'about',
      label: $localize`:@@admin.section.about:Sobre`,
      description: $localize`:@@admin.section.aboutDescription:Perfil, retrato e biografia.`,
      icon: 'pi-user',
    },
    {
      type: 'process',
      label: $localize`:@@admin.section.process:Processo`,
      description: $localize`:@@admin.section.processDescription:Etapas do atendimento ou da execução.`,
      icon: 'pi-sitemap',
    },
    {
      type: 'contact',
      label: $localize`:@@admin.section.contact:Contato`,
      description: $localize`:@@admin.section.contactDescription:Chamada final e canais de contato.`,
      icon: 'pi-send',
    },
  ];

  public label(type: SiteSection['type']): string {
    return this.definitions.find((definition) => definition.type === type)?.label ?? type;
  }

  public create(type: SiteSection['type'], sections: readonly SiteSection[]): SiteSection {
    const template = sections.find((section) => section.type === type)
      ?? DEFAULT_SITE_CONFIG.sections.find((section) => section.type === type);

    if (!template)
      throw new Error(`Não existe um modelo registrado para a seção ${type}.`);

    return this.withUniqueIdentity(structuredClone(template), sections);
  }

  public duplicate(section: SiteSection, sections: readonly SiteSection[]): SiteSection {
    return this.withUniqueIdentity(structuredClone(section), sections);
  }

  public normalizeOrder(sections: readonly SiteSection[]): readonly SiteSection[] {
    return sections.map((section, index) => ({
      ...section,
      order: (index + 1) * 10,
    }));
  }

  private withUniqueIdentity(section: SiteSection, sections: readonly SiteSection[]): SiteSection {
    const suffix = crypto.randomUUID().slice(0, 8);
    const anchorBase = section.anchor.replace(/-[a-f0-9]{8}$/i, '');

    return {
      ...section,
      id: `${section.type}-${suffix}`,
      anchor: `${anchorBase}-${suffix}`,
      order: Math.max(0, ...sections.map((item) => item.order)) + 10,
      visible: true,
    };
  }
}
