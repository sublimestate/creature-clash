import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { CreatureSprite } from '../common/CreatureSprite';
import { CREATURES_BY_ID } from '../../data/creatures';
import { ABILITIES } from '../../data/abilities';
import { COLORS } from '../../theme';
import { TYPE_COLORS } from '../../engine/types';
import { HealthBar } from './HealthBar';
import { DamageNumber } from './DamageNumber';
import { CreatureType, Effectiveness, StatusKind } from '../../types';

export interface UnitDisplayState {
  instanceId: string;
  creatureId: string;
  name: string;
  level: number;
  hp: number;
  maxHp: number;
  isAlive: boolean;
  side: 'player' | 'enemy';
  position: 'front' | 'back';
  slot: number;
  // Status icons + cooldown indicator
  statuses: StatusKind[];
  // Cooldown for the special move (second ability). 0 = ready.
  specialCooldown: number;
  // Animation triggers
  attackTick?: number; // increment to trigger attack lunge
  hitTick?: number; // increment to trigger hit shake
  popup?: { value: number; kind: 'damage' | 'heal'; eff?: Effectiveness; tick: number };
  flash?: { type: CreatureType; tick: number };
  active?: boolean;
}

interface Props {
  unit: UnitDisplayState;
}

const STATUS_GLYPHS: Record<StatusKind, { icon: string; color: string }> = {
  bleed: { icon: '✦', color: '#E54B4B' },
  stun: { icon: '✷', color: '#FFD93D' },
  daze: { icon: '✺', color: '#B978FF' },
};

export function BattleUnit({ unit }: Props) {
  const def = CREATURES_BY_ID[unit.creatureId];
  if (!def) return null;
  const flip = unit.side === 'enemy';

  const tx = useSharedValue(0);
  const sx = useSharedValue(0);
  const flashOpacity = useSharedValue(0);

  React.useEffect(() => {
    if (unit.attackTick === undefined) return;
    const dir = unit.side === 'player' ? 1 : -1;
    tx.value = withSequence(
      withTiming(15 * dir, { duration: 110 }),
      withTiming(-5 * dir, { duration: 90 }),
      withTiming(0, { duration: 140 }),
    );
  }, [unit.attackTick, unit.side, tx]);

  React.useEffect(() => {
    if (unit.hitTick === undefined) return;
    sx.value = withSequence(
      withTiming(8, { duration: 50 }),
      withTiming(-8, { duration: 60 }),
      withTiming(4, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [unit.hitTick, sx]);

  React.useEffect(() => {
    if (!unit.flash) return;
    flashOpacity.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withTiming(0, { duration: 320 }),
    );
  }, [unit.flash?.tick, flashOpacity]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value + sx.value }],
  }));

  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));
  const flashColor = unit.flash ? TYPE_COLORS[unit.flash.type] : 'transparent';

  const specialAbility = def.abilities[1];
  const cdMax = specialAbility ? ABILITIES[specialAbility]?.cooldown ?? 0 : 0;
  const showCooldown = unit.isAlive && cdMax > 0;

  return (
    <View style={[styles.container, unit.active && styles.active]}>
      <Text style={styles.name} numberOfLines={1}>
        {unit.name}
      </Text>
      <Text style={styles.level}>Lv {unit.level}</Text>
      <HealthBar hp={unit.hp} maxHp={unit.maxHp} width={70} />
      {unit.statuses.length > 0 && (
        <View style={styles.statusRow}>
          {unit.statuses.map((s, i) => (
            <Text
              key={`${s}-${i}`}
              style={[styles.statusIcon, { color: STATUS_GLYPHS[s].color }]}
            >
              {STATUS_GLYPHS[s].icon}
            </Text>
          ))}
        </View>
      )}
      <Animated.View style={[styles.spriteWrap, animStyle]}>
        <CreatureSprite
          creatureId={def.id}
          type={def.type}
          size={56}
          fainted={!unit.isAlive}
          flip={flip}
        />
        <Animated.View
          style={[
            styles.flashOverlay,
            { backgroundColor: flashColor, pointerEvents: 'none' },
            flashStyle,
          ]}
        />
        {unit.popup && (
          <View
            key={unit.popup.tick}
            style={[styles.popupAnchor, { pointerEvents: 'none' }]}
          >
            <DamageNumber
              value={unit.popup.value}
              kind={unit.popup.kind}
              effectiveness={unit.popup.eff}
              visible
            />
          </View>
        )}
        {showCooldown && (
          <View
            style={[
              styles.cdBadge,
              unit.specialCooldown === 0 ? styles.cdReady : styles.cdWaiting,
            ]}
          >
            <Text
              style={[
                styles.cdText,
                { color: unit.specialCooldown === 0 ? COLORS.bg : COLORS.text },
              ]}
            >
              {unit.specialCooldown === 0 ? '★' : unit.specialCooldown}
            </Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 80,
    alignItems: 'center',
    gap: 2,
    padding: 4,
    borderRadius: 6,
  },
  active: {
    backgroundColor: 'rgba(255,217,61,0.12)',
    borderColor: COLORS.accent,
    borderWidth: 1,
  },
  name: { color: COLORS.text, fontSize: 11, fontWeight: '800' },
  level: { color: COLORS.textDim, fontSize: 9 },
  spriteWrap: {
    marginTop: 4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  flashOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
  },
  popupAnchor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { flexDirection: 'row', gap: 2, height: 14 },
  statusIcon: { fontSize: 11, lineHeight: 14 },
  cdBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  cdReady: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.bg,
  },
  cdWaiting: {
    backgroundColor: COLORS.bg,
    borderColor: COLORS.border,
  },
  cdText: { fontSize: 10, fontWeight: '900' },
});
