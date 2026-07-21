export type AuditAction =
  | 'draft.create'
  | 'draft.save'
  | 'release.publish'
  | 'release.rollback'
  | 'media.complete';
