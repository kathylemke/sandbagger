import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import { supabase } from '../../lib/supabase';

// Types
interface DrillTemplate {
  id: string;
  name: string;
  category: DrillCategory;
  subcategory?: string;
  type: 'evaluation' | 'technique';
  description: string;
  metrics?: string[];
  issue?: string;
  fix?: string;
}

interface PracticeSession {
  id: string;
  date: string;
  duration_minutes: number;
  category: DrillCategory;
  drills: DrillLog[];
  notes?: string;
  focus_area?: string;
}

interface DrillLog {
  drill_id: string;
  drill_name: string;
  type: 'evaluation' | 'technique';
  results?: Record<string, any>;
  notes?: string;
  completed: boolean;
}

type DrillCategory = 'putting' | 'short_game' | 'distance_wedges' | 'full_swing';
type FullSwingSubcategory = 'irons' | 'woods' | 'general';

// Drill Templates Database
const DRILL_TEMPLATES: DrillTemplate[] = [
  // PUTTING - Evaluation
  { id: 'putt_3ft_consecutive', name: '3-Footer Challenge', category: 'putting', type: 'evaluation', 
    description: 'Make consecutive 3-foot putts. Track your streak and time.', 
    metrics: ['consecutive_makes', 'total_attempts', 'time_seconds'] },
  { id: 'putt_6ft_circle', name: '6-Foot Circle Drill', category: 'putting', type: 'evaluation',
    description: 'Place 8 balls around the hole at 6 feet. Track makes out of 8.',
    metrics: ['makes_out_of_8', 'longest_streak'] },
  { id: 'putt_lag_20ft', name: '20ft Lag Putting', category: 'putting', type: 'evaluation',
    description: 'Putt 10 balls from 20 feet. Count how many finish within 3 feet.',
    metrics: ['within_3ft', 'total_putts', 'longest_remaining'] },
  { id: 'putt_gate_drill', name: 'Gate Drill', category: 'putting', type: 'evaluation',
    description: 'Set tees as a gate just wider than ball. Roll through 10 times.',
    metrics: ['through_gate', 'total_attempts'] },
  { id: 'putt_speed_ladder', name: 'Speed Ladder', category: 'putting', type: 'evaluation',
    description: 'Putt to 10, 20, 30ft. Each ball must pass the previous. Track perfect ladders.',
    metrics: ['perfect_ladders', 'total_attempts'] },
  // PUTTING - Technique
  { id: 'putt_eyes_closed', name: 'Eyes Closed Putting', category: 'putting', type: 'technique',
    description: 'Hit putts with eyes closed to feel the stroke.',
    issue: 'Poor feel/tempo', fix: 'Removes visual distractions, builds stroke feel' },
  { id: 'putt_one_hand', name: 'Lead Hand Only', category: 'putting', type: 'technique',
    description: 'Putt with only your lead hand to feel face control.',
    issue: 'Inconsistent face angle', fix: 'Develops lead hand control' },
  { id: 'putt_metronome', name: 'Metronome Tempo', category: 'putting', type: 'technique',
    description: 'Use a metronome app and match backstroke/forward stroke to the beat.',
    issue: 'Rushed or jerky stroke', fix: 'Builds consistent tempo' },
  
  // SHORT GAME - Evaluation
  { id: 'chip_up_down', name: 'Up & Down Challenge', category: 'short_game', type: 'evaluation',
    description: '10 chips from different lies. Track how many get up-and-down (chip + 1 putt).',
    metrics: ['up_and_downs', 'total_attempts', 'inside_6ft'] },
  { id: 'chip_landing_spot', name: 'Landing Spot Drill', category: 'short_game', type: 'evaluation',
    description: 'Place a towel as target. 10 chips to land on towel.',
    metrics: ['on_towel', 'total_attempts'] },
  { id: 'chip_6_in_circle', name: '6 in the Circle', category: 'short_game', type: 'evaluation',
    description: 'Chip until you get 6 balls within a 6-foot circle. Track total attempts.',
    metrics: ['total_attempts_needed', 'best_streak'] },
  { id: 'bunker_sand_save', name: 'Sand Save Percentage', category: 'short_game', type: 'evaluation',
    description: '10 bunker shots. Track sand saves (out + 1 putt or holed).',
    metrics: ['sand_saves', 'total_attempts', 'holed_out'] },
  { id: 'pitch_distance_control', name: 'Pitch Distance Control', category: 'short_game', type: 'evaluation',
    description: 'Hit 10 pitches to 30 yards. Measure dispersion.',
    metrics: ['within_10ft', 'avg_distance_from_target'] },
  // SHORT GAME - Technique
  { id: 'chip_brush_grass', name: 'Brush the Grass', category: 'short_game', type: 'technique',
    description: 'Practice brushing grass with no ball to feel proper contact.',
    issue: 'Fat or thin chips', fix: 'Develops feel for low point' },
  { id: 'chip_logo_down', name: 'Logo Down', category: 'short_game', type: 'technique',
    description: 'Keep glove logo pointing at target through impact.',
    issue: 'Flipping at impact', fix: 'Maintains flat lead wrist' },
  { id: 'bunker_splash', name: 'Splash Drill', category: 'short_game', type: 'technique',
    description: 'Draw a line in sand, splash sand onto a towel. No ball.',
    issue: 'Inconsistent bunker contact', fix: 'Develops feel for sand interaction' },

  // DISTANCE WEDGES - Evaluation
  { id: 'wedge_clock_system', name: 'Clock System Test', category: 'distance_wedges', type: 'evaluation',
    description: 'Hit 9:00, 10:30, full swings with each wedge. Track carry distances.',
    metrics: ['pw_9', 'pw_1030', 'pw_full', 'gw_9', 'gw_1030', 'gw_full', 'sw_9', 'sw_1030', 'sw_full'] },
  { id: 'wedge_50_yard', name: '50-Yard Challenge', category: 'distance_wedges', type: 'evaluation',
    description: '10 shots to 50 yards. Track proximity to pin.',
    metrics: ['within_10ft', 'within_20ft', 'avg_distance'] },
  { id: 'wedge_75_yard', name: '75-Yard Challenge', category: 'distance_wedges', type: 'evaluation',
    description: '10 shots to 75 yards. Track proximity.',
    metrics: ['within_15ft', 'within_30ft', 'avg_distance'] },
  { id: 'wedge_100_yard', name: '100-Yard Challenge', category: 'distance_wedges', type: 'evaluation',
    description: '10 shots to 100 yards. Track proximity.',
    metrics: ['within_20ft', 'within_40ft', 'avg_distance'] },
  // DISTANCE WEDGES - Technique
  { id: 'wedge_tempo', name: 'Slow Motion Swings', category: 'distance_wedges', type: 'technique',
    description: 'Hit wedges at 50% speed focusing on sequence.',
    issue: 'Rushing transition', fix: 'Builds proper sequence feel' },
  { id: 'wedge_feet_together', name: 'Feet Together', category: 'distance_wedges', type: 'technique',
    description: 'Hit wedges with feet touching for balance.',
    issue: 'Swaying/poor balance', fix: 'Centers pivot, improves balance' },

  // FULL SWING - IRONS - Evaluation
  { id: 'iron_dispersion', name: 'Iron Dispersion Test', category: 'full_swing', subcategory: 'irons', type: 'evaluation',
    description: 'Hit 10 balls with your 7-iron. Track left/right miss pattern.',
    metrics: ['total_shots', 'left_misses', 'right_misses', 'on_line', 'avg_carry'] },
  { id: 'iron_stock_vs_knockdown', name: 'Stock vs Knockdown', category: 'full_swing', subcategory: 'irons', type: 'evaluation',
    description: 'Alternate between stock and knockdown shots. Track distance difference.',
    metrics: ['stock_carry', 'knockdown_carry', 'height_difference'] },
  // FULL SWING - IRONS - Technique
  { id: 'iron_alignment_sticks', name: 'Alignment Station', category: 'full_swing', subcategory: 'irons', type: 'technique',
    description: 'Use sticks for feet, ball position, and target line.',
    issue: 'Poor alignment', fix: 'Builds consistent setup' },
  { id: 'iron_impact_bag', name: 'Impact Bag Drill', category: 'full_swing', subcategory: 'irons', type: 'technique',
    description: 'Hit an impact bag focusing on shaft lean and hand position.',
    issue: 'Scooping/flipping', fix: 'Develops proper impact position' },
  { id: 'iron_pump_drill', name: 'Pump Drill', category: 'full_swing', subcategory: 'irons', type: 'technique',
    description: 'Take club to top, pump down halfway twice, then hit.',
    issue: 'Over the top', fix: 'Grooves inside path' },

  // FULL SWING - WOODS - Evaluation
  { id: 'woods_fairway_accuracy', name: 'Fairway Finder', category: 'full_swing', subcategory: 'woods', type: 'evaluation',
    description: '10 drivers/3-woods to a target fairway. Track hits.',
    metrics: ['fairways_hit', 'left_misses', 'right_misses', 'avg_distance'] },
  { id: 'woods_launch_test', name: 'Launch Monitor Test', category: 'full_swing', subcategory: 'woods', type: 'evaluation',
    description: 'Track 5-shot average with driver on launch monitor.',
    metrics: ['ball_speed', 'launch_angle', 'spin_rate', 'carry', 'total'] },
  // FULL SWING - WOODS - Technique
  { id: 'woods_step_drill', name: 'Step Through Drill', category: 'full_swing', subcategory: 'woods', type: 'technique',
    description: 'Start with feet together, step and swing. Builds sequencing.',
    issue: 'Poor weight transfer', fix: 'Develops proper kinetic chain' },
  { id: 'woods_headcover_under_arm', name: 'Headcover Under Arm', category: 'full_swing', subcategory: 'woods', type: 'technique',
    description: 'Place headcover under trail arm, keep it during backswing.',
    issue: 'Flying elbow', fix: 'Keeps arms connected to body' },
  { id: 'woods_tee_height', name: 'Variable Tee Height', category: 'full_swing', subcategory: 'woods', type: 'technique',
    description: 'Hit drivers with tee at different heights to find optimal.',
    issue: 'Inconsistent contact', fix: 'Finds optimal launch conditions' },

  // FULL SWING - GENERAL - Evaluation
  { id: 'general_stock_shot_test', name: 'Stock Shot Assessment', category: 'full_swing', subcategory: 'general', type: 'evaluation',
    description: 'Hit 5 balls each: driver, 5i, 8i, PW. Track tendencies.',
    metrics: ['driver_tendency', 'mid_iron_tendency', 'short_iron_tendency'] },
  // FULL SWING - GENERAL - Technique
  { id: 'general_pause_at_top', name: 'Pause at Top', category: 'full_swing', subcategory: 'general', type: 'technique',
    description: 'Complete backswing, pause 1 second, then swing down.',
    issue: 'Rushing transition', fix: 'Creates space for proper sequence' },
  { id: 'general_slow_motion_video', name: 'Video Analysis', category: 'full_swing', subcategory: 'general', type: 'technique',
    description: 'Record swing in slow-mo, compare to reference positions.',
    issue: 'Unknown swing flaws', fix: 'Visual feedback for self-correction' },
];

const CATEGORIES: { key: DrillCategory; label: string; emoji: string }[] = [
  { key: 'putting', label: 'Putting', emoji: '🎯' },
  { key: 'short_game', label: 'Short Game', emoji: '⛳' },
  { key: 'distance_wedges', label: 'Distance Wedges', emoji: '📐' },
  { key: 'full_swing', label: 'Full Swing', emoji: '🏌️' },
];

const FULL_SWING_SUBS: { key: FullSwingSubcategory; label: string }[] = [
  { key: 'irons', label: 'Irons' },
  { key: 'woods', label: 'Woods' },
  { key: 'general', label: 'General' },
];

export default function Training() {
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<'log' | 'drills' | 'history' | 'rounds'>('log');
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [drillRounds, setDrillRounds] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DrillCategory>('putting');
  const [selectedSubcategory, setSelectedSubcategory] = useState<FullSwingSubcategory>('irons');
  const [drillType, setDrillType] = useState<'evaluation' | 'technique'>('evaluation');
  
  // New session state
  const [isLogging, setIsLogging] = useState(false);
  const [currentSession, setCurrentSession] = useState<Partial<PracticeSession>>({});
  const [sessionDrills, setSessionDrills] = useState<DrillLog[]>([]);
  const [showDrillPicker, setShowDrillPicker] = useState(false);
  const [activeDrill, setActiveDrill] = useState<DrillLog | null>(null);
  const [drillResults, setDrillResults] = useState<Record<string, string>>({});
  const [drillNotes, setDrillNotes] = useState('');

  const SESSIONS_KEY = user?.id ? `sandbagger_training_${user.id}` : 'sandbagger_training';

  useEffect(() => {
    loadSessions();
    loadDrillRounds();
  }, [user]);

  const loadDrillRounds = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('sb_drill_rounds')
        .select('*, sb_drills(name, type, category)')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(50);
      setDrillRounds(data || []);
    } catch (e) {
      console.error('Error loading drill rounds:', e);
    }
  };

  const loadSessions = async () => {
    try {
      const stored = await AsyncStorage.getItem(SESSIONS_KEY);
      if (stored) {
        setSessions(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error loading sessions:', e);
    }
  };

  const saveSessions = async (newSessions: PracticeSession[]) => {
    try {
      await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(newSessions));
      setSessions(newSessions);
    } catch (e) {
      console.error('Error saving sessions:', e);
    }
  };

  const startSession = () => {
    setCurrentSession({
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      duration_minutes: 0,
      category: selectedCategory,
    });
    setSessionDrills([]);
    setIsLogging(true);
  };

  const addDrillToSession = (template: DrillTemplate) => {
    const drillLog: DrillLog = {
      drill_id: template.id,
      drill_name: template.name,
      type: template.type,
      results: {},
      completed: false,
    };
    setSessionDrills([...sessionDrills, drillLog]);
    setShowDrillPicker(false);
  };

  const startDrill = (drill: DrillLog) => {
    setActiveDrill(drill);
    setDrillResults({});
    setDrillNotes('');
  };

  const completeDrill = () => {
    if (!activeDrill) return;
    const updated = sessionDrills.map(d => {
      if (d.drill_id === activeDrill.drill_id && !d.completed) {
        return { ...d, results: drillResults, notes: drillNotes, completed: true };
      }
      return d;
    });
    setSessionDrills(updated);
    setActiveDrill(null);
  };

  const finishSession = () => {
    const notify = (msg: string) => {
      if (Platform.OS === 'web') window.alert(msg);
      else Alert.alert('Saved', msg);
    };

    if (sessionDrills.length === 0) {
      notify('Add at least one drill before finishing.');
      return;
    }

    const session: PracticeSession = {
      id: currentSession.id || Date.now().toString(),
      date: currentSession.date || new Date().toISOString().split('T')[0],
      duration_minutes: currentSession.duration_minutes || 30,
      category: currentSession.category || selectedCategory,
      drills: sessionDrills,
      focus_area: currentSession.focus_area,
      notes: currentSession.notes,
    };

    const newSessions = [session, ...sessions];
    saveSessions(newSessions);
    setIsLogging(false);
    setCurrentSession({});
    setSessionDrills([]);
    notify('Practice session saved!');
  };

  const cancelSession = () => {
    const doCancel = () => {
      setIsLogging(false);
      setCurrentSession({});
      setSessionDrills([]);
    };
    if (Platform.OS === 'web') {
      if (confirm('Discard this session?')) doCancel();
    } else {
      Alert.alert('Discard', 'Discard this session?', [
        { text: 'Keep Going', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: doCancel },
      ]);
    }
  };

  const getFilteredDrills = () => {
    return DRILL_TEMPLATES.filter(d => {
      if (d.category !== selectedCategory) return false;
      if (d.type !== drillType) return false;
      if (selectedCategory === 'full_swing' && d.subcategory !== selectedSubcategory) return false;
      return true;
    });
  };

  const getDrillTemplate = (drillId: string) => DRILL_TEMPLATES.find(d => d.id === drillId);

  // Render drill picker modal
  const renderDrillPicker = () => (
    <Modal visible={showDrillPicker} animationType="slide" transparent>
      <View style={s.modalOverlay}>
        <View style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add Drill</Text>
            <TouchableOpacity onPress={() => setShowDrillPicker(false)}>
              <Text style={s.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {/* Category selector */}
            <View style={s.catRow}>
              {CATEGORIES.map(c => (
                <TouchableOpacity key={c.key} style={[s.catPill, selectedCategory === c.key && s.catPillActive]}
                  onPress={() => setSelectedCategory(c.key)}>
                  <Text style={[s.catPillText, selectedCategory === c.key && s.catPillTextActive]}>{c.emoji} {c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {/* Subcategory for full swing */}
            {selectedCategory === 'full_swing' && (
              <View style={[s.catRow, { marginTop: 8 }]}>
                {FULL_SWING_SUBS.map(sub => (
                  <TouchableOpacity key={sub.key} style={[s.subPill, selectedSubcategory === sub.key && s.subPillActive]}
                    onPress={() => setSelectedSubcategory(sub.key)}>
                    <Text style={[s.subPillText, selectedSubcategory === sub.key && s.subPillTextActive]}>{sub.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {/* Type selector */}
            <View style={[s.catRow, { marginTop: 12 }]}>
              <TouchableOpacity style={[s.typePill, drillType === 'evaluation' && s.typePillActive]}
                onPress={() => setDrillType('evaluation')}>
                <Text style={[s.typePillText, drillType === 'evaluation' && s.typePillTextActive]}>📊 Evaluation</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typePill, drillType === 'technique' && s.typePillActive]}
                onPress={() => setDrillType('technique')}>
                <Text style={[s.typePillText, drillType === 'technique' && s.typePillTextActive]}>🔧 Technique</Text>
              </TouchableOpacity>
            </View>
            {/* Drill list */}
            <View style={{ padding: 16 }}>
              {getFilteredDrills().map(drill => (
                <TouchableOpacity key={drill.id} style={s.drillCard} onPress={() => addDrillToSession(drill)}>
                  <Text style={s.drillName}>{drill.name}</Text>
                  <Text style={s.drillDesc}>{drill.description}</Text>
                  {drill.issue && (
                    <View style={s.drillIssue}>
                      <Text style={s.drillIssueLabel}>Issue:</Text>
                      <Text style={s.drillIssueText}>{drill.issue}</Text>
                    </View>
                  )}
                  {drill.fix && (
                    <View style={s.drillFix}>
                      <Text style={s.drillFixLabel}>Fix:</Text>
                      <Text style={s.drillFixText}>{drill.fix}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
              {getFilteredDrills().length === 0 && (
                <Text style={s.emptyText}>No drills in this category yet</Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // Render active drill input
  const renderActiveDrillModal = () => {
    if (!activeDrill) return null;
    const template = getDrillTemplate(activeDrill.drill_id);
    if (!template) return null;

    return (
      <Modal visible={!!activeDrill} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{template.name}</Text>
            </View>
            <ScrollView style={{ padding: 16 }}>
              <Text style={s.drillDesc}>{template.description}</Text>
              
              {template.type === 'evaluation' && template.metrics && (
                <View style={{ marginTop: 16 }}>
                  <Text style={s.sectionTitle}>Record Results</Text>
                  {template.metrics.map(metric => (
                    <View key={metric} style={s.metricRow}>
                      <Text style={s.metricLabel}>{metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</Text>
                      <TextInput
                        style={s.metricInput}
                        value={drillResults[metric] || ''}
                        onChangeText={v => setDrillResults({ ...drillResults, [metric]: v })}
                        keyboardType="number-pad"
                        placeholder="0"
                        placeholderTextColor={colors.gray}
                      />
                    </View>
                  ))}
                </View>
              )}

              {template.type === 'technique' && (
                <View style={{ marginTop: 16 }}>
                  {template.issue && (
                    <View style={s.techniqueCard}>
                      <Text style={s.techniqueLabel}>🔴 Issue Addressed</Text>
                      <Text style={s.techniqueText}>{template.issue}</Text>
                    </View>
                  )}
                  {template.fix && (
                    <View style={[s.techniqueCard, { backgroundColor: '#dcfce7' }]}>
                      <Text style={[s.techniqueLabel, { color: '#166534' }]}>✅ The Fix</Text>
                      <Text style={s.techniqueText}>{template.fix}</Text>
                    </View>
                  )}
                </View>
              )}

              <Text style={[s.sectionTitle, { marginTop: 16 }]}>Notes</Text>
              <TextInput
                style={[s.notesInput]}
                value={drillNotes}
                onChangeText={setDrillNotes}
                placeholder="How did it go? What did you notice?"
                placeholderTextColor={colors.gray}
                multiline
              />
            </ScrollView>
            <View style={s.modalFooter}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setActiveDrill(null)}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={completeDrill}>
                <Text style={s.saveBtnText}>Complete Drill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // Active logging view
  if (isLogging) {
    return (
      <View style={s.container}>
        <View style={s.sessionHeader}>
          <Text style={s.sessionTitle}>Practice Session</Text>
          <Text style={s.sessionDate}>{currentSession.date}</Text>
        </View>
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <Text style={s.label}>Focus Area</Text>
          <TextInput
            style={s.input}
            value={currentSession.focus_area || ''}
            onChangeText={v => setCurrentSession({ ...currentSession, focus_area: v })}
            placeholder="e.g., Putting speed control"
            placeholderTextColor={colors.gray}
          />

          <Text style={s.label}>Duration (minutes)</Text>
          <TextInput
            style={s.input}
            value={currentSession.duration_minutes?.toString() || ''}
            onChangeText={v => setCurrentSession({ ...currentSession, duration_minutes: parseInt(v) || 0 })}
            keyboardType="number-pad"
            placeholder="30"
            placeholderTextColor={colors.gray}
          />

          <View style={s.drillsHeader}>
            <Text style={s.sectionTitle}>Drills ({sessionDrills.length})</Text>
            <TouchableOpacity style={s.addDrillBtn} onPress={() => setShowDrillPicker(true)}>
              <Text style={s.addDrillBtnText}>+ Add Drill</Text>
            </TouchableOpacity>
          </View>

          {sessionDrills.length === 0 ? (
            <View style={s.emptyDrills}>
              <Text style={s.emptyDrillsText}>No drills added yet</Text>
              <Text style={s.emptyDrillsSub}>Tap "Add Drill" to get started</Text>
            </View>
          ) : (
            sessionDrills.map((drill, idx) => (
              <TouchableOpacity key={`${drill.drill_id}-${idx}`} style={[s.sessionDrillCard, drill.completed && s.sessionDrillCardDone]}
                onPress={() => !drill.completed && startDrill(drill)}>
                <View style={s.sessionDrillHeader}>
                  <Text style={s.sessionDrillName}>{drill.drill_name}</Text>
                  {drill.completed && <Text style={s.checkMark}>✓</Text>}
                </View>
                {drill.completed && drill.results && Object.keys(drill.results).length > 0 && (
                  <View style={s.resultsRow}>
                    {Object.entries(drill.results).map(([k, v]) => (
                      <View key={k} style={s.resultPill}>
                        <Text style={s.resultLabel}>{k.replace(/_/g, ' ')}</Text>
                        <Text style={s.resultValue}>{v}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {!drill.completed && (
                  <Text style={s.tapToStart}>Tap to record</Text>
                )}
              </TouchableOpacity>
            ))
          )}

          <Text style={[s.label, { marginTop: 16 }]}>Session Notes</Text>
          <TextInput
            style={[s.input, { minHeight: 80 }]}
            value={currentSession.notes || ''}
            onChangeText={v => setCurrentSession({ ...currentSession, notes: v })}
            placeholder="Overall thoughts, progress, what to work on next..."
            placeholderTextColor={colors.gray}
            multiline
          />
        </ScrollView>

        <View style={s.sessionFooter}>
          <TouchableOpacity style={s.cancelSessionBtn} onPress={cancelSession}>
            <Text style={s.cancelSessionBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.finishSessionBtn} onPress={finishSession}>
            <Text style={s.finishSessionBtnText}>Finish Session</Text>
          </TouchableOpacity>
        </View>

        {renderDrillPicker()}
        {renderActiveDrillModal()}
      </View>
    );
  }

  // History view
  const renderHistory = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {sessions.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyIcon}>📋</Text>
          <Text style={s.emptyTitle}>No Practice Sessions</Text>
          <Text style={s.emptySub}>Log a practice session to track your improvement</Text>
        </View>
      ) : (
        sessions.map(session => {
          const catInfo = CATEGORIES.find(c => c.key === session.category);
          const completedDrills = session.drills.filter(d => d.completed).length;
          return (
            <View key={session.id} style={s.historyCard}>
              <View style={s.historyHeader}>
                <View>
                  <Text style={s.historyDate}>{new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  {session.focus_area && <Text style={s.historyFocus}>{session.focus_area}</Text>}
                </View>
                <View style={s.historyBadge}>
                  <Text style={s.historyBadgeText}>{catInfo?.emoji} {catInfo?.label}</Text>
                </View>
              </View>
              <View style={s.historyStats}>
                <View style={s.historyStat}>
                  <Text style={s.historyStatNum}>{session.duration_minutes}</Text>
                  <Text style={s.historyStatLabel}>minutes</Text>
                </View>
                <View style={s.historyStat}>
                  <Text style={s.historyStatNum}>{completedDrills}/{session.drills.length}</Text>
                  <Text style={s.historyStatLabel}>drills</Text>
                </View>
              </View>
              {session.drills.filter(d => d.completed && d.results && Object.keys(d.results).length > 0).slice(0, 2).map((drill, idx) => (
                <View key={idx} style={s.historyDrill}>
                  <Text style={s.historyDrillName}>{drill.drill_name}</Text>
                  <View style={s.historyResults}>
                    {Object.entries(drill.results || {}).slice(0, 3).map(([k, v]) => (
                      <Text key={k} style={s.historyResult}>{k.replace(/_/g, ' ')}: {v}</Text>
                    ))}
                  </View>
                </View>
              ))}
              {session.notes && (
                <Text style={s.historyNotes}>"{session.notes}"</Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );

  // Drill library view
  const renderDrillLibrary = () => (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Category selector */}
      <View style={s.catRow}>
        {CATEGORIES.map(c => (
          <TouchableOpacity key={c.key} style={[s.catPill, selectedCategory === c.key && s.catPillActive]}
            onPress={() => setSelectedCategory(c.key)}>
            <Text style={[s.catPillText, selectedCategory === c.key && s.catPillTextActive]}>{c.emoji}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={s.catTitle}>{CATEGORIES.find(c => c.key === selectedCategory)?.label} Drills</Text>

      {/* Subcategory for full swing */}
      {selectedCategory === 'full_swing' && (
        <View style={[s.catRow, { marginBottom: 12 }]}>
          {FULL_SWING_SUBS.map(sub => (
            <TouchableOpacity key={sub.key} style={[s.subPill, selectedSubcategory === sub.key && s.subPillActive]}
              onPress={() => setSelectedSubcategory(sub.key)}>
              <Text style={[s.subPillText, selectedSubcategory === sub.key && s.subPillTextActive]}>{sub.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Type selector */}
      <View style={s.catRow}>
        <TouchableOpacity style={[s.typePill, drillType === 'evaluation' && s.typePillActive]}
          onPress={() => setDrillType('evaluation')}>
          <Text style={[s.typePillText, drillType === 'evaluation' && s.typePillTextActive]}>📊 Evaluation</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.typePill, drillType === 'technique' && s.typePillActive]}
          onPress={() => setDrillType('technique')}>
          <Text style={[s.typePillText, drillType === 'technique' && s.typePillTextActive]}>🔧 Technique</Text>
        </TouchableOpacity>
      </View>

      {/* Drill list */}
      {getFilteredDrills().map(drill => (
        <View key={drill.id} style={s.drillCard}>
          <Text style={s.drillName}>{drill.name}</Text>
          <Text style={s.drillDesc}>{drill.description}</Text>
          {drill.metrics && (
            <View style={s.metricsPreview}>
              {drill.metrics.slice(0, 3).map(m => (
                <View key={m} style={s.metricTag}>
                  <Text style={s.metricTagText}>{m.replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          )}
          {drill.issue && (
            <View style={s.drillIssue}>
              <Text style={s.drillIssueLabel}>Issue:</Text>
              <Text style={s.drillIssueText}>{drill.issue}</Text>
            </View>
          )}
          {drill.fix && (
            <View style={s.drillFix}>
              <Text style={s.drillFixLabel}>Fix:</Text>
              <Text style={s.drillFixText}>{drill.fix}</Text>
            </View>
          )}
        </View>
      ))}
      {getFilteredDrills().length === 0 && (
        <Text style={s.emptyText}>No drills in this category yet</Text>
      )}
    </ScrollView>
  );

  // Main view with tabs
  return (
    <View style={s.container}>
      {/* Tab bar */}
      <View style={s.tabBar}>
        <TouchableOpacity style={[s.tab, tab === 'log' && s.tabActive]} onPress={() => setTab('log')}>
          <Text style={[s.tabText, tab === 'log' && s.tabTextActive]}>Practice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'drills' && s.tabActive]} onPress={() => setTab('drills')}>
          <Text style={[s.tabText, tab === 'drills' && s.tabTextActive]}>Drills</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'history' && s.tabActive]} onPress={() => setTab('history')}>
          <Text style={[s.tabText, tab === 'history' && s.tabTextActive]}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'rounds' && s.tabActive]} onPress={() => setTab('rounds')}>
          <Text style={[s.tabText, tab === 'rounds' && s.tabTextActive]}>Drill Rounds</Text>
        </TouchableOpacity>
      </View>

      {/* Tab content */}
      {tab === 'log' && (
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <View style={s.startCard}>
              <Text style={s.startTitle}>🎯 Practice Session</Text>
              <Text style={s.startDesc}>Log drills, track progress, and improve your game</Text>
              <TouchableOpacity style={s.startBtn} onPress={startSession}>
                <Text style={s.startBtnText}>Start Practice</Text>
              </TouchableOpacity>
            </View>

            {/* Quick stats */}
            {sessions.length > 0 && (
              <View style={s.quickStats}>
                <Text style={s.quickStatsTitle}>This Week</Text>
                <View style={s.quickStatsRow}>
                  <View style={s.quickStat}>
                    <Text style={s.quickStatNum}>
                      {sessions.filter(s => {
                        const d = new Date(s.date);
                        const now = new Date();
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return d >= weekAgo;
                      }).length}
                    </Text>
                    <Text style={s.quickStatLabel}>Sessions</Text>
                  </View>
                  <View style={s.quickStat}>
                    <Text style={s.quickStatNum}>
                      {sessions.filter(s => {
                        const d = new Date(s.date);
                        const now = new Date();
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return d >= weekAgo;
                      }).reduce((sum, s) => sum + s.duration_minutes, 0)}
                    </Text>
                    <Text style={s.quickStatLabel}>Minutes</Text>
                  </View>
                  <View style={s.quickStat}>
                    <Text style={s.quickStatNum}>
                      {sessions.filter(s => {
                        const d = new Date(s.date);
                        const now = new Date();
                        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        return d >= weekAgo;
                      }).reduce((sum, s) => sum + s.drills.filter(d => d.completed).length, 0)}
                    </Text>
                    <Text style={s.quickStatLabel}>Drills</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Recent sessions preview */}
            {sessions.slice(0, 3).map(session => {
              const catInfo = CATEGORIES.find(c => c.key === session.category);
              return (
                <View key={session.id} style={s.recentCard}>
                  <View style={s.recentHeader}>
                    <Text style={s.recentDate}>
                      {new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </Text>
                    <Text style={s.recentCat}>{catInfo?.emoji} {catInfo?.label}</Text>
                    <Text style={s.recentDuration}>{session.duration_minutes}m</Text>
                  </View>
                  {session.focus_area && <Text style={s.recentFocus}>{session.focus_area}</Text>}
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {tab === 'drills' && renderDrillLibrary()}
      {tab === 'history' && renderHistory()}
      {tab === 'rounds' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>🎯 My Drill Rounds</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/build-drill')}>
              <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 14 }}>+ New Drill</Text>
            </TouchableOpacity>
          </View>
          {drillRounds.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>⛳</Text>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.primary }}>No Drill Rounds Yet</Text>
              <Text style={{ fontSize: 14, color: colors.gray, marginTop: 6, textAlign: 'center' }}>
                Start a round in the Log tab and select a drill to see it here
              </Text>
            </View>
          ) : (
            drillRounds.map(dr => {
              const drillInfo = dr.sb_drills;
              const isScore = drillInfo?.type === 'score-based';
              return (
                <View key={dr.id} style={{ backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.primary }}>{drillInfo?.name || 'Unknown Drill'}</Text>
                      <Text style={{ fontSize: 12, color: colors.gray, marginTop: 2 }}>
                        {new Date(dr.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
                      {isScore ? (
                        <Text style={{ fontSize: 18, fontWeight: '800', color: colors.gold }}>{dr.total_score ?? '—'}</Text>
                      ) : (
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>Shot Log</Text>
                      )}
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    <View style={{ backgroundColor: colors.offWhite, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>
                        {drillInfo?.type === 'score-based' ? '🎯 Score' : '📝 Shot-Log'}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: colors.offWhite, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '600' }}>{drillInfo?.category || 'general'}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  tabBar: { flexDirection: 'row', backgroundColor: colors.primary, paddingTop: 8 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.gold },
  tabText: { fontSize: 15, fontWeight: '600', color: colors.white, opacity: 0.7 },
  tabTextActive: { opacity: 1, color: colors.gold },
  
  // Start card
  startCard: { backgroundColor: colors.primary, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 20 },
  startTitle: { fontSize: 22, fontWeight: '800', color: colors.gold, marginBottom: 8 },
  startDesc: { fontSize: 14, color: colors.white, opacity: 0.8, textAlign: 'center', marginBottom: 16 },
  startBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  startBtnText: { fontSize: 16, fontWeight: '800', color: colors.primary },
  
  // Quick stats
  quickStats: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 16 },
  quickStatsTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  quickStatsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  quickStat: { alignItems: 'center' },
  quickStatNum: { fontSize: 28, fontWeight: '800', color: colors.gold },
  quickStatLabel: { fontSize: 12, color: colors.grayDark },
  
  // Recent cards
  recentCard: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8 },
  recentHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  recentDate: { fontSize: 14, fontWeight: '700', color: colors.primary },
  recentCat: { fontSize: 13, color: colors.grayDark },
  recentDuration: { marginLeft: 'auto', fontSize: 13, fontWeight: '600', color: colors.gold },
  recentFocus: { fontSize: 13, color: colors.grayDark, marginTop: 4 },
  
  // Category pills
  catRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  catPill: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight },
  catPillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catPillText: { fontSize: 13, fontWeight: '600', color: colors.grayDark },
  catPillTextActive: { color: colors.gold },
  catTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 12 },
  
  subPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.offWhite, borderWidth: 1, borderColor: colors.grayLight },
  subPillActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  subPillText: { fontSize: 12, fontWeight: '600', color: colors.grayDark },
  subPillTextActive: { color: colors.primary },
  
  typePill: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight, alignItems: 'center' },
  typePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  typePillText: { fontSize: 13, fontWeight: '600', color: colors.grayDark },
  typePillTextActive: { color: colors.gold },
  
  // Drill cards
  drillCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.grayLight },
  drillName: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  drillDesc: { fontSize: 14, color: colors.grayDark, lineHeight: 20 },
  drillIssue: { flexDirection: 'row', marginTop: 10, backgroundColor: '#fef2f2', padding: 8, borderRadius: 6 },
  drillIssueLabel: { fontSize: 12, fontWeight: '700', color: '#dc2626', marginRight: 4 },
  drillIssueText: { fontSize: 12, color: '#7f1d1d', flex: 1 },
  drillFix: { flexDirection: 'row', marginTop: 6, backgroundColor: '#f0fdf4', padding: 8, borderRadius: 6 },
  drillFixLabel: { fontSize: 12, fontWeight: '700', color: '#16a34a', marginRight: 4 },
  drillFixText: { fontSize: 12, color: '#166534', flex: 1 },
  metricsPreview: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  metricTag: { backgroundColor: colors.offWhite, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  metricTagText: { fontSize: 11, color: colors.grayDark, textTransform: 'capitalize' },
  
  emptyText: { textAlign: 'center', color: colors.gray, marginTop: 40 },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  modalTitle: { fontSize: 20, fontWeight: '800', color: colors.primary },
  modalClose: { fontSize: 24, color: colors.gray, padding: 4 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.grayLight },
  
  // Session logging
  sessionHeader: { backgroundColor: colors.primary, padding: 16 },
  sessionTitle: { fontSize: 20, fontWeight: '800', color: colors.gold },
  sessionDate: { fontSize: 14, color: colors.white, opacity: 0.8, marginTop: 4 },
  label: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.white, borderRadius: 10, padding: 14, fontSize: 15, borderWidth: 1, borderColor: colors.grayLight },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  drillsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 },
  addDrillBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  addDrillBtnText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  emptyDrills: { backgroundColor: colors.offWhite, borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyDrillsText: { fontSize: 15, fontWeight: '600', color: colors.grayDark },
  emptyDrillsSub: { fontSize: 13, color: colors.gray, marginTop: 4 },
  sessionDrillCard: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.grayLight },
  sessionDrillCardDone: { borderColor: colors.gold, backgroundColor: '#fefce8' },
  sessionDrillHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sessionDrillName: { fontSize: 15, fontWeight: '600', color: colors.primary },
  checkMark: { fontSize: 18, color: '#16a34a', fontWeight: '700' },
  tapToStart: { fontSize: 12, color: colors.gold, marginTop: 6 },
  resultsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  resultPill: { backgroundColor: colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  resultLabel: { fontSize: 10, color: colors.white, opacity: 0.8, textTransform: 'capitalize' },
  resultValue: { fontSize: 14, fontWeight: '700', color: colors.gold },
  sessionFooter: { flexDirection: 'row', gap: 12, padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.grayLight },
  cancelSessionBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.offWhite, alignItems: 'center' },
  cancelSessionBtnText: { fontSize: 15, fontWeight: '700', color: colors.grayDark },
  finishSessionBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center' },
  finishSessionBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  
  // Active drill modal
  metricRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  metricLabel: { fontSize: 14, color: colors.primary, flex: 1, textTransform: 'capitalize' },
  metricInput: { width: 80, backgroundColor: colors.offWhite, borderRadius: 8, padding: 10, fontSize: 16, fontWeight: '700', textAlign: 'center', borderWidth: 1, borderColor: colors.grayLight },
  techniqueCard: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 12, marginBottom: 10 },
  techniqueLabel: { fontSize: 12, fontWeight: '700', color: '#dc2626', marginBottom: 4 },
  techniqueText: { fontSize: 14, color: colors.black },
  notesInput: { backgroundColor: colors.offWhite, borderRadius: 10, padding: 14, fontSize: 15, minHeight: 80, borderWidth: 1, borderColor: colors.grayLight },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.offWhite, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: colors.grayDark },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.gold },
  
  // History
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  emptySub: { fontSize: 14, color: colors.gray, marginTop: 4 },
  historyCard: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12 },
  historyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  historyDate: { fontSize: 16, fontWeight: '700', color: colors.primary },
  historyFocus: { fontSize: 13, color: colors.grayDark, marginTop: 2 },
  historyBadge: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  historyBadgeText: { fontSize: 12, fontWeight: '600', color: colors.gold },
  historyStats: { flexDirection: 'row', gap: 20, marginBottom: 12 },
  historyStat: { alignItems: 'center' },
  historyStatNum: { fontSize: 20, fontWeight: '800', color: colors.gold },
  historyStatLabel: { fontSize: 11, color: colors.grayDark },
  historyDrill: { backgroundColor: colors.offWhite, borderRadius: 8, padding: 10, marginBottom: 8 },
  historyDrillName: { fontSize: 13, fontWeight: '600', color: colors.primary },
  historyResults: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  historyResult: { fontSize: 12, color: colors.grayDark },
  historyNotes: { fontSize: 13, color: colors.grayDark, fontStyle: 'italic', marginTop: 8 },
});
