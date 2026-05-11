import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CreatureSprite } from '../../src/components/common/CreatureSprite';
import { ABILITIES } from '../../src/data/abilities';
import { CREATURES_BY_ID } from '../../src/data/creatures';
import {
  STARTER_CANDIDATE_IDS,
  STARTER_PICK_COUNT,
} from '../../src/data/starterCandidates';
import { statsAtLevel } from '../../src/engine/stats';
import { TYPE_COLORS } from '../../src/engine/types';
import { usePlayerStore } from '../../src/stores/playerStore';
import { COLORS } from '../../src/theme';

type Step = 'name' | 'pick' | 'nickname';

export default function SelectStarterScreen() {
  const setName = usePlayerStore((s) => s.setName);
  const selectStarters = usePlayerStore((s) => s.selectStarters);

  const [step, setStep] = useState<Step>('name');
  const [trainerName, setTrainerName] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  const trainerNameValid = trainerName.trim().length >= 1 && trainerName.trim().length <= 16;
  const pickReady = picked.length === STARTER_PICK_COUNT;

  const togglePick = (id: string) => {
    setPicked((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= STARTER_PICK_COUNT) return prev;
      return [...prev, id];
    });
  };

  const handleStartGame = () => {
    setName(trainerName.trim());
    selectStarters(
      picked.map((cid) => ({
        creatureId: cid,
        nickname: nicknames[cid]?.trim() || undefined,
      })),
    );
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{stepLabel(step)}</Text>
        <Text style={styles.title}>{stepTitle(step)}</Text>
        <Text style={styles.subtitle}>{stepSubtitle(step)}</Text>
        <View style={styles.progressRow}>
          <ProgressDot active={step === 'name'} done={step !== 'name'} />
          <ProgressDot active={step === 'pick'} done={step === 'nickname'} />
          <ProgressDot active={step === 'nickname'} done={false} />
        </View>
      </View>

      {step === 'name' && (
        <NameStep
          value={trainerName}
          onChange={setTrainerName}
          valid={trainerNameValid}
          onContinue={() => setStep('pick')}
        />
      )}

      {step === 'pick' && (
        <PickStep
          picked={picked}
          onToggle={togglePick}
          ready={pickReady}
          onBack={() => setStep('name')}
          onContinue={() => setStep('nickname')}
        />
      )}

      {step === 'nickname' && (
        <NicknameStep
          picks={picked}
          nicknames={nicknames}
          setNickname={(cid, n) =>
            setNicknames((prev) => ({ ...prev, [cid]: n }))
          }
          trainerName={trainerName.trim()}
          onBack={() => setStep('pick')}
          onBegin={handleStartGame}
        />
      )}
    </View>
  );
}

function stepLabel(step: Step): string {
  return step === 'name'
    ? 'STEP 1 OF 3'
    : step === 'pick'
    ? 'STEP 2 OF 3'
    : 'STEP 3 OF 3';
}

function stepTitle(step: Step): string {
  return step === 'name'
    ? 'What do they call you?'
    : step === 'pick'
    ? 'Choose two pets'
    : 'Name your two pets';
}

function stepSubtitle(step: Step): string {
  return step === 'name'
    ? 'The block has been quiet, but not for long. Word travels fast — better to have a name people use.'
    : step === 'pick'
    ? "You won't see the rest of the block right away. Pick the pair that feels right — you'll earn more by winning battles."
    : "These are yours now. Give them names you'll mean.";
}

function ProgressDot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <View
      style={[
        styles.dot,
        active && { backgroundColor: COLORS.accent, width: 22 },
        done && { backgroundColor: COLORS.good },
      ]}
    />
  );
}

// ── Step 1: name ────────────────────────────────────────────────────

function NameStep({
  value,
  onChange,
  valid,
  onContinue,
}: {
  value: string;
  onChange: (v: string) => void;
  valid: boolean;
  onContinue: () => void;
}) {
  return (
    <View style={styles.stepBody}>
      <View style={styles.nameInputBox}>
        <Text style={styles.fieldLabel}>YOUR NAME</Text>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="e.g. Sam, Reggie, Toast"
          placeholderTextColor={COLORS.textDim}
          maxLength={16}
          autoFocus
          style={styles.textInput}
          returnKeyType="done"
          onSubmitEditing={() => valid && onContinue()}
        />
        <Text style={styles.fieldHint}>
          1–16 letters. Show up the way you want to be remembered.
        </Text>
      </View>

      <View style={styles.stepFooter}>
        <Pressable
          onPress={onContinue}
          disabled={!valid}
          style={({ pressed }) => [
            styles.primaryButton,
            !valid && styles.primaryButtonDisabled,
            { opacity: pressed && valid ? 0.85 : 1 },
          ]}
        >
          <Text
            style={[
              styles.primaryLabel,
              !valid && styles.primaryLabelDisabled,
            ]}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── Step 2: pick ────────────────────────────────────────────────────

function PickStep({
  picked,
  onToggle,
  ready,
  onBack,
  onContinue,
}: {
  picked: string[];
  onToggle: (id: string) => void;
  ready: boolean;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {STARTER_CANDIDATE_IDS.map((id) => {
          const def = CREATURES_BY_ID[id];
          if (!def) return null;
          const selected = picked.includes(id);
          const order = selected ? picked.indexOf(id) + 1 : null;
          return (
            <CandidateCard
              key={id}
              creatureId={id}
              selected={selected}
              order={order}
              onPress={() => onToggle(id)}
            />
          );
        })}
      </ScrollView>

      <View style={styles.stepFooter}>
        <Text style={styles.counter}>
          {picked.length} / {STARTER_PICK_COUNT} chosen
        </Text>
        <View style={styles.buttonRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backLabel}>‹ Back</Text>
          </Pressable>
          <Pressable
            onPress={onContinue}
            disabled={!ready}
            style={({ pressed }) => [
              styles.primaryButton,
              !ready && styles.primaryButtonDisabled,
              { flex: 1, opacity: pressed && ready ? 0.85 : 1 },
            ]}
          >
            <Text
              style={[
                styles.primaryLabel,
                !ready && styles.primaryLabelDisabled,
              ]}
            >
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

// ── Step 3: nickname ────────────────────────────────────────────────

function NicknameStep({
  picks,
  nicknames,
  setNickname,
  trainerName,
  onBack,
  onBegin,
}: {
  picks: string[];
  nicknames: Record<string, string>;
  setNickname: (creatureId: string, nickname: string) => void;
  trainerName: string;
  onBack: () => void;
  onBegin: () => void;
}) {
  return (
    <>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.greetingLine}>
          Welcome, {trainerName || 'trainer'}.
        </Text>

        {picks.map((cid) => {
          const def = CREATURES_BY_ID[cid];
          if (!def) return null;
          return (
            <View key={cid} style={styles.nicknameRow}>
              <CreatureSprite
                creatureId={cid}
                type={def.type}
                size={64}
              />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.nicknameSpecies}>
                  {def.name.toUpperCase()}
                </Text>
                <TextInput
                  value={nicknames[cid] ?? ''}
                  onChangeText={(t) => setNickname(cid, t)}
                  placeholder={`Name your ${def.name.toLowerCase()}`}
                  placeholderTextColor={COLORS.textDim}
                  maxLength={16}
                  style={styles.nicknameInput}
                />
                <Text style={styles.nicknameHint}>
                  Optional — leave blank to keep "{def.name}".
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.stepFooter}>
        <View style={styles.buttonRow}>
          <Pressable onPress={onBack} style={styles.backButton}>
            <Text style={styles.backLabel}>‹ Back</Text>
          </Pressable>
          <Pressable
            onPress={onBegin}
            style={({ pressed }) => [
              styles.primaryButton,
              { flex: 1, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={styles.primaryLabel}>Begin Adventure</Text>
          </Pressable>
        </View>
      </View>
    </>
  );
}

// ── Pick-step candidate card ────────────────────────────────────────

function CandidateCard({
  creatureId,
  selected,
  order,
  onPress,
}: {
  creatureId: string;
  selected: boolean;
  order: number | null;
  onPress: () => void;
}) {
  const def = CREATURES_BY_ID[creatureId];
  if (!def) return null;
  const stats = statsAtLevel(def, 3);
  const accent = TYPE_COLORS[def.type];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { borderColor: selected ? COLORS.accent : COLORS.border },
        selected && styles.cardSelected,
        pressed && { opacity: 0.9 },
      ]}
    >
      <View style={styles.cardTop}>
        <CreatureSprite creatureId={creatureId} type={def.type} size={72} />
        <View style={styles.cardInfo}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardName}>{def.name}</Text>
            {selected && order !== null && (
              <View style={styles.orderBadge}>
                <Text style={styles.orderBadgeText}>{order}</Text>
              </View>
            )}
          </View>
          <View style={styles.cardMeta}>
            <View style={[styles.typePill, { backgroundColor: accent }]}>
              <Text style={styles.typePillText}>
                {def.type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.lvl}>Lv 3</Text>
          </View>
          <Text style={styles.flavor}>{def.flavor}</Text>
        </View>
      </View>

      <View style={styles.cardBottom}>
        <View style={styles.statRow}>
          <Stat label="HP" value={stats.hp} />
          <Stat label="ATK" value={stats.atk} />
          <Stat label="DEF" value={stats.def} />
          <Stat label="SP.A" value={stats.spAtk} />
          <Stat label="SP.D" value={stats.spDef} />
          <Stat label="SPD" value={stats.spd} />
        </View>
        <View style={styles.abilityRow}>
          {def.abilities.map((aid) => {
            const a = ABILITIES[aid];
            if (!a) return null;
            return (
              <View key={aid} style={styles.abilityChip}>
                <Text style={styles.abilityName}>{a.name}</Text>
                <Text style={styles.abilityMeta}>
                  {a.power > 0 ? `${a.power} pwr · ` : ''}
                  CD {a.cooldown}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Pressable>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.bgElev,
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    gap: 4,
  },
  eyebrow: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  title: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.textDim,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 10,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.border,
  },
  stepBody: { flex: 1, justifyContent: 'space-between' },
  scroll: { padding: 14, paddingBottom: 24, gap: 12 },
  greetingLine: {
    color: COLORS.text,
    fontSize: 15,
    fontStyle: 'italic',
    marginBottom: 8,
  },

  // Name step
  nameInputBox: {
    padding: 24,
    gap: 8,
  },
  fieldLabel: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  textInput: {
    backgroundColor: COLORS.panel,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    padding: 14,
    borderRadius: 10,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  fieldHint: { color: COLORS.textDim, fontSize: 12 },

  // Nickname step
  nicknameRow: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  nicknameSpecies: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
  },
  nicknameInput: {
    backgroundColor: COLORS.bgElev,
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '700',
    padding: 10,
    borderRadius: 8,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  nicknameHint: { color: COLORS.textDim, fontSize: 11 },

  // Step footer + buttons
  stepFooter: {
    padding: 14,
    paddingBottom: 28,
    backgroundColor: COLORS.bgElev,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 10,
  },
  counter: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1,
  },
  buttonRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  backLabel: { color: COLORS.text, fontWeight: '700' },
  primaryButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.panel,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  primaryLabel: {
    color: COLORS.bg,
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 2,
  },
  primaryLabelDisabled: { color: COLORS.textDim },

  // Pick-step card (same as before)
  card: {
    backgroundColor: COLORS.panel,
    borderRadius: 12,
    borderWidth: 2,
    padding: 12,
    gap: 12,
  },
  cardSelected: { backgroundColor: COLORS.panelLight },
  cardTop: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  cardInfo: { flex: 1, gap: 4 },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardName: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  orderBadge: {
    backgroundColor: COLORS.accent,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBadgeText: { color: COLORS.bg, fontWeight: '900', fontSize: 12 },
  cardMeta: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  typePill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  typePillText: {
    color: COLORS.bg,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  lvl: { color: COLORS.textDim, fontSize: 12, fontWeight: '700' },
  flavor: {
    color: COLORS.textDim,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardBottom: { gap: 8 },
  statRow: { flexDirection: 'row', gap: 4 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.bgElev,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 4,
    alignItems: 'center',
  },
  statLabel: { color: COLORS.textDim, fontSize: 9, fontWeight: '800' },
  statValue: { color: COLORS.text, fontSize: 13, fontWeight: '900' },
  abilityRow: { flexDirection: 'row', gap: 6 },
  abilityChip: {
    flex: 1,
    backgroundColor: COLORS.bgElev,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 6,
    padding: 6,
  },
  abilityName: { color: COLORS.text, fontWeight: '800', fontSize: 12 },
  abilityMeta: { color: COLORS.textDim, fontSize: 10, marginTop: 2 },
});
