export const HOLDING_COLORS = [
  '#3B5BDB',
  '#099268',
  '#D66A00',
  '#7048E8',
  '#E64980',
  '#0B7285',
  '#495057',
] as const

export function holdingColor(index: number): string {
  return HOLDING_COLORS[index % HOLDING_COLORS.length]
}
