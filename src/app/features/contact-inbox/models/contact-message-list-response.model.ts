import { ContactMessageSummary } from './contact-message-summary.model';

export interface ContactMessageListResponse {
  readonly items: readonly ContactMessageSummary[];
  readonly nextCursor?: string;
}
