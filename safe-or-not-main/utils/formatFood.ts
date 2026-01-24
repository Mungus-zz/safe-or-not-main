export function formatFoodName(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, ' ');
  
  if (!trimmed) return '';
  
  return trimmed
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
