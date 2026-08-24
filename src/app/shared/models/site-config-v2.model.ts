import { MediaAsset } from './media-asset.model';
import { NavigationItem } from './navigation-item.model';
import { PortfolioCategory } from './portfolio-category.model';
import { PortfolioProject } from './portfolio-project.model';
import { SeoConfig } from './seo-config.model';
import { SiteContact } from './site-contact.model';
import { SiteFooter } from './site-footer.model';
import { SiteHeader } from './site-header.model';
import { SiteIdentity } from './site-identity.model';
import { SitePageV2 } from './site-page-v2.model';
import { SiteUiLabels } from './site-ui-labels.model';
import { ThemeConfig } from './theme-config.model';

export interface SiteConfigV2 {
  readonly schemaVersion: 2;
  readonly releaseId: string;
  readonly publishedAt: string;
  readonly locale: 'pt-BR';
  readonly identity: SiteIdentity;
  readonly seo: SeoConfig;
  readonly theme: ThemeConfig;
  readonly uiLabels: SiteUiLabels;
  readonly media: readonly MediaAsset[];
  readonly header: SiteHeader;
  readonly navigationItems: readonly NavigationItem[];
  readonly portfolioCategories: readonly PortfolioCategory[];
  readonly projects: readonly PortfolioProject[];
  readonly footer: SiteFooter;
  readonly contact: SiteContact;
  readonly pages: readonly SitePageV2[];
}
