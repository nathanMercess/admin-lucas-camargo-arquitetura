import { AdminPermission } from './admin-permission.type';
import { AdminRole } from './admin-role.type';

export interface AdminSession {
  readonly subject: string;
  readonly email: string;
  readonly role: AdminRole;
  readonly permissions: readonly AdminPermission[];
  readonly publishedContentBaseUrl: string;
}
