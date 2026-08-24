export interface SiteV1MigrationAnalysis {
  readonly canMigrate: boolean;
  readonly blockers: readonly string[];
}
