import { View, type DimensionValue } from 'react-native';

import { radius as radii } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

type SkeletonProps = {
  width: DimensionValue;
  height: number;
  radius?: keyof typeof radii;
};

// A static placeholder block shaped like the content that is loading. It is
// deliberately not animated: motion is reserved for responses to the user.
// Screens give the loading area itself an accessibility label such as "Loading".
export function Skeleton({ width, height, radius = 'xs' }: SkeletonProps) {
  const { colors } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{ width, height, borderRadius: radii[radius], backgroundColor: colors.separator }}
    />
  );
}
