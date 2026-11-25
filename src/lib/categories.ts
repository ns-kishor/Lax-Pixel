export interface SubcategoryItem {
  name: string;
  slug: string;
  description?: string;
}

export const SUBCATEGORIES_CONFIG: Record<string, SubcategoryItem[]> = {
  watch: [
    { name: 'Smart Watch', slug: 'smart-watch', description: 'Smartwatches, fitness bands, and wearable tech' },
    { name: 'Analog Watch', slug: 'analog-watch', description: 'Classic quartz, mechanical, and dress analog watches' },
    { name: 'Digital Watch', slug: 'digital-watch', description: 'Digital sports, LED, and multi-function timepieces' },
    { name: 'Wall Clock', slug: 'wall-clock', description: 'Decorative, modern, and vintage wall clocks' },
    { name: 'Table Clock', slug: 'table-clock', description: 'Desk, bedside alarm, and luxury table clocks' },
  ],
  watches: [
    { name: 'Smart Watch', slug: 'smart-watch', description: 'Smartwatches, fitness bands, and wearable tech' },
    { name: 'Analog Watch', slug: 'analog-watch', description: 'Classic quartz, mechanical, and dress analog watches' },
    { name: 'Digital Watch', slug: 'digital-watch', description: 'Digital sports, LED, and multi-function timepieces' },
    { name: 'Wall Clock', slug: 'wall-clock', description: 'Decorative, modern, and vintage wall clocks' },
    { name: 'Table Clock', slug: 'table-clock', description: 'Desk, bedside alarm, and luxury table clocks' },
  ],
  fashion: [
    { name: 'Women/Girl', slug: 'women-girl', description: 'Dresses, tops, traditional wear, and fashion for women & girls' },
    { name: 'Men/Boy', slug: 'men-boy', description: 'Shirts, panjabi, trousers, and fashion for men & boys' },
  ],
  shoes: [
    { name: 'Women/Girl', slug: 'women-girl', description: 'Heels, flats, sneakers, and footwear for women & girls' },
    { name: 'Men/Boy', slug: 'men-boy', description: 'Sneakers, formal leather shoes, and loafers for men & boys' },
  ],
};

export function getSubcategoriesForCategory(categorySlugOrName?: string | null): SubcategoryItem[] {
  if (!categorySlugOrName) return [];
  const key = categorySlugOrName.toLowerCase().trim();
  return SUBCATEGORIES_CONFIG[key] || [];
}

export function hasSubcategories(categorySlugOrName?: string | null): boolean {
  return getSubcategoriesForCategory(categorySlugOrName).length > 0;
}
