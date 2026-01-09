/**
 * Pure functions for calculating positions in pipeline stages and cards.
 * No side effects, no external dependencies.
 */

interface PositionedItem {
  position: number;
}

/**
 * Calculates the next available position for a new item in a list.
 * Returns the maximum position + 1, or 0 if the list is empty.
 */
export function calculateNextPosition<T extends PositionedItem>(items: T[]): number {
  if (!items || items.length === 0) {
    return 0;
  }
  
  const maxPosition = items.reduce(
    (max, item) => Math.max(max, item.position),
    -1
  );
  
  return maxPosition + 1;
}

/**
 * Calculates the next position for a new stage in a pipeline.
 * @param stages - Array of existing stages with position property
 * @returns The position for the new stage
 */
export function calculateNextStagePosition(stages: PositionedItem[]): number {
  return calculateNextPosition(stages);
}

/**
 * Calculates the next position for a new card in a stage.
 * @param cards - Array of existing cards with position property
 * @returns The position for the new card
 */
export function calculateNextCardPosition(cards: PositionedItem[]): number {
  return calculateNextPosition(cards);
}
