import type { ImageSourcePropType } from 'react-native';
// Bundled catalog photographs make the presentation reliable without remote image requests.
// Original URLs remain editable in the database. Attribution: assets/meals/CREDITS.md.
const photos: Record<string, ImageSourcePropType> = {
  'Chicken_adobo_meal_20231025.jpg': require('../../assets/meals/adobo.jpg'),
  'Philippine_Sisig.jpg': require('../../assets/meals/sisig.jpg'),
  'photo-1562967914-608f82629710': require('../../assets/meals/chicken.jpg'),
  'photo-1516100882582-96c3a05fe590': require('../../assets/meals/noodles.jpg'),
  'photo-1568901346375-23c9450c58cd': require('../../assets/meals/burger.jpg'),
  'photo-1573080496219-bb080dd4f877': require('../../assets/meals/fries.jpg'),
  'photo-1556679343-c7306c1976bc': require('../../assets/meals/tea.jpg'),
  'photo-1602143407151-7111542de6e8': require('../../assets/meals/water.jpg'),
};
export const foodImageSource = (uri: string): ImageSourcePropType =>
  Object.entries(photos).find(([id]) => uri.includes(id))?.[1] ?? { uri };
