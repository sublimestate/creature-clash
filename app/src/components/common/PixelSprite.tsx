import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PixelSpriteData, SPRITES, TEMPLATES } from '../../data/pixelSprites';

interface Props {
  creatureId: string;
  size: number;
  fainted?: boolean;
  flip?: boolean;
}

const GRID = 16;

// Renders a creature as a 16×16 grid of colored cells. Each cell is one
// flex View. The whole sprite is 256 cells; React Native handles this fine
// for static sprites and there are at most ~10 visible at once.
export function PixelSprite({ creatureId, size, fainted, flip }: Props) {
  const data: PixelSpriteData | undefined = SPRITES[creatureId];
  const cellSize = size / GRID;

  // Pre-compute the row arrays — character + palette color per cell.
  const rows = useMemo(() => {
    if (!data) return null;
    const tmpl = TEMPLATES[data.template];
    return tmpl.rows.map((row) =>
      Array.from(row).map((ch) => {
        if (ch === '.') return null;
        const idx = ch.charCodeAt(0) - 48; // '0' = 48
        return data.palette[idx] ?? null;
      }),
    );
  }, [data]);

  if (!rows) return null;

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          opacity: fainted ? 0.25 : 1,
          transform: [{ scaleX: flip ? -1 : 1 }],
        },
      ]}
    >
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((color, ci) => (
            <View
              key={ci}
              style={{
                width: cellSize,
                height: cellSize,
                backgroundColor: color ?? 'transparent',
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    height: undefined,
  },
});
