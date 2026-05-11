import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CreatureSprite } from '../../src/components/common/CreatureSprite';
import { CurrencyHeader } from '../../src/components/common/CurrencyHeader';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import { STAGES } from '../../src/data/stages';
import { usePlayerStore } from '../../src/stores/playerStore';
import { COLORS } from '../../src/theme';

export default function HomeScreen() {
  const displayName = usePlayerStore((s) => s.displayName);
  const owned = usePlayerStore((s) => s.ownedCreatures);
  const completedStages = usePlayerStore((s) => s.completedStages);
  const team = usePlayerStore((s) => s.team);
  const resetAll = usePlayerStore((s) => s.resetAll);
  const teamFilled = team.filter((t) => t.instanceId).length;
  const [resetArmed, setResetArmed] = useState(false);

  // Two-step confirmation: first tap arms, second tap resets. Auto-disarms
  // after 3s so the player can't trip it accidentally on a later visit.
  const handleResetTap = () => {
    if (!resetArmed) {
      setResetArmed(true);
      setTimeout(() => setResetArmed(false), 3000);
      return;
    }
    resetAll();
    setResetArmed(false);
    router.replace('/');
  };

  const completedCount = Object.keys(completedStages).length;
  const nextStage = STAGES.find((s) => !completedStages[s.id]);
  const allCleared = !nextStage;

  const showcaseId = owned[0]?.creatureId ?? 'tabby';
  const showcaseDef = CREATURES_BY_ID[showcaseId];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome,</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
        <CurrencyHeader />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.showcaseCard}>
          <CreatureSprite
            creatureId={showcaseDef.id}
            type={showcaseDef.type}
            size={120}
          />
          <Text style={styles.showcaseTitle}>Creature Clash</Text>
          <Text style={styles.showcaseSub}>
            The neighborhood is in turmoil. Cats squabble. Dogs rally. Strays
            roam. Build a pack and claim the block.
          </Text>
        </View>

        <View style={styles.row}>
          <Stat label="Pets" value={owned.length.toString()} />
          <Stat label="Pack Size" value={`${teamFilled}/5`} />
          <Stat label="Stages" value={completedCount.toString()} />
        </View>

        <Pressable
          onPress={() => router.push('/battle')}
          style={({ pressed }) => [
            styles.bigButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.bigButtonLabel}>
            {allCleared ? 'Revisit the Block' : 'Continue Adventure'}
          </Text>
          <Text style={styles.bigButtonSub}>
            {allCleared
              ? 'Replay any stage for more recruits and XP.'
              : `Next: ${nextStage.name} (Lv ${nextStage.enemyLevel})`}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/creatures')}
          style={({ pressed }) => [
            styles.secondaryButton,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.secondaryLabel}>Manage Team</Text>
        </Pressable>

        <View style={styles.tipBox}>
          <Text style={styles.tipTitle}>Field Notes</Text>
          <Text style={styles.tip}>• Front row takes hits first — put tough pets there.</Text>
          <Text style={styles.tip}>• Cunning outwits Predator. Social outnumbers Predator.</Text>
          <Text style={styles.tip}>• Swift dodges Tough. Wild breaks Swift formations.</Text>
        </View>

        <Pressable
          onPress={handleResetTap}
          style={({ pressed }) => [
            styles.resetButton,
            resetArmed && styles.resetButtonArmed,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text
            style={[
              styles.resetLabel,
              resetArmed && styles.resetLabelArmed,
            ]}
          >
            {resetArmed
              ? 'Tap again to wipe save'
              : 'Start New Game'}
          </Text>
          <Text
            style={[
              styles.resetSub,
              resetArmed && { color: COLORS.bg },
            ]}
          >
            {resetArmed
              ? 'All pets, gold, gems, and progress will be reset'
              : 'Wipes all progress and grants a fresh starter pack'}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.bgElev,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  greeting: { color: COLORS.textDim, fontSize: 12 },
  name: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  scroll: { padding: 16, paddingBottom: 60, gap: 14 },
  showcaseCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderColor: COLORS.border,
    borderWidth: 1,
    gap: 8,
  },
  showcaseTitle: {
    color: COLORS.accent,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 8,
  },
  showcaseSub: {
    color: COLORS.textDim,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', gap: 8 },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  statValue: { color: COLORS.accent, fontSize: 20, fontWeight: '900' },
  statLabel: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  bigButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  bigButtonLabel: { color: COLORS.bg, fontWeight: '900', fontSize: 18 },
  bigButtonSub: { color: COLORS.bg, opacity: 0.8, fontSize: 12, marginTop: 4 },
  secondaryButton: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  secondaryLabel: { color: COLORS.text, fontWeight: '700' },
  tipBox: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  tipTitle: { color: COLORS.accent, fontWeight: '800', marginBottom: 4 },
  tip: { color: COLORS.textDim, fontSize: 12 },
  resetButton: {
    marginTop: 8,
    backgroundColor: 'transparent',
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  resetButtonArmed: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  resetLabel: { color: COLORS.textDim, fontSize: 13, fontWeight: '700' },
  resetLabelArmed: { color: COLORS.text, fontSize: 14, fontWeight: '900' },
  resetSub: { color: COLORS.textDim, fontSize: 11, textAlign: 'center' },
});
