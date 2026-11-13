import { MD3LightTheme } from 'react-native-paper';
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
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  display: 'Manrope_800ExtraBold',
};
