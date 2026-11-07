import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { Text } from './Text';

type ListSectionProps = {
  title?: string;
  footer?: string;
  // Text buttons on the right of the title, such as "Reorder" and "New".
  actions?: ReactNode;
  children: ReactNode;
};

export function ListSection({ title, footer, actions, children }: ListSectionProps) {
  const { colors } = useTheme();
  const rows = Children.toArray(children);

  return (
    <View style={styles.section}>
      {title && actions ? (
        <View style={styles.titleRow}>
          <Text variant="caption" tone="textMuted" accessibilityRole="header">
            {title}
          </Text>
          <View style={styles.actions}>{actions}</View>
        </View>
      ) : title ? (
        <Text variant="caption" tone="textMuted" accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <View
        style={[styles.rows, { backgroundColor: colors.surface, borderColor: colors.separator }]}
      >
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? (
              <View
                testID="list-separator"
                style={[styles.separator, { backgroundColor: colors.separator }]}
              />
            ) : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <Text variant="secondary" tone="textMuted" style={styles.footer}>
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: spacing.xl },
  title: {
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.sm,
  },
  // The buttons bring their own touch padding, so the row needs none below.
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: screenPadding,
  },
  actions: { flexDirection: 'row' },
  rows: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  // Inset to line up with the row text, as in platform settings lists.
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: screenPadding,
  },
  footer: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
});
