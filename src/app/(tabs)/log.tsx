import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, teeColors } from '../../lib/theme';

type TrackingMode = 'basic' | 'advanced' | 'strategy' | 'mental';

interface Course { id: string; name: string; city: string; state: string; num_holes: number; }
interface Hole { id: string; hole_number: number; par: number; distance_yards: number; }
interface TeeSet { id: string; course_id: string; color: string; name: string; total_yardage: number; total_par: number; rating: number; slope: number; }
interface TeeHole { id: string; tee_set_id: string; hole_number: number; yardage: number; par: number; handicap_index: number; }

interface AdvancedData {
  target: string;
  shot_shape: string;
  distance_to_target: string;
  playing_distance: string;
  club: string;
  result_lie: string;
  shot_result: string;
}

interface StrategyData {
  lie_type: string;
  distance: string;
  intention: string;
  executed: string;
  notes: string;
}

interface MentalData {
  pre_feeling: string;
  difficulty_rating: number;
  emotions_influenced: string;
  commitment_level: number;
  executed_plan: string;
  post_reaction: string;
  reaction_matched: string;
}

interface HoleEntry {
  score: number;
  putts: number;
  fairway_hit: boolean | null;
  gir: boolean;
  penalties: number;
  tee_set_id?: string;
  custom_yardage?: number;
  advanced?: AdvancedData;
  strategy?: StrategyData;
  mental?: MentalData;
}

const defaultAdvanced = (): AdvancedData => ({ target: '', shot_shape: '', distance_to_target: '', playing_distance: '', club: '', result_lie: '', shot_result: '' });
const defaultStrategy = (): StrategyData => ({ lie_type: '', distance: '', intention: '', executed: '', notes: '' });
const defaultMental = (): MentalData => ({ pre_feeling: '', difficulty_rating: 3, emotions_influenced: '', commitment_level: 3, executed_plan: '', post_reaction: '', reaction_matched: '' });

const SHOT_SHAPES = ['Straight', 'Draw', 'Fade', 'Punch', 'Flop', 'Knockdown', 'High', 'Low'];
const CLUBS = ['Driver', '3W', '5W', '7W', '2H', '3H', '4H', '5H', '3i', '4i', '5i', '6i', '7i', '8i', '9i', 'PW', 'GW', 'SW', 'LW', 'Putter'];
const RESULT_LIES = ['Fairway', 'Rough', 'Green', 'Bunker', 'Water', 'OB', 'Fringe', 'Trees', 'Cart Path'];
const SHOT_RESULTS = ['Pure', 'Push', 'Pull', 'Thin', 'Fat', 'Topped', 'Shank', 'Sky', 'Hook', 'Slice', 'OK'];
const LIE_TYPES = ['Tee', 'Fairway', 'Rough', 'Bunker', 'Green', 'Fringe', 'Trees'];
const FEELINGS = ['Confident', 'Nervous', 'Frustrated', 'Neutral', 'Excited', 'Anxious', 'Calm'];
const REACTIONS = ['Positive', 'Negative', 'Neutral'];
const EXECUTE_OPTIONS = ['Yes', 'No', 'Partial'];

const TRACKING_MODES: { key: TrackingMode; label: string; emoji: string; desc: string }[] = [
  { key: 'basic', label: 'Basic', emoji: '⛳', desc: 'Score, putts, fairways & GIR' },
  { key: 'advanced', label: 'Advanced', emoji: '🎯', desc: 'Full shot data — club, shape, result' },
  { key: 'strategy', label: 'Strategy', emoji: '🧠', desc: 'Intention & execution tracking' },
  { key: 'mental', label: 'Mental Game', emoji: '🧘', desc: 'Psychology & emotional awareness' },
];

export default function LogRound() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [selectedTee, setSelectedTee] = useState<TeeSet | null>(null);
  const [teeHolesData, setTeeHolesData] = useState<TeeHole[]>([]);
  const [mixedTees, setMixedTees] = useState(false);
  const [datePlayed, setDatePlayed] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('');
  const [wind, setWind] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('basic');
  const [holeEntries, setHoleEntries] = useState<HoleEntry[]>([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCity, setNewCourseCity] = useState('');
  const [newCourseState, setNewCourseState] = useState('');
  const [newCourseHoles, setNewCourseHoles] = useState('18');
  const [newHolePars, setNewHolePars] = useState<number[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('sb_courses').select('*').order('name').then(({ data }) => setCourses(data || []));
  }, []);

  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const initHoleEntries = (numH: number) => {
    return Array(numH).fill(null).map(() => ({
      score: 0, putts: 0, fairway_hit: null as boolean | null, gir: false, penalties: 0,
      advanced: defaultAdvanced(), strategy: defaultStrategy(), mental: defaultMental(),
    }));
  };

  const selectCourse = async (course: Course) => {
    setSelectedCourse(course);
    const [holesRes, teesRes] = await Promise.all([
      supabase.from('sb_holes').select('*').eq('course_id', course.id).order('hole_number'),
      supabase.from('sb_tee_sets').select('*').eq('course_id', course.id).order('total_yardage', { ascending: false }),
    ]);
    setHoles(holesRes.data || []);
    setTeeSets(teesRes.data || []);
    const numH = holesRes.data?.length || course.num_holes || 18;
    setHoleEntries(initHoleEntries(numH));
    setSelectedTee(null);
    setMixedTees(false);
    if ((teesRes.data || []).length > 0) {
      setStep(2);
    } else {
      setStep(3);
    }
  };

  const selectTee = async (tee: TeeSet) => {
    setSelectedTee(tee);
    setMixedTees(false);
    const { data } = await supabase.from('sb_tee_holes').select('*').eq('tee_set_id', tee.id).order('hole_number');
    setTeeHolesData(data || []);
    setStep(3);
  };

  const selectMixedTees = () => {
    setMixedTees(true);
    setSelectedTee(null);
    if (teeSets.length > 0) {
      const longest = teeSets[0];
      setHoleEntries(prev => prev.map(e => ({ ...e, tee_set_id: longest.id })));
    }
    setStep(3);
  };

  const createCourse = async () => {
    if (!newCourseName) { Alert.alert('Error', 'Course name required'); return; }
    const numH = parseInt(newCourseHoles) || 18;
    const { data: course, error } = await supabase.from('sb_courses').insert({
      name: newCourseName, city: newCourseCity, state: newCourseState, num_holes: numH, created_by: user?.id
    }).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    const pars = newHolePars.length === numH ? newHolePars : Array(numH).fill(4);
    const holeInserts = pars.map((par, i) => ({ course_id: course.id, hole_number: i + 1, par }));
    await supabase.from('sb_holes').insert(holeInserts);
    setCourses(prev => [...prev, course]);
    await selectCourse(course);
    setShowNewCourse(false);
  };

  const updateHoleEntry = (idx: number, field: keyof HoleEntry, value: any) => {
    setHoleEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const updateAdvanced = (idx: number, field: keyof AdvancedData, value: string) => {
    setHoleEntries(prev => prev.map((e, i) => i === idx ? { ...e, advanced: { ...(e.advanced || defaultAdvanced()), [field]: value } } : e));
  };

  const updateStrategy = (idx: number, field: keyof StrategyData, value: string) => {
    setHoleEntries(prev => prev.map((e, i) => i === idx ? { ...e, strategy: { ...(e.strategy || defaultStrategy()), [field]: value } } : e));
  };

  const updateMental = (idx: number, field: keyof MentalData, value: any) => {
    setHoleEntries(prev => prev.map((e, i) => i === idx ? { ...e, mental: { ...(e.mental || defaultMental()), [field]: value } } : e));
  };

  const totalScore = holeEntries.reduce((s, e) => s + (e.score || 0), 0);
  const totalPutts = holeEntries.reduce((s, e) => s + (e.putts || 0), 0);

  const saveRound = async () => {
    if (!user || !selectedCourse) return;
    setSaving(true);
    try {
      const { data: round, error } = await supabase.from('sb_rounds').insert({
        user_id: user.id, course_id: selectedCourse.id, date_played: datePlayed,
        total_score: totalScore, weather, wind, is_complete: true, visibility,
        tee_set_id: selectedTee?.id || null,
        mixed_tees: mixedTees,
        notes: JSON.stringify({ tracking_mode: trackingMode }),
      }).select().single();
      if (error) throw error;

      const scoreInserts = holeEntries.map((e, i) => {
        const base: any = {
          round_id: round.id, hole_id: holes[i]?.id || null, hole_number: i + 1,
          score: e.score, putts: e.putts, fairway_hit: e.fairway_hit, gir: e.gir, penalties: e.penalties,
        };
        // Store mode-specific data as JSON in notes column
        if (trackingMode === 'advanced' && e.advanced) {
          base.notes = JSON.stringify({ mode: 'advanced', data: e.advanced });
        } else if (trackingMode === 'strategy' && e.strategy) {
          base.notes = JSON.stringify({ mode: 'strategy', data: e.strategy });
        } else if (trackingMode === 'mental' && e.mental) {
          base.notes = JSON.stringify({ mode: 'mental', data: e.mental });
        }
        return base;
      });
      await supabase.from('sb_hole_scores').insert(scoreInserts);
      Alert.alert('Success', `Round saved! Total: ${totalScore}`);
      setStep(1); setSelectedCourse(null); setHoles([]); setHoleEntries([]); setSelectedTee(null); setMixedTees(false);
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const renderTeeCard = (tee: TeeSet) => {
    const dotColor = teeColors[tee.color] || teeColors[tee.name] || colors.gray;
    const isWhite = tee.color === 'White' || tee.name === 'White';
    return (
      <TouchableOpacity key={tee.id} style={s.teeCard} onPress={() => selectTee(tee)}>
        <View style={[s.teeDot, { backgroundColor: dotColor }, isWhite && { borderWidth: 2, borderColor: colors.grayLight }]} />
        <View style={{ flex: 1 }}>
          <Text style={s.teeName}>{tee.name || tee.color}</Text>
          <Text style={s.teeSub}>
            {(tee.total_yardage || 0).toLocaleString()} yds | Par {tee.total_par} | {tee.rating}/{tee.slope}
          </Text>
        </View>
        <Text style={{ color: colors.gray }}>›</Text>
      </TouchableOpacity>
    );
  };

  // Pill selector helper
  const PillRow = ({ options, value, onChange, wrap }: { options: string[]; value: string; onChange: (v: string) => void; wrap?: boolean }) => (
    <View style={[s.pillRow, wrap && { flexWrap: 'wrap' }]}>
      {options.map(opt => (
        <TouchableOpacity key={opt} style={[s.pill, value === opt && s.pillActive]} onPress={() => onChange(value === opt ? '' : opt)}>
          <Text style={[s.pillText, value === opt && s.pillTextActive]}>{opt}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Scale selector (1-5)
  const ScaleRow = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
    <View style={s.scaleRow}>
      {[1, 2, 3, 4, 5].map(n => (
        <TouchableOpacity key={n} style={[s.scaleBtn, value === n && s.scaleBtnActive]} onPress={() => onChange(n)}>
          <Text style={[s.scaleBtnText, value === n && s.scaleBtnTextActive]}>{n}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Expandable section
  const Section = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => {
    const isOpen = expandedSection === id;
    return (
      <View style={s.section}>
        <TouchableOpacity style={s.sectionHeader} onPress={() => setExpandedSection(isOpen ? null : id)}>
          <Text style={s.sectionTitle}>{title}</Text>
          <Text style={s.sectionArrow}>{isOpen ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {isOpen && <View style={s.sectionBody}>{children}</View>}
      </View>
    );
  };

  // Advanced mode fields
  const renderAdvancedFields = (idx: number) => {
    const adv = holeEntries[idx]?.advanced || defaultAdvanced();
    return (
      <Section title="🎯 Advanced Shot Data" id="advanced">
        <Text style={s.formLabel}>Target</Text>
        <TextInput style={s.input} value={adv.target} onChangeText={v => updateAdvanced(idx, 'target', v)} placeholder="Center of fairway, pin, etc." placeholderTextColor={colors.gray} />

        <Text style={s.formLabel}>Shot Shape Intention</Text>
        <PillRow options={SHOT_SHAPES} value={adv.shot_shape} onChange={v => updateAdvanced(idx, 'shot_shape', v)} wrap />

        <Text style={s.formLabel}>Distance to Target (yds)</Text>
        <TextInput style={s.input} value={adv.distance_to_target} onChangeText={v => updateAdvanced(idx, 'distance_to_target', v)} keyboardType="number-pad" placeholder="150" placeholderTextColor={colors.gray} />

        <Text style={s.formLabel}>Playing Distance (adjusted)</Text>
        <TextInput style={s.input} value={adv.playing_distance} onChangeText={v => updateAdvanced(idx, 'playing_distance', v)} keyboardType="number-pad" placeholder="155" placeholderTextColor={colors.gray} />

        <Text style={s.formLabel}>Club</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <PillRow options={CLUBS} value={adv.club} onChange={v => updateAdvanced(idx, 'club', v)} />
        </ScrollView>

        <Text style={s.formLabel}>Result Lie</Text>
        <PillRow options={RESULT_LIES} value={adv.result_lie} onChange={v => updateAdvanced(idx, 'result_lie', v)} wrap />

        <Text style={s.formLabel}>Shot Result</Text>
        <PillRow options={SHOT_RESULTS} value={adv.shot_result} onChange={v => updateAdvanced(idx, 'shot_result', v)} wrap />
      </Section>
    );
  };

  // Strategy mode fields
  const renderStrategyFields = (idx: number) => {
    const strat = holeEntries[idx]?.strategy || defaultStrategy();
    return (
      <Section title="🧠 Strategy" id="strategy">
        <Text style={s.formLabel}>Where Were You</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <PillRow options={LIE_TYPES} value={strat.lie_type} onChange={v => updateStrategy(idx, 'lie_type', v)} wrap />
          </View>
          <TextInput style={[s.input, { width: 80 }]} value={strat.distance} onChangeText={v => updateStrategy(idx, 'distance', v)} keyboardType="number-pad" placeholder="yds" placeholderTextColor={colors.gray} />
        </View>

        <Text style={s.formLabel}>Intention / Plan</Text>
        <TextInput style={[s.input, { minHeight: 60 }]} value={strat.intention} onChangeText={v => updateStrategy(idx, 'intention', v)} placeholder="What were you trying to do?" placeholderTextColor={colors.gray} multiline />

        <Text style={s.formLabel}>Did You Execute?</Text>
        <PillRow options={EXECUTE_OPTIONS} value={strat.executed} onChange={v => updateStrategy(idx, 'executed', v)} />

        <Text style={s.formLabel}>Notes (optional)</Text>
        <TextInput style={s.input} value={strat.notes} onChangeText={v => updateStrategy(idx, 'notes', v)} placeholder="Any observations..." placeholderTextColor={colors.gray} multiline />
      </Section>
    );
  };

  // Mental game mode fields
  const renderMentalFields = (idx: number) => {
    const m = holeEntries[idx]?.mental || defaultMental();
    return (
      <>
        <Section title="🧘 Pre-Shot" id="mental-pre">
          <Text style={s.formLabel}>How did you feel?</Text>
          <PillRow options={FEELINGS} value={m.pre_feeling} onChange={v => updateMental(idx, 'pre_feeling', v)} wrap />

          <Text style={s.formLabel}>Perceived Difficulty (1-5)</Text>
          <ScaleRow value={m.difficulty_rating} onChange={v => updateMental(idx, 'difficulty_rating', v)} />

          <Text style={s.formLabel}>Did emotions influence your decision?</Text>
          <PillRow options={['Yes', 'No', 'Somewhat']} value={m.emotions_influenced} onChange={v => updateMental(idx, 'emotions_influenced', v)} />

          <Text style={s.formLabel}>Commitment Level (1-5)</Text>
          <ScaleRow value={m.commitment_level} onChange={v => updateMental(idx, 'commitment_level', v)} />
        </Section>

        <Section title="🏌️ Post-Shot" id="mental-post">
          <Text style={s.formLabel}>Did you execute your plan?</Text>
          <PillRow options={EXECUTE_OPTIONS} value={m.executed_plan} onChange={v => updateMental(idx, 'executed_plan', v)} />

          <Text style={s.formLabel}>How did you react?</Text>
          <PillRow options={REACTIONS} value={m.post_reaction} onChange={v => updateMental(idx, 'post_reaction', v)} />

          <Text style={s.formLabel}>Did your reaction match the result?</Text>
          <PillRow options={['Yes', 'No', 'Overreacted', 'Underreacted']} value={m.reaction_matched} onChange={v => updateMental(idx, 'reaction_matched', v)} />
        </Section>
      </>
    );
  };

  // Step 1: Course selection
  if (step === 1) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={s.stepTitle}>Step 1: Select Course</Text>
        <TextInput style={s.searchInput} placeholder="Search courses..." placeholderTextColor={colors.gray} value={search} onChangeText={setSearch} />
        {filteredCourses.map(c => (
          <TouchableOpacity key={c.id} style={s.courseCard} onPress={() => selectCourse(c)}>
            <Text style={s.courseCardName}>{c.name}</Text>
            <Text style={s.courseCardLoc}>{c.city}, {c.state} · {c.num_holes} holes</Text>
          </TouchableOpacity>
        ))}
        {!showNewCourse ? (
          <TouchableOpacity style={s.addBtn} onPress={() => { setShowNewCourse(true); setNewHolePars(Array(18).fill(4)); }}>
            <Text style={s.addBtnText}>+ Add New Course</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.newCourseForm}>
            <Text style={s.formLabel}>Course Name</Text>
            <TextInput style={s.input} value={newCourseName} onChangeText={setNewCourseName} placeholder="Augusta National" placeholderTextColor={colors.gray} />
            <Text style={s.formLabel}>City</Text>
            <TextInput style={s.input} value={newCourseCity} onChangeText={setNewCourseCity} placeholder="Augusta" placeholderTextColor={colors.gray} />
            <Text style={s.formLabel}>State</Text>
            <TextInput style={s.input} value={newCourseState} onChangeText={setNewCourseState} placeholder="GA" placeholderTextColor={colors.gray} />
            <Text style={s.formLabel}>Number of Holes</Text>
            <TextInput style={s.input} value={newCourseHoles} onChangeText={v => { setNewCourseHoles(v); setNewHolePars(Array(parseInt(v) || 18).fill(4)); }} keyboardType="number-pad" />
            <Text style={s.formLabel}>Hole Pars (tap to cycle 3/4/5)</Text>
            <View style={s.parRow}>
              {newHolePars.map((p, i) => (
                <TouchableOpacity key={i} style={s.parBtn} onPress={() => {
                  const next = p === 3 ? 4 : p === 4 ? 5 : 3;
                  setNewHolePars(prev => prev.map((v, j) => j === i ? next : v));
                }}>
                  <Text style={s.parBtnNum}>{i + 1}</Text>
                  <Text style={s.parBtnPar}>Par {p}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={s.goldBtn} onPress={createCourse}>
              <Text style={s.goldBtnText}>Create Course</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  }

  // Step 2: Tee selection
  if (step === 2) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={s.stepTitle}>Step 2: Select Tees</Text>
        <Text style={s.selectedCourse}>{selectedCourse?.name}</Text>
        <Text style={{ color: colors.grayDark, marginBottom: 16 }}>Choose the tees you played from</Text>
        {teeSets.map(renderTeeCard)}
        <TouchableOpacity style={s.mixedBtn} onPress={selectMixedTees}>
          <Text style={s.mixedBtnText}>🔀 I Played Mixed Tees</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(1)}>
          <Text style={s.backBtnText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 3: Round details + tracking mode
  if (step === 3) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <Text style={s.stepTitle}>Step 3: Round Details</Text>
        <Text style={s.selectedCourse}>{selectedCourse?.name}</Text>
        {selectedTee && (
          <Text style={s.selectedTeeLabel}>Tees: {selectedTee.name || selectedTee.color} ({selectedTee.total_yardage} yds)</Text>
        )}
        {mixedTees && <Text style={s.selectedTeeLabel}>Mixed Tees</Text>}

        <Text style={s.formLabel}>Tracking Mode</Text>
        <View style={s.modeGrid}>
          {TRACKING_MODES.map(m => (
            <TouchableOpacity
              key={m.key}
              style={[s.modeCard, trackingMode === m.key && s.modeCardActive]}
              onPress={() => setTrackingMode(m.key)}
            >
              <Text style={s.modeEmoji}>{m.emoji}</Text>
              <Text style={[s.modeLabel, trackingMode === m.key && s.modeLabelActive]}>{m.label}</Text>
              <Text style={[s.modeDesc, trackingMode === m.key && s.modeDescActive]}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.formLabel}>Date</Text>
        <TextInput style={s.input} value={datePlayed} onChangeText={setDatePlayed} placeholder="YYYY-MM-DD" placeholderTextColor={colors.gray} />
        <Text style={s.formLabel}>Weather</Text>
        <TextInput style={s.input} value={weather} onChangeText={setWeather} placeholder="Sunny, 75°F" placeholderTextColor={colors.gray} />
        <Text style={s.formLabel}>Wind</Text>
        <TextInput style={s.input} value={wind} onChangeText={setWind} placeholder="5-10 mph SW" placeholderTextColor={colors.gray} />
        <Text style={s.formLabel}>Visibility</Text>
        <View style={s.visRow}>
          {['private', 'partners', 'public'].map(v => (
            <TouchableOpacity key={v} style={[s.visBtn, visibility === v && s.visBtnActive]} onPress={() => setVisibility(v)}>
              <Text style={[s.visBtnText, visibility === v && s.visBtnTextActive]}>{v.charAt(0).toUpperCase() + v.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={s.navRow}>
          <TouchableOpacity style={s.backBtn} onPress={() => teeSets.length > 0 ? setStep(2) : setStep(1)}><Text style={s.backBtnText}>← Back</Text></TouchableOpacity>
          <TouchableOpacity style={s.goldBtn} onPress={() => setStep(4)}><Text style={s.goldBtnText}>Next: Score Entry →</Text></TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // Step 4: Hole-by-hole
  if (step === 4) {
    const entry = holeEntries[currentHole];
    const hole = holes[currentHole];
    const teeHole = teeHolesData.find(th => th.hole_number === currentHole + 1);
    const yardage = teeHole?.yardage || hole?.distance_yards;
    const modeInfo = TRACKING_MODES.find(m => m.key === trackingMode);

    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={s.stepTitle}>Hole-by-Hole</Text>
          <View style={s.modeBadge}>
            <Text style={s.modeBadgeText}>{modeInfo?.emoji} {modeInfo?.label}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={s.holeSelector}>
            {holeEntries.map((e, i) => (
              <TouchableOpacity key={i} style={[s.holePill, currentHole === i && s.holePillActive, e.score > 0 && s.holePillDone]}
                onPress={() => { setCurrentHole(i); setExpandedSection(null); }}>
                <Text style={[s.holePillText, currentHole === i && s.holePillTextActive]}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={s.holeHeader}>
          <Text style={s.holeTitle}>Hole {currentHole + 1}</Text>
          <Text style={s.holePar}>
            Par {teeHole?.par || hole?.par || '?'}
            {yardage ? ` · ${yardage} yds` : ''}
            {teeHole?.handicap_index ? ` · Hcp ${teeHole.handicap_index}` : ''}
          </Text>
        </View>

        {/* Mixed tees: per-hole tee selector */}
        {mixedTees && teeSets.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={s.formLabel}>Tee for this hole</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {teeSets.map(tee => {
                  const dotColor = teeColors[tee.color] || teeColors[tee.name] || colors.gray;
                  const isWhite = tee.color === 'White' || tee.name === 'White';
                  const isSelected = entry.tee_set_id === tee.id;
                  return (
                    <TouchableOpacity key={tee.id}
                      style={[s.miniTeeBtn, isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                      onPress={() => updateHoleEntry(currentHole, 'tee_set_id', tee.id)}>
                      <View style={[s.miniTeeDot, { backgroundColor: dotColor }, isWhite && { borderWidth: 1, borderColor: colors.grayLight }]} />
                      <Text style={[s.miniTeeText, isSelected && { color: colors.white }]}>{tee.color || tee.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TextInput
              style={[s.input, { marginTop: 8 }]}
              placeholder="Custom yardage (optional)"
              placeholderTextColor={colors.gray}
              keyboardType="number-pad"
              value={entry.custom_yardage ? String(entry.custom_yardage) : ''}
              onChangeText={v => updateHoleEntry(currentHole, 'custom_yardage', parseInt(v) || 0)}
            />
          </View>
        )}

        {/* Basic fields — always shown */}
        <Text style={s.formLabel}>Score</Text>
        <View style={s.counterRow}>
          <TouchableOpacity style={s.counterBtn} onPress={() => entry.score > 0 && updateHoleEntry(currentHole, 'score', entry.score - 1)}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{entry.score || '—'}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(currentHole, 'score', entry.score + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.formLabel}>Putts</Text>
        <View style={s.counterRow}>
          <TouchableOpacity style={s.counterBtn} onPress={() => entry.putts > 0 && updateHoleEntry(currentHole, 'putts', entry.putts - 1)}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{entry.putts}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(currentHole, 'putts', entry.putts + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.formLabel}>Fairway Hit</Text>
        <View style={s.toggleRow}>
          {[{ label: 'Yes', val: true }, { label: 'No', val: false }, { label: 'N/A', val: null }].map(opt => (
            <TouchableOpacity key={String(opt.val)} style={[s.toggleBtn, entry.fairway_hit === opt.val && s.toggleBtnActive]}
              onPress={() => updateHoleEntry(currentHole, 'fairway_hit', opt.val)}>
              <Text style={[s.toggleBtnText, entry.fairway_hit === opt.val && s.toggleBtnTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.formLabel}>Green in Regulation</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity style={[s.toggleBtn, entry.gir && s.toggleBtnActive]} onPress={() => updateHoleEntry(currentHole, 'gir', true)}>
            <Text style={[s.toggleBtnText, entry.gir && s.toggleBtnTextActive]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, !entry.gir && s.toggleBtnActive]} onPress={() => updateHoleEntry(currentHole, 'gir', false)}>
            <Text style={[s.toggleBtnText, !entry.gir && s.toggleBtnTextActive]}>No</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.formLabel}>Penalties</Text>
        <View style={s.counterRow}>
          <TouchableOpacity style={s.counterBtn} onPress={() => entry.penalties > 0 && updateHoleEntry(currentHole, 'penalties', entry.penalties - 1)}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{entry.penalties}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(currentHole, 'penalties', entry.penalties + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Mode-specific fields */}
        {trackingMode === 'advanced' && renderAdvancedFields(currentHole)}
        {trackingMode === 'strategy' && renderStrategyFields(currentHole)}
        {trackingMode === 'mental' && renderMentalFields(currentHole)}

        <View style={s.holeNav}>
          {currentHole > 0 && (
            <TouchableOpacity style={s.backBtn} onPress={() => { setCurrentHole(currentHole - 1); setExpandedSection(null); }}>
              <Text style={s.backBtnText}>← Hole {currentHole}</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {currentHole < holeEntries.length - 1 ? (
            <TouchableOpacity style={s.goldBtn} onPress={() => { setCurrentHole(currentHole + 1); setExpandedSection(null); }}>
              <Text style={s.goldBtnText}>Hole {currentHole + 2} →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={s.goldBtn} onPress={() => setStep(5)}>
              <Text style={s.goldBtnText}>Review →</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    );
  }

  // Step 5: Review
  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={s.stepTitle}>Review & Save</Text>
      <Text style={s.selectedCourse}>{selectedCourse?.name}</Text>
      {selectedTee && <Text style={s.selectedTeeLabel}>Tees: {selectedTee.name || selectedTee.color}</Text>}
      {mixedTees && <Text style={s.selectedTeeLabel}>Mixed Tees</Text>}
      <Text style={s.reviewDate}>{datePlayed} · {weather || 'No weather'} · {visibility}</Text>
      <View style={s.modeBadge}>
        <Text style={s.modeBadgeText}>{TRACKING_MODES.find(m => m.key === trackingMode)?.emoji} {TRACKING_MODES.find(m => m.key === trackingMode)?.label} Mode</Text>
      </View>

      <View style={s.reviewScoreCard}>
        <View style={s.reviewBig}>
          <Text style={s.reviewBigNum}>{totalScore}</Text>
          <Text style={s.reviewBigLabel}>Total Score</Text>
        </View>
        <View style={s.reviewBig}>
          <Text style={s.reviewBigNum}>{totalPutts}</Text>
          <Text style={s.reviewBigLabel}>Total Putts</Text>
        </View>
      </View>

      <View style={s.reviewTable}>
        <View style={s.reviewHeaderRow}>
          <Text style={[s.reviewCell, s.reviewHeaderText, { flex: 0.5 }]}>Hole</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>Par</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>Score</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>Putts</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>FW</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>GIR</Text>
        </View>
        {holeEntries.map((e, i) => (
          <TouchableOpacity key={i} style={s.reviewRow} onPress={() => { setCurrentHole(i); setStep(4); }}>
            <Text style={[s.reviewCell, { flex: 0.5 }]}>{i + 1}</Text>
            <Text style={s.reviewCell}>{holes[i]?.par || '—'}</Text>
            <Text style={[s.reviewCell, s.reviewScore, e.score && holes[i] && e.score < holes[i].par ? s.under : e.score && holes[i] && e.score > holes[i].par ? s.over : {}]}>{e.score || '—'}</Text>
            <Text style={s.reviewCell}>{e.putts || '—'}</Text>
            <Text style={s.reviewCell}>{e.fairway_hit === null ? '—' : e.fairway_hit ? '✓' : '✗'}</Text>
            <Text style={s.reviewCell}>{e.gir ? '✓' : '✗'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.navRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => setStep(4)}><Text style={s.backBtnText}>← Edit Holes</Text></TouchableOpacity>
        <TouchableOpacity style={[s.goldBtn, saving && { opacity: 0.6 }]} onPress={saveRound} disabled={saving}>
          <Text style={s.goldBtnText}>{saving ? 'Saving...' : '✓ Save Round'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  stepTitle: { fontSize: 20, fontWeight: '800', color: colors.primary, marginBottom: 16 },
  searchInput: { backgroundColor: colors.white, borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: colors.grayLight, marginBottom: 12 },
  courseCard: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.grayLight },
  courseCardName: { fontSize: 16, fontWeight: '700', color: colors.primary },
  courseCardLoc: { fontSize: 13, color: colors.grayDark, marginTop: 2 },
  addBtn: { padding: 14, borderRadius: 10, borderWidth: 2, borderColor: colors.gold, borderStyle: 'dashed', alignItems: 'center', marginTop: 8 },
  addBtnText: { color: colors.gold, fontWeight: '700', fontSize: 15 },
  newCourseForm: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginTop: 12 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.offWhite, borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: colors.grayLight },
  parRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  parBtn: { width: 52, padding: 6, borderRadius: 8, backgroundColor: colors.offWhite, alignItems: 'center', borderWidth: 1, borderColor: colors.grayLight },
  parBtnNum: { fontSize: 11, color: colors.gray },
  parBtnPar: { fontSize: 13, fontWeight: '700', color: colors.primary },
  goldBtn: { backgroundColor: colors.gold, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  goldBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 15 },
  backBtn: { padding: 14, marginTop: 16 },
  backBtnText: { color: colors.primary, fontWeight: '600', fontSize: 15 },
  selectedCourse: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  selectedTeeLabel: { fontSize: 14, fontWeight: '600', color: colors.gold, marginBottom: 8 },
  teeCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.grayLight, gap: 12 },
  teeDot: { width: 24, height: 24, borderRadius: 12 },
  teeName: { fontSize: 15, fontWeight: '700', color: colors.black },
  teeSub: { fontSize: 12, color: colors.grayDark, marginTop: 2 },
  mixedBtn: { padding: 14, borderRadius: 10, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', marginTop: 8 },
  mixedBtnText: { color: colors.gold, fontWeight: '700', fontSize: 15 },
  miniTeeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.grayLight, backgroundColor: colors.white },
  miniTeeDot: { width: 14, height: 14, borderRadius: 7 },
  miniTeeText: { fontSize: 12, fontWeight: '600', color: colors.grayDark },
  visRow: { flexDirection: 'row', gap: 8 },
  visBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.grayLight, alignItems: 'center' },
  visBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  visBtnText: { fontWeight: '600', color: colors.grayDark },
  visBtnTextActive: { color: colors.white },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  holeSelector: { flexDirection: 'row', gap: 6 },
  holePill: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.grayLight },
  holePillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  holePillDone: { borderColor: colors.gold },
  holePillText: { fontSize: 13, fontWeight: '700', color: colors.grayDark },
  holePillTextActive: { color: colors.white },
  holeHeader: { marginBottom: 16 },
  holeTitle: { fontSize: 24, fontWeight: '800', color: colors.primary },
  holePar: { fontSize: 14, color: colors.grayDark },
  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 8 },
  counterBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  counterBtnText: { fontSize: 22, color: colors.white, fontWeight: '700' },
  counterVal: { fontSize: 32, fontWeight: '800', color: colors.primary, minWidth: 50, textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.grayLight, alignItems: 'center', backgroundColor: colors.white },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleBtnText: { fontWeight: '600', color: colors.grayDark },
  toggleBtnTextActive: { color: colors.white },
  holeNav: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  reviewDate: { fontSize: 14, color: colors.grayDark, marginBottom: 16 },
  reviewScoreCard: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  reviewBig: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' },
  reviewBigNum: { fontSize: 36, fontWeight: '800', color: colors.gold },
  reviewBigLabel: { fontSize: 12, color: colors.white, opacity: 0.8 },
  reviewTable: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
  reviewHeaderRow: { flexDirection: 'row', backgroundColor: colors.primary, padding: 10 },
  reviewHeaderText: { color: colors.white, fontWeight: '700' },
  reviewRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  reviewCell: { flex: 1, textAlign: 'center', fontSize: 14 },
  reviewScore: { fontWeight: '700' },
  under: { color: colors.green },
  over: { color: colors.red },
  // Mode selection
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  modeCard: { width: '48%' as any, backgroundColor: colors.white, borderRadius: 12, padding: 14, borderWidth: 2, borderColor: colors.grayLight, alignItems: 'center' },
  modeCardActive: { borderColor: colors.gold, backgroundColor: colors.primaryDark },
  modeEmoji: { fontSize: 24, marginBottom: 4 },
  modeLabel: { fontSize: 14, fontWeight: '700', color: colors.primary },
  modeLabelActive: { color: colors.gold },
  modeDesc: { fontSize: 11, color: colors.grayDark, textAlign: 'center', marginTop: 2 },
  modeDescActive: { color: colors.grayLight },
  modeBadge: { backgroundColor: colors.primaryDark, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  modeBadgeText: { color: colors.gold, fontSize: 12, fontWeight: '600' },
  // Pills
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.grayDark },
  pillTextActive: { color: colors.white },
  // Scale
  scaleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  scaleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight, alignItems: 'center', justifyContent: 'center' },
  scaleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleBtnText: { fontSize: 16, fontWeight: '700', color: colors.grayDark },
  scaleBtnTextActive: { color: colors.gold },
  // Sections
  section: { backgroundColor: colors.white, borderRadius: 12, marginTop: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: colors.primaryDark },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gold },
  sectionArrow: { fontSize: 16, color: colors.gold },
  sectionBody: { padding: 14 },
});
