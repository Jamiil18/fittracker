import { Camera, GeoJSONSource, Layer, Map } from '@maplibre/maplibre-react-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { radius, spacing } from '@/theme/layout';
import { useTheme } from '@/theme/useTheme';

import { routeBounds, type RoutePoint } from '../utils/route';

// OpenFreeMap's free vector styles: no API key, OpenStreetMap data. Positron
// is calm and light; its dark counterpart is used in dark mode.
const mapStyles = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

type RouteMapProps = {
  points: RoutePoint[];
  // While recording, the map follows the latest point; afterwards it fits the
  // whole route.
  follow: boolean;
  accessibilityLabel: string;
};

// The route as a line in the accent colour, with the latest point marked.
// OpenStreetMap is credited on the map, as its licence requires.
export function RouteMap({ points, follow, accessibilityLabel }: RouteMapProps) {
  const { colors, scheme } = useTheme();
  const last = points[points.length - 1];
  const bounds = routeBounds(points);

  return (
    <View style={styles.frame} accessible accessibilityLabel={accessibilityLabel}>
      <Map
        style={styles.map}
        mapStyle={scheme === 'dark' ? mapStyles.dark : mapStyles.light}
        logo={false}
        compass={false}
        attribution
        attributionPosition={{ bottom: 4, right: 4 }}
      >
        {follow && last ? (
          <Camera center={[last[0], last[1]]} zoom={16} duration={500} />
        ) : bounds ? (
          <Camera
            bounds={bounds}
            padding={{ top: 32, right: 32, bottom: 32, left: 32 }}
            duration={0}
          />
        ) : null}
        {points.length >= 2 ? (
          <GeoJSONSource
            id="route"
            data={{
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'LineString',
                coordinates: points.map((point) => [point[0], point[1]]),
              },
            }}
          >
            <Layer
              type="line"
              id="route-line"
              paint={{ 'line-color': colors.accent, 'line-width': 4 }}
              layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            />
          </GeoJSONSource>
        ) : null}
        {last ? (
          <GeoJSONSource
            id="latest"
            data={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: [last[0], last[1]] },
            }}
          >
            <Layer
              type="circle"
              id="latest-point"
              paint={{
                'circle-radius': 6,
                'circle-color': colors.accent,
                'circle-stroke-color': colors.surface,
                'circle-stroke-width': 2,
              }}
            />
          </GeoJSONSource>
        ) : null}
      </Map>
      <Text
        variant="caption"
        style={[styles.credit, { backgroundColor: colors.surface, color: colors.textMuted }]}
      >
        © OpenStreetMap contributors
      </Text>
      {!last ? (
        <View style={[styles.waiting, { backgroundColor: colors.surface }]}>
          <Text variant="secondary" tone="textMuted">
            Waiting for GPS…
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, overflow: 'hidden' },
  map: { flex: 1 },
  credit: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.xs,
  },
  waiting: {
    position: 'absolute',
    top: spacing.md,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
});
