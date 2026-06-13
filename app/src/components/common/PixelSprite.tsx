import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { PixelSpriteData, SPRITES } from '../../data/pixelSprites';

// Palette index for a row char: '0'-'9' → 0-9, 'a'-'f' → 10-15.
function charToIndex(ch: string): number {
  const code = ch.charCodeAt(0);
  return code <= 57 ? code - 48 : code - 87;
}

interface Props {
  creatureId: string;
  size: number;
  fainted?: boolean;
  flip?: boolean;
}

// Renders a creature as an N×N grid of colored cells where N is the
// template's declared `grid` (16 or 32). Each cell is one flex View;
// React Native handles this fine for static sprites at our visible counts.
export function PixelSprite({ creatureId, size, fainted, flip }: Props) {
  const data: PixelSpriteData | undefined = SPRITES[creatureId];

  // Pre-compute the row arrays — character + palette color per cell.
  const rendered = useMemo(() => {
    if (!data) return null;
    const tmpl = data.template;
    const grid = tmpl.grid;
    const rows = tmpl.rows.map((row) =>
      Array.from(row).map((ch) => {
        if (ch === '.') return null;
        const color = data.palette[charToIndex(ch)];
        return color && color !== 'transparent' ? color : null;
      }),
    );
    return { grid, rows };
  }, [data]);

  if (!rendered) return null;

  const cellSize = size / rendered.grid;

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
      {rendered.rows.map((row, ri) => (
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
