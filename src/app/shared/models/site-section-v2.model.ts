import { ContactFormSectionConfig } from './contact-form-section-config.model';
import { HeroSectionConfig } from './hero-section-config.model';
import { ProjectGridSectionConfig } from './project-grid-section-config.model';
import { WhatsappCtaSectionConfig } from './whatsapp-cta-section-config.model';

export type SiteSectionV2 =
  | HeroSectionConfig
  | ProjectGridSectionConfig
  | WhatsappCtaSectionConfig
  | ContactFormSectionConfig;
