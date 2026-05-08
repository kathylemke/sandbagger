'use client';

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../lib/AuthContext';
import { colors } from '../../../lib/theme';

type DrillType = 'score-based' | 'shot-log';

const CATEGORIES = [
  { key: 'putting', label: 'Putting', emoji: '🎯' },
  { key: 'short_game', label: 'Short Game', emoji: '⛳' },
  { key: 'distance_wedges', label: 'Distance/Wedges', emoji: '📐' },
  { key: 'full_swing', label: 'Full Swing', emoji: '🏌️' },
  { key: 'mental', label: 'Mental', emoji: '🧘' },
  { key: 'general', label: 'General', emoji: '📋' },
];

export default function BuildDrill() {
  const { user } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [drillType, setDrillType] = useState<DrillType>('score-based');
  const [category, setCategory] = useState('general');
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setDescription('');
    setDrillType('score-based');
    setCategory('general');
  };

  const handleSave = async () => {
    if (!user) {
      if (Platform.OS === 'web') window.alert('Please log in first');
      else Alert.alert('Error', 'Please log in first');
      return;
    }
    if (!name.trim()) {
      if (Platform.OS === 'web') window.alert('Drill name is required');
      else Alert.alert('Error', 'Drill name is required');
      return;
    }
    if (!description.trim()) {
      if (Platform.OS === 'web') window.alert('Description is required');
      else Alert.alert('Error', 'Description is required');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.from('sb_drills').insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim(),
        type: drillType,
        category,
        is_default: false,
      }).select().single();

      if (error) throw error;

      const msg = 'Drill created!';
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Success', msg);

      resetForm();
      router.push('/(tabs)/training');
    } catch (e: any) {
      console.error('Save drill error:', e);
      if (Platform.OS === 'web') window.alert(`Error: ${e.message}`);
      else Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={s.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Create Drill</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Name */}
        <Text style={s.label}>Drill Name *</Text>
        <TextInput
          style={s.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., Missed Green Up-and-Down"
          placeholderTextColor={colors.gray}
          maxLength={80}
        />

        {/* Type */}
        <Text style={s.label}>Drill Type *</Text>
        <View style={s.typeRow}>
          <TouchableOpacity
            style={[s.typeBtn, drillType === 'score-based' && s.typeBtnActive]}
            onPress={() => setDrillType('score-based')}
          >
            <Text style={[s.typeBtnEmoji]}>🎯</Text>
            <Text style={[s.typeBtnLabel, drillType === 'score-based' && s.typeBtnLabelActive]}>Score-Based</Text>
            <Text style={[s.typeBtnDesc, drillType === 'score-based' && s.typeBtnDescActive]}>
              Track total score. Define your own scoring rules below.
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.typeBtn, drillType === 'shot-log' && s.typeBtnActive]}
            onPress={() => setDrillType('shot-log')}
          >
            <Text style={[s.typeBtnEmoji]}>📝</Text>
            <Text style={[s.typeBtnLabel, drillType === 'shot-log' && s.typeBtnLabelActive]}>Shot-Log</Text>
            <Text style={[s.typeBtnDesc, drillType === 'shot-log' && s.typeBtnDescActive]}>
              Log each shot: intent, success, miss direction. No total score.
            </Text>
          </TouchableOpacity>
        </View>

        {/* Category */}
        <Text style={s.label}>Category</Text>
        <View style={s.catRow}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.key}
              style={[s.catPill, category === c.key && s.catPillActive]}
              onPress={() => setCategory(c.key)}
            >
              <Text style={s.catPillText}>{c.emoji} {c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <Text style={s.label}>
          {drillType === 'score-based' ? 'Scoring Rules & Description *' : 'Description *'}
        </Text>
        <TextInput
          style={[s.input, { minHeight: 120 }]}
          value={description}
          onChangeText={setDescription}
          placeholder={
            drillType === 'score-based'
              ? 'Describe the drill and how scoring works. E.g., "From missed greens: +1 point for up-and-down (chip within 3ft + 1 putt or holed), 0 for failed. Attempt 10 missed greens and total your score."'
              : 'Describe the drill and what to log. E.g., "Log each approach shot: club, intended shape (draw/fade/straight), whether you executed, miss direction if mishit. Look for patterns over time."'
          }
          placeholderTextColor={colors.gray}
          multiline
          textAlignVertical="top"
        />

        {/* Type-specific tips */}
        <View style={s.tipCard}>
          <Text style={s.tipTitle}>
            {drillType === 'score-based' ? '💡 Score-Based Drill Tips' : '💡 Shot-Log Drill Tips'}
          </Text>
          {drillType === 'score-based' ? (
            <>
              <Text style={s.tipText}>• Define exactly what counts as a "point" — be specific</Text>
              <Text style={s.tipText}>• Set a number of attempts (e.g., "10 shots" or "9 holes")</Text>
              <Text style={s.tipText}>• Consider tracking a single metric you can improve over time</Text>
            </>
          ) : (
            <>
              <Text style={s.tipText}>• Log shot_intent (what you tried to do) vs result</Text>
              <Text style={s.tipText}>• Track miss_direction to spot patterns (pull, push, short, etc.)</Text>
              <Text style={s.tipText}>• success boolean: did the shot accomplish its goal?</Text>
            </>
          )}
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[s.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : '✓ Save Drill'}</Text>
        </TouchableOpacity>

        {/* Cancel */}
        <TouchableOpacity
          style={s.cancelBtn}
          onPress={() => router.back()}
        >
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.primary, paddingVertical: 16, paddingHorizontal: 16, paddingTop: 50,
  },
  backBtn: { fontSize: 18, color: colors.gold, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: colors.gold },
  label: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6, marginTop: 16 },
  input: {
    backgroundColor: colors.white, borderRadius: 10, padding: 14, fontSize: 15,
    borderWidth: 1, borderColor: colors.grayLight,
  },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: {
    flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 14,
    borderWidth: 2, borderColor: colors.grayLight, alignItems: 'center',
  },
  typeBtnActive: { borderColor: colors.gold, backgroundColor: '#fefce8' },
  typeBtnEmoji: { fontSize: 24, marginBottom: 6 },
  typeBtnLabel: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  typeBtnLabelActive: { color: colors.gold },
  typeBtnDesc: { fontSize: 11, color: colors.grayDark, textAlign: 'center', lineHeight: 15 },
  typeBtnDescActive: { color: colors.primary },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight,
  },
  catPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText: { fontSize: 12, fontWeight: '600', color: colors.grayDark },
  tipCard: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 14, marginTop: 20,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: '#1e40af', marginBottom: 8 },
  tipText: { fontSize: 13, color: '#1e3a8a', lineHeight: 20 },
  saveBtn: {
    backgroundColor: colors.gold, borderRadius: 12, padding: 16,
    alignItems: 'center', marginTop: 24,
  },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  cancelBtn: {
    backgroundColor: colors.offWhite, borderRadius: 12, padding: 14,
    alignItems: 'center', marginTop: 10, borderWidth: 1, borderColor: colors.grayLight,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.grayDark },
});