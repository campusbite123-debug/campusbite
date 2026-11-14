import { configureFonts, MD3LightTheme } from 'react-native-paper';
export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  display: 'PlusJakartaSans_700Bold',
};
const paperFonts = configureFonts({ config: { fontFamily: fonts.regular, fontWeight: '400' } });
export const colors = {
  orange: '#F56B28',
  orangeDark: '#D94F12',
  peach: '#FFF0E6',
  cream: '#FAF9F6',
  ink: '#242B24',
  muted: '#85877F',
  line: '#ECECE5',
  green: '#64814C',
  greenLight: '#EEF4E8',
  white: '#FFFFFF',
  red: '#C4493B',
};
export const theme = {
  ...MD3LightTheme,
  roundness: 4,
  fonts: {
    ...paperFonts,
    displayLarge: { ...paperFonts.displayLarge, fontFamily: fonts.display },
    displayMedium: { ...paperFonts.displayMedium, fontFamily: fonts.display },
    displaySmall: { ...paperFonts.displaySmall, fontFamily: fonts.display },
    headlineLarge: { ...paperFonts.headlineLarge, fontFamily: fonts.display },
    headlineMedium: { ...paperFonts.headlineMedium, fontFamily: fonts.display },
    headlineSmall: { ...paperFonts.headlineSmall, fontFamily: fonts.display },
    titleLarge: { ...paperFonts.titleLarge, fontFamily: fonts.display },
    titleMedium: { ...paperFonts.titleMedium, fontFamily: fonts.semibold },
    titleSmall: { ...paperFonts.titleSmall, fontFamily: fonts.semibold },
    labelLarge: { ...paperFonts.labelLarge, fontFamily: fonts.semibold },
    labelMedium: { ...paperFonts.labelMedium, fontFamily: fonts.medium },
    labelSmall: { ...paperFonts.labelSmall, fontFamily: fonts.medium },
  },
  colors: {
    ...MD3LightTheme.colors,
    primary: colors.orange,
    secondary: colors.green,
    background: colors.cream,
    surface: colors.white,
    onSurface: colors.ink,
    outline: '#DCDDD4',
    error: colors.red,
  },
};
