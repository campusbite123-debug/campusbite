import type { Meal } from '@/types';

// Match the published seed descriptions exactly so an edited recipe never inherits stale ingredients.
const catalogRecipes: Record<string, string[]> = {
  'Tender chicken slowly simmered in soy sauce, vinegar, garlic and bay leaves, served with fluffy steamed rice.':
    ['Chicken', 'Soy sauce', 'Vinegar', 'Garlic', 'Bay leaves', 'Steamed rice'],
  'Savory chopped pork with onions, calamansi and a little kick. Served with steamed rice.': [
    'Pork',
    'Onions',
    'Calamansi',
    'Steamed rice',
  ],
  'Golden, crispy chicken with house gravy and a warm serving of steamed rice.': [
    'Fried chicken',
    'House gravy',
    'Steamed rice',
  ],
  'Stir-fried egg noodles tossed with colorful vegetables and a savory house sauce, finished with calamansi.':
    ['Egg noodles', 'Vegetables', 'House sauce', 'Calamansi'],
  'A juicy beef patty, crisp lettuce, tomato and our signature sauce in a toasted sesame bun.': [
    'Sesame bun',
    'Signature sauce',
    'Lettuce',
    'Tomato',
    'Beef patty',
  ],
  'Crisp golden potato fries, lightly salted and served with tomato ketchup.': [
    'Potato',
    'Salt',
    'Tomato ketchup',
  ],
  'Freshly brewed tea with a refreshing citrus finish. Served chilled over ice in a 16 oz cup.': [
    'Brewed tea',
    'Ice',
  ],
  'A chilled 500 ml bottle of purified drinking water.': ['Purified water'],
};

export function mealIngredients(meal: Meal): string[] {
  if (meal.ingredients) return meal.ingredients;
  const description = meal.description.trim();
  return Object.hasOwn(catalogRecipes, description) ? catalogRecipes[description] : [];
}
