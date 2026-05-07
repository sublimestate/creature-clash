import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CurrencyHeader } from '../../src/components/common/CurrencyHeader';
import { CreatureSprite } from '../../src/components/common/CreatureSprite';
import { CHAPTERS } from '../../src/data/chapters';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import { STAGES } from '../../src/data/stages';
import { usePlayerStore } from '../../src/stores/playerStore';
import { COLORS } from '../../src/theme';

export default function BattleTab() {
  const completed = usePlayerStore((s) => s.completedStages);
  const seenIntros = usePlayerStore((s) => s.seenChapterIntros);
  const team = usePlayerStore((s) => s.team);
  const teamFilled = team.filter((t) => t.instanceId).length;

  // First stage of a chapter, with an unread intro? Route through the story
  // screen first; the intro then forwards to /preview.
  const handleStageTap = (stageId: string) => {
    const stage = STAGES.find((s) => s.id === stageId);
    if (!stage) return;
    if (stage.index === 1 && !seenIntros[stage.chapter]) {
      router.push({
        pathname: '/intro/[chapter]',
        params: { chapter: String(stage.chapter) },
      });
      return;
    }
    router.push(`/preview/${stageId}`);
  };

  // Group stages by chapter
  const chapters: Record<number, typeof STAGES> = {};
  for (const s of STAGES) {
    chapters[s.chapter] = chapters[s.chapter] ?? [];
    chapters[s.chapter].push(s);
  }

  // First uncompleted stage is unlocked; previous must be done.
  const isUnlocked = (idx: number) => {
    if (idx === 0) return true;
    return !!completed[STAGES[idx - 1].id];
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Campaign</Text>
        <CurrencyHeader />
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        {teamFilled === 0 && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              You don't have a team set! Visit the Creatures tab and assign at
              least one creature to a slot.
            </Text>
          </View>
        )}
        {Object.entries(chapters).map(([ch, stages]) => {
          const chMeta = CHAPTERS[Number(ch)];
          return (
          <View key={ch} style={styles.chapter}>
            <Text style={styles.chapterTitle}>
              Chapter {ch}{chMeta ? ` — ${chMeta.title}` : ''}
            </Text>
            {stages.map((stage) => {
              const idx = STAGES.findIndex((s) => s.id === stage.id);
              const unlocked = isUnlocked(idx);
              const stars = completed[stage.id]?.stars ?? 0;
              return (
                <Pressable
                  key={stage.id}
                  disabled={!unlocked || teamFilled === 0}
                  onPress={() => handleStageTap(stage.id)}
                  style={({ pressed }) => [
                    styles.stage,
                    !unlocked && styles.stageLocked,
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <View style={styles.stageRow}>
                    <View style={styles.stageInfo}>
                      <Text style={styles.stageName}>
                        {unlocked ? stage.name : '???'}
                      </Text>
                      <Text style={styles.stageMeta}>
                        Stage {stage.chapter}-{stage.index} · Lv {stage.enemyLevel}
                      </Text>
                      {stars > 0 && (
                        <Text style={styles.stars}>
                          {'★'.repeat(stars)}
                          {'☆'.repeat(3 - stars)}
                        </Text>
                      )}
                    </View>
                    <View style={styles.enemyRow}>
                      {unlocked &&
                        stage.enemies.slice(0, 3).map((cid, i) => {
                          const def = CREATURES_BY_ID[cid];
                          if (!def) return null;
                          return (
                            <View key={i} style={{ marginLeft: -10 }}>
                              <CreatureSprite
                                creatureId={def.id}
                                type={def.type}
                                size={36}
                              />
                            </View>
                          );
                        })}
                    </View>
                  </View>
                  {unlocked && (
                    <View style={styles.rewardRow}>
                      <Text style={styles.rewardText}>
                        💰 {stage.goldReward}  ✨ {stage.xpReward} XP
                      </Text>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
          );
        })}
      </ScrollView>
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
  title: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  scroll: { padding: 12, paddingBottom: 80, gap: 16 },
  warning: {
    backgroundColor: COLORS.danger,
    padding: 12,
    borderRadius: 8,
  },
  warningText: { color: COLORS.text, fontWeight: '700' },
  chapter: { gap: 8 },
  chapterTitle: {
    color: COLORS.accent,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 4,
  },
  stage: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  stageLocked: { opacity: 0.45 },
  stageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageInfo: { flex: 1, gap: 4 },
  stageName: { color: COLORS.text, fontWeight: '800', fontSize: 15 },
  stageMeta: { color: COLORS.textDim, fontSize: 12 },
  stars: { color: COLORS.accent, fontSize: 14, marginTop: 2 },
  enemyRow: { flexDirection: 'row' },
  rewardRow: { borderTopColor: COLORS.border, borderTopWidth: 1, paddingTop: 6 },
  rewardText: { color: COLORS.textDim, fontSize: 12 },
});
