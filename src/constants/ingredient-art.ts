import type { ImageSourcePropType } from 'react-native';
import type { Meal } from '@/types';
import { mealIngredients } from './meal-ingredients';

export type IngredientLayer = {
  label?: string;
  image: ImageSourcePropType;
  aspectRatio: number;
  height: number;
  assembled: number;
  separated: number;
  x: number;
  angle: number;
};
export type IngredientArt = { key: string; name: RegExp; layers: IngredientLayer[] };

// Drink scenes also use textures and vessel images outside their listed layers.
const drinkSources: Record<string, ImageSourcePropType[]> = {
  tea: [
    require('../../assets/ingredients/tea-ice.webp'),
    require('../../assets/ingredients/tea-glass.webp'),
    require('../../assets/ingredients/tea-brewed-tea.webp'),
    require('../../assets/ingredients/tea-splash.webp'),
  ],
  water: [
    require('../../assets/ingredients/water-liquid.webp'),
    require('../../assets/ingredients/water-bottle.webp'),
    require('../../assets/ingredients/water-splash.webp'),
  ],
};

export function ingredientImageSources(art: IngredientArt): ImageSourcePropType[] {
  return [...new Set(drinkSources[art.key] ?? art.layers.map((layer) => layer.image))];
}

// Positions are proportions of the stage height. Every layer moves independently.
const burgerLayers: IngredientLayer[] = [
  {
    label: 'Sesame bun',
    image: require('../../assets/ingredients/bun-top-floating.webp'),
    aspectRatio: 1.6490066225165563,
    height: 0.2,
    assembled: 0.31,
    separated: 0.035,
    x: 8,
    angle: -7,
  },
  {
    label: 'Signature sauce',
    image: require('../../assets/ingredients/sauce-floating.webp'),
    aspectRatio: 2.4285714285714284,
    height: 0.12,
    assembled: 0.42,
    separated: 0.24,
    x: -4,
    angle: 6,
  },
  {
    label: 'Lettuce',
    image: require('../../assets/ingredients/lettuce-floating.webp'),
    aspectRatio: 2.0326530612244897,
    height: 0.18,
    assembled: 0.42,
    separated: 0.32,
    x: -6,
    angle: -5,
  },
  {
    label: 'Tomato',
    image: require('../../assets/ingredients/tomato-floating.webp'),
    aspectRatio: 2.0203252032520327,
    height: 0.16,
    assembled: 0.47,
    separated: 0.47,
    x: 9,
    angle: 7,
  },
  {
    label: 'Beef patty',
    image: require('../../assets/ingredients/patty-floating.webp'),
    aspectRatio: 1.8109090909090908,
    height: 0.19,
    assembled: 0.49,
    separated: 0.61,
    x: -7,
    angle: -5,
  },
  {
    label: 'Sesame bun',
    image: require('../../assets/ingredients/bun-base-floating.webp'),
    aspectRatio: 1.896153846153846,
    height: 0.17,
    assembled: 0.59,
    separated: 0.8,
    x: 7,
    angle: 7,
  },
];

const recipes: IngredientArt[] = [
  { key: 'burger', name: /burger/i, layers: burgerLayers },
  {
    key: 'chicken',
    name: /fried chicken/i,
    layers: [
      {
        label: 'Fried chicken',
        image: require('../../assets/ingredients/chicken-fried.webp'),
        aspectRatio: 1.2598425196850394,
        height: 0.3,
        assembled: 0.28,
        separated: 0.03,
        x: -5,
        angle: -4,
      },
      {
        label: 'House gravy',
        image: require('../../assets/ingredients/chicken-gravy.webp'),
        aspectRatio: 1.92,
        height: 0.16,
        assembled: 0.48,
        separated: 0.39,
        x: 6,
        angle: 4,
      },
      {
        label: 'Steamed rice',
        image: require('../../assets/ingredients/chicken-rice.webp'),
        aspectRatio: 1.437125748502994,
        height: 0.27,
        assembled: 0.52,
        separated: 0.69,
        x: 0,
        angle: -3,
      },
    ],
  },
  {
    key: 'adobo',
    name: /adobo/i,
    layers: [
      {
        label: 'Chicken',
        image: require('../../assets/ingredients/adobo-chicken.webp'),
        aspectRatio: 1.2814207650273224,
        height: 0.19,
        assembled: 0.34,
        separated: 0.02,
        x: 1,
        angle: -3,
      },
      {
        label: 'Soy sauce',
        image: require('../../assets/ingredients/adobo-soy-sauce.webp'),
        aspectRatio: 1.7718631178707225,
        height: 0.1,
        assembled: 0.48,
        separated: 0.24,
        x: -4,
        angle: 3,
      },
      {
        label: 'Vinegar',
        image: require('../../assets/ingredients/adobo-vinegar.webp'),
        aspectRatio: 2.0565217391304347,
        height: 0.09,
        assembled: 0.49,
        separated: 0.38,
        x: 5,
        angle: -3,
      },
      {
        label: 'Garlic',
        image: require('../../assets/ingredients/adobo-garlic.webp'),
        aspectRatio: 1.2848101265822784,
        height: 0.11,
        assembled: 0.52,
        separated: 0.5,
        x: -3,
        angle: 4,
      },
      {
        label: 'Bay leaves',
        image: require('../../assets/ingredients/adobo-bay-leaves.webp'),
        aspectRatio: 1.2492997198879552,
        height: 0.12,
        assembled: 0.55,
        separated: 0.64,
        x: 4,
        angle: -5,
      },
      {
        label: 'Steamed rice',
        image: require('../../assets/ingredients/adobo-rice.webp'),
        aspectRatio: 1.3959537572254335,
        height: 0.19,
        assembled: 0.58,
        separated: 0.79,
        x: 0,
        angle: 2,
      },
    ],
  },
  {
    key: 'sisig',
    name: /sisig/i,
    layers: [
      {
        label: 'Pork',
        image: require('../../assets/ingredients/sisig-pork.webp'),
        aspectRatio: 1.385321100917431,
        height: 0.26,
        assembled: 0.36,
        separated: 0.03,
        x: 0,
        angle: -4,
      },
      {
        label: 'Onions',
        image: require('../../assets/ingredients/sisig-onions.webp'),
        aspectRatio: 1.670731707317073,
        height: 0.15,
        assembled: 0.41,
        separated: 0.33,
        x: 5,
        angle: 3,
      },
      {
        label: 'Calamansi',
        image: require('../../assets/ingredients/sisig-calamansi.webp'),
        aspectRatio: 1.2699530516431925,
        height: 0.15,
        assembled: 0.45,
        separated: 0.53,
        x: -3,
        angle: -3,
      },
      {
        label: 'Steamed rice',
        image: require('../../assets/ingredients/sisig-rice.webp'),
        aspectRatio: 1.2993348115299335,
        height: 0.24,
        assembled: 0.51,
        separated: 0.73,
        x: 0,
        angle: 2,
      },
    ],
  },
  {
    key: 'noodles',
    name: /pancit canton/i,
    layers: [
      {
        label: 'Vegetables',
        image: require('../../assets/ingredients/noodles-vegetables.webp'),
        aspectRatio: 1.541025641025641,
        height: 0.2,
        assembled: 0.32,
        separated: 0.03,
        x: 5,
        angle: -3,
      },
      {
        label: 'House sauce',
        image: require('../../assets/ingredients/noodles-house-sauce.webp'),
        aspectRatio: 1.7574850299401197,
        height: 0.12,
        assembled: 0.43,
        separated: 0.29,
        x: 0,
        angle: 3,
      },
      {
        label: 'Egg noodles',
        image: require('../../assets/ingredients/noodles-egg-noodles.webp'),
        aspectRatio: 1.6308539944903582,
        height: 0.29,
        assembled: 0.47,
        separated: 0.47,
        x: -4,
        angle: -3,
      },
      {
        label: 'Calamansi',
        image: require('../../assets/ingredients/noodles-calamansi.webp'),
        aspectRatio: 1.5619596541786744,
        height: 0.16,
        assembled: 0.57,
        separated: 0.8,
        x: 6,
        angle: 3,
      },
    ],
  },
  {
    key: 'fries',
    name: /french fries/i,
    layers: [
      {
        label: 'Salt',
        image: require('../../assets/ingredients/fries-salt.webp'),
        aspectRatio: 1.876865671641791,
        height: 0.16,
        assembled: 0.44,
        separated: 0.06,
        x: 4,
        angle: -4,
      },
      {
        label: 'Tomato ketchup',
        image: require('../../assets/ingredients/fries-ketchup.webp'),
        aspectRatio: 1.5485714285714285,
        height: 0.19,
        assembled: 0.46,
        separated: 0.33,
        x: -4,
        angle: 3,
      },
      {
        label: 'Potato',
        image: require('../../assets/ingredients/fries-potato.webp'),
        aspectRatio: 1.3645569620253164,
        height: 0.36,
        assembled: 0.5,
        separated: 0.6,
        x: 0,
        angle: -3,
      },
    ],
  },
  {
    key: 'tea',
    name: /iced tea/i,
    layers: [
      {
        label: 'Ice',
        image: require('../../assets/ingredients/tea-ice.webp'),
        aspectRatio: 1.2913907284768211,
        height: 0.28,
        assembled: 0.39,
        separated: 0.05,
        x: 4,
        angle: 3,
      },
      {
        label: 'Brewed tea',
        image: require('../../assets/ingredients/tea-brewed-tea.webp'),
        aspectRatio: 1.824524312896406,
        height: 0.42,
        assembled: 0.46,
        separated: 0.48,
        x: 0,
        angle: -2,
      },
    ],
  },
  {
    key: 'water',
    name: /bottled water/i,
    layers: [
      {
        label: 'Purified water',
        image: require('../../assets/ingredients/water-liquid.webp'),
        aspectRatio: 0.7574074074074074,
        height: 0.3,
        assembled: 0.46,
        separated: 0.06,
        x: -3,
        angle: -3,
      },
      {
        image: require('../../assets/ingredients/water-bottle.webp'),
        aspectRatio: 0.3682170542635659,
        height: 0.43,
        assembled: 0.35,
        separated: 0.54,
        x: 3,
        angle: 0,
      },
    ],
  },
];

export function ingredientArtFor(meal: Meal): IngredientArt | undefined {
  const ingredients = new Set(mealIngredients(meal).map((value) => value.trim().toLowerCase()));
  return recipes.find((recipe) => {
    const labels = new Set(
      recipe.layers.flatMap((layer) => (layer.label ? [layer.label.toLowerCase()] : [])),
    );
    return (
      recipe.name.test(meal.name) &&
      ingredients.size === labels.size &&
      [...labels].every((label) => ingredients.has(label))
    );
  });
}
