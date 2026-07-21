import { VisualBuilderBlock } from './visual-builder-block.model';

export interface VisualBuilderBlockDrag {
  readonly block: VisualBuilderBlock;
  readonly event: DragEvent;
}
