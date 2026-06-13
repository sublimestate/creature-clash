import FontAwesome from '@expo/vector-icons/FontAwesome';
import React, { useSyncExternalStore } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { isMuted, subscribeMuted, toggleMuted } from '../../audio';
import { COLORS } from '../../theme';

export function MuteButton() {
  const muted = useSyncExternalStore(subscribeMuted, isMuted, isMuted);
  return (
    <Pressable
      onPress={() => toggleMuted()}
      style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
      accessibilityRole="button"
      accessibilityLabel={muted ? 'Unmute audio' : 'Mute audio'}
    >
      <FontAwesome
        name={muted ? 'volume-off' : 'volume-up'}
        size={16}
        color={muted ? COLORS.textDim : COLORS.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    userSelect: 'none',
    cursor: 'pointer',
  },
});
