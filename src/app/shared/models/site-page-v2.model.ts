import { PageSeo } from './page-seo.model';
import { SiteSectionV2 } from './site-section-v2.model';

export interface SitePageV2 {
  readonly id: string;
  readonly slug: string;
  readonly path: string;
  readonly order: number;
  readonly visible: boolean;
  readonly seo: PageSeo;
  readonly sections: readonly SiteSectionV2[];
}
