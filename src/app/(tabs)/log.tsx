import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors, teeColors } from '../../lib/theme';
import ScoreCell from '../../components/ScoreCell';

type TrackingMode = 'basic' | 'advanced' | 'strategy' | 'mental';

interface Course { id: string; name: string; city: string; state: string; num_holes: number; }
interface Hole { id: string; hole_number: number; par: number; distance_yards: number; }
interface TeeSet { id: string; course_id: string; color: string; name: string; total_yardage: number; total_par: number; rating: number; slope: number; }
interface TeeHole { id: string; tee_set_id: string; hole_number: number; yardage: number; par: number; handicap_index: number; }

interface ShotData {
  shot_number: number;
  club: string;
  shot_shape: string;
  intention: string;
  layup_target_distance?: number;
  pin_position?: string;
  aim_point?: string;
  result_lie: string;
  miss_direction: string;
  green_position?: string;
  // Putt-specific fields
  is_putt?: boolean;
  putt_distance?: string; // feet
  putt_break?: string; // 'left-to-right' | 'right-to-left' | 'straight' | 'double-break'
  putt_break_amount?: string; // 'slight' | 'moderate' | 'heavy'
  putt_slope?: string; // 'uphill' | 'downhill' | 'flat'
  putt_result?: string; // 'made' | 'miss-left' | 'miss-right' | 'miss-short' | 'miss-long' | 'lip-out-left' | 'lip-out-right'
  putt_distance_remaining?: string; // feet remaining after miss
  approach_distance?: string; // yards for approach shots
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
  fairway_miss_dir: string | null;
  gir: boolean;
  penalties: number;
  wedge_and_in: number | null;
  tee_set_id?: string;
  custom_yardage?: number;
  shots: ShotData[];
  strategy?: StrategyData;
  mental?: MentalData;
}

const defaultShot = (n: number): ShotData => ({
  shot_number: n, club: '', shot_shape: '', intention: '', result_lie: '', miss_direction: '',
});
const defaultStrategy = (): StrategyData => ({ lie_type: '', distance: '', intention: '', executed: '', notes: '' });
const defaultMental = (): MentalData => ({ pre_feeling: '', difficulty_rating: 3, emotions_influenced: '', commitment_level: 3, executed_plan: '', post_reaction: '', reaction_matched: '' });

const SHOT_SHAPES = ['Straight', 'Draw', 'Fade', 'Punch', 'Flop', 'Knockdown', 'High', 'Low'];
const CLUBS = ['Driver', '3W', '5W', '7W', '2H', '3H', '4H', '5H', '3i', '4i', '5i', '6i', '7i', '8i', '9i', 'PW', 'GW', 'SW', 'LW', 'Putter'];
const RESULT_LIES = ['Fairway', 'Rough', 'Bunker', 'Green', 'Fringe', 'Water', 'OB', 'Trees', 'Cart Path'];
const MISS_DIRECTIONS = ['Left', 'Right', 'Short', 'Long', 'On Target'];
const INTENTIONS = [
  { key: 'hit_fairway', label: 'Hit Fairway' },
  { key: 'lay_up', label: 'Lay Up' },
  { key: 'hit_green', label: 'Hit Green' },
  { key: 'recovery', label: 'Recovery' },
  { key: 'punch_out', label: 'Punch Out' },
  { key: 'chip_pitch', label: 'Chip/Pitch' },
];
const PUTT_BREAKS = ['Left-to-Right', 'Right-to-Left', 'Straight', 'Double Break'];
const PUTT_BREAK_AMOUNTS = ['Slight', 'Moderate', 'Heavy'];
const PUTT_SLOPES = ['Uphill', 'Downhill', 'Flat'];
const PUTT_RESULTS = [
  { key: 'made', label: '✓ Made It' },
  { key: 'miss-left', label: 'Miss Left' },
  { key: 'miss-right', label: 'Miss Right' },
  { key: 'miss-short', label: 'Miss Short' },
  { key: 'miss-long', label: 'Miss Long' },
  { key: 'lip-out-left', label: 'Lip Out Left' },
  { key: 'lip-out-right', label: 'Lip Out Right' },
];
const LIE_TYPES = ['Tee', 'Fairway', 'Rough', 'Bunker', 'Green', 'Fringe', 'Trees'];
const WEATHER_OPTIONS = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Rain', 'Windy', 'Cold', 'Hot & Humid'];
const WIND_OPTIONS = ['Calm', '5-10 mph', '10-15 mph', '15-20 mph', '20+ mph'];
const GRASS_TYPES = ['Bermuda', 'Bentgrass', 'Poa Annua', 'Zoysia', 'Ryegrass', 'Fescue', 'Paspalum', 'Mixed'];
const ROUGH_THICKNESS = ['Thin', 'Medium', 'Thick', 'Very Thick'];
const FEELINGS = ['Confident', 'Nervous', 'Frustrated', 'Neutral', 'Excited', 'Anxious', 'Calm'];
const REACTIONS = ['Positive', 'Negative', 'Neutral'];
const EXECUTE_OPTIONS = ['Yes', 'No', 'Partial'];

const GRID_3X3_LABELS = [
  'back-left', 'back-center', 'back-right',
  'mid-left', 'center', 'mid-right',
  'front-left', 'front-center', 'front-right',
];
const GRID_3X3_DISPLAY = [
  ['BL', 'BC', 'BR'],
  ['ML', 'C', 'MR'],
  ['FL', 'FC', 'FR'],
];

// 5x5 green grid: outer ring = miss, inner 3x3 = on green
const GRID_5X5: { key: string; onGreen: boolean; label: string }[][] = (() => {
  const rows = ['long', 'front', 'mid', 'back', 'short'];
  const cols = ['left', 'left', 'center', 'right', 'right'];
  const grid: { key: string; onGreen: boolean; label: string }[][] = [];
  const outerLabels = [
    ['miss-long-left','miss-long-left','miss-long','miss-long-right','miss-long-right'],
    ['miss-left','on-back-left','on-back-center','on-back-right','miss-right'],
    ['miss-left','on-mid-left','on-center','on-mid-right','miss-right'],
    ['miss-left','on-front-left','on-front-center','on-front-right','miss-right'],
    ['miss-short-left','miss-short-left','miss-short','miss-short-right','miss-short-right'],
  ];
  const displayLabels = [
    ['↖','⬆','⬆','⬆','↗'],
    ['⬅','BL','BC','BR','➡'],
    ['⬅','ML','C','MR','➡'],
    ['⬅','FL','FC','FR','➡'],
    ['↙','⬇','⬇','⬇','↘'],
  ];
  for (let r = 0; r < 5; r++) {
    const row: { key: string; onGreen: boolean; label: string }[] = [];
    for (let c = 0; c < 5; c++) {
      const onGreen = r >= 1 && r <= 3 && c >= 1 && c <= 3;
      row.push({ key: outerLabels[r][c], onGreen, label: displayLabels[r][c] });
    }
    grid.push(row);
  }
  return grid;
})();

const TRACKING_MODES: { key: TrackingMode; label: string; emoji: string; desc: string }[] = [
  { key: 'basic', label: 'Basic', emoji: '⛳', desc: 'Score, putts, fairways & GIR' },
  { key: 'advanced', label: 'Advanced', emoji: '🎯', desc: 'Per-shot club, intention & result' },
  { key: 'strategy', label: 'Strategy', emoji: '🧠', desc: 'Intention & execution tracking' },
  { key: 'mental', label: 'Mental Game', emoji: '🧘', desc: 'Psychology & emotional awareness' },
];

const OPENAI_API_KEY = 'sk-proj-ceUGQnbSF4ZoZXbl0HXNiAaW';

export default function LogRound() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [scanning, setScanning] = useState(false);
  const [scannedFromPhoto, setScannedFromPhoto] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [selectedTee, setSelectedTee] = useState<TeeSet | null>(null);
  const [teeHolesData, setTeeHolesData] = useState<TeeHole[]>([]);
  const [allTeeHolesData, setAllTeeHolesData] = useState<TeeHole[]>([]);
  const [mixedTees, setMixedTees] = useState(false);
  const [datePlayed, setDatePlayed] = useState(new Date().toISOString().split('T')[0]);
  const [weather, setWeather] = useState('');
  const [wind, setWind] = useState('');
  const [visibility, setVisibility] = useState('private');
  const [trackingMode, setTrackingMode] = useState<TrackingMode>('basic');
  const [roundType, setRoundType] = useState<'practice' | 'tournament' | 'casual'>('practice');
  const [holeEntries, setHoleEntries] = useState<HoleEntry[]>([]);
  const [currentHole, setCurrentHole] = useState(0);
  const [saving, setSaving] = useState(false);
  const [roundCaption, setRoundCaption] = useState('');
  const [roundPhoto, setRoundPhoto] = useState<string | null>(null);
  const [showNewCourse, setShowNewCourse] = useState(false);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCity, setNewCourseCity] = useState('');
  const [newCourseState, setNewCourseState] = useState('');
  const [newCourseHoles, setNewCourseHoles] = useState('18');
  const [newHolePars, setNewHolePars] = useState<number[]>([]);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [expandedShots, setExpandedShots] = useState<Record<string, boolean>>({});
  const [holeSelection, setHoleSelection] = useState<'all' | 'front9' | 'back9' | 'custom'>('all');
  const [selectedHoles, setSelectedHoles] = useState<number[]>([]);
  const [userBag, setUserBag] = useState<string[] | null>(null);
  const [trackWedgeAndIn, setTrackWedgeAndIn] = useState(false);
  const [greenFirmness, setGreenFirmness] = useState(0);
  const [greenSpeed, setGreenSpeed] = useState(0);
  const [grassType, setGrassType] = useState('');
  const [roughThickness, setRoughThickness] = useState('');

  useEffect(() => {
    supabase.from('sb_courses').select('*').order('name').then(({ data }) => setCourses(data || []));
    // Load user's bag
    if (user?.id) {
      AsyncStorage.getItem(`sandbagger_bag_${user.id}`).then(stored => {
        if (stored) { try { setUserBag(JSON.parse(stored)); } catch {} }
      });
    }
  }, []);

  const scanScorecard = async (imageBase64: string) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: [
          { type: 'text', text: 'Extract golf scorecard data from this image. Return ONLY valid JSON with this exact structure: {"course_name": "string", "date": "YYYY-MM-DD", "round_type": "practice|tournament|casual", "caption": "string or null", "holes": [{"hole": 1, "par": 4, "score": 5, "putts": 2, "fairway_hit": true, "gir": false, "wedge_and_in": null},...]} Include all 18 holes. Use null for empty/unclear values. fairway_hit and gir should be true/false/null.' },
          { type: 'image_url', image_url: { url: imageBase64 } }
        ] }],
        max_tokens: 2000,
      }),
    });
    const data = await response.json();
    const content = data.choices[0].message.content.replace(/```json\n?|```\n?/g, '').trim();
    return JSON.parse(content);
  };

  const handleScanScorecard = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev: any) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      const result = await scanScorecard(base64);

      // Try to match course
      if (result.course_name) {
        const match = courses.find(c => c.name.toLowerCase().includes(result.course_name.toLowerCase()) || result.course_name.toLowerCase().includes(c.name.toLowerCase()));
        if (match) {
          await selectCourse(match);
        } else {
          setSearch(result.course_name);
        }
      }

      // Set date and round type
      if (result.date) setDatePlayed(result.date);
      if (result.round_type) setRoundType(result.round_type as any);
      if (result.caption) setRoundCaption(result.caption);

      // Fill hole entries
      if (result.holes && Array.isArray(result.holes)) {
        const numH = result.holes.length || 18;
        const entries = initHoleEntries(numH);
        result.holes.forEach((h: any, i: number) => {
          if (i < entries.length) {
            entries[i].score = h.score || 0;
            entries[i].putts = h.putts || 0;
            entries[i].fairway_hit = h.fairway_hit ?? null;
            entries[i].gir = h.gir ?? false;
            entries[i].wedge_and_in = h.wedge_and_in ?? null;
          }
        });
        setHoleEntries(entries);
        if (result.holes.some((h: any) => h.wedge_and_in !== null && h.wedge_and_in !== undefined)) {
          setTrackWedgeAndIn(true);
        }
      }

      setScannedFromPhoto(true);
      setStep(5);
    } catch (err: any) {
      if (Platform.OS === 'web') {
        window.alert(`Scan failed: ${err.message}`);
      } else {
        Alert.alert('Scan Error', err.message);
      }
    } finally {
      setScanning(false);
    }
  };

  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const initHoleEntries = (numH: number) => {
    return Array(numH).fill(null).map(() => ({
      score: 0, putts: 0, fairway_hit: null as boolean | null, fairway_miss_dir: null as string | null, gir: false, penalties: 0, wedge_and_in: null as number | null,
      shots: [] as ShotData[], strategy: defaultStrategy(), mental: defaultMental(),
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
    setHoleSelection('all');
    setSelectedHoles(Array.from({ length: numH }, (_, i) => i + 1));
    setSelectedTee(null);
    setMixedTees(false);
    const teeIds = (teesRes.data || []).map((t: TeeSet) => t.id);
    if (teeIds.length > 0) {
      const { data: allTH } = await supabase.from('sb_tee_holes').select('*').in('tee_set_id', teeIds).order('hole_number');
      setAllTeeHolesData(allTH || []);
    } else {
      setAllTeeHolesData([]);
    }
    if ((teesRes.data || []).length > 0) setStep(2);
    else setStep(3);
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
    setHoleEntries(prev => prev.map((e, i) => {
      if (i !== idx) return e;
      const updated = { ...e, [field]: value };
      // Reset fairway_miss_dir when fairway_hit changes to non-false
      if (field === 'fairway_hit' && value !== false) {
        updated.fairway_miss_dir = null;
      }
      // Sync shots array when score changes in advanced mode
      if (field === 'score' && trackingMode === 'advanced') {
        const newScore = value as number;
        const currentShots = [...e.shots];
        if (newScore > currentShots.length) {
          for (let s = currentShots.length; s < newScore; s++) {
            currentShots.push(defaultShot(s + 1));
          }
        } else if (newScore < currentShots.length) {
          currentShots.length = newScore;
        }
        updated.shots = currentShots;
      }
      return updated;
    }));
  };

  const updateShot = (holeIdx: number, shotIdx: number, field: keyof ShotData, value: any) => {
    setHoleEntries(prev => prev.map((e, i) => {
      if (i !== holeIdx) return e;
      const shots = [...e.shots];
      shots[shotIdx] = { ...shots[shotIdx], [field]: value };
      return { ...e, shots };
    }));
  };

  const updateStrategy = (idx: number, field: keyof StrategyData, value: string) => {
    setHoleEntries(prev => prev.map((e, i) => i === idx ? { ...e, strategy: { ...(e.strategy || defaultStrategy()), [field]: value } } : e));
  };

  const updateMental = (idx: number, field: keyof MentalData, value: any) => {
    setHoleEntries(prev => prev.map((e, i) => i === idx ? { ...e, mental: { ...(e.mental || defaultMental()), [field]: value } } : e));
  };

  const activeHoleNumbers = holeSelection === 'all' ? Array.from({ length: holes.length || 18 }, (_, i) => i + 1)
    : holeSelection === 'front9' ? Array.from({ length: 9 }, (_, i) => i + 1)
    : holeSelection === 'back9' ? Array.from({ length: 9 }, (_, i) => i + 10)
    : selectedHoles.sort((a, b) => a - b);

  const activeIndices = activeHoleNumbers.map(n => n - 1);

  const handleHoleSelectionChange = (mode: 'all' | 'front9' | 'back9' | 'custom') => {
    const numH = holeEntries.length || 18;
    setHoleSelection(mode);
    if (mode === 'all') setSelectedHoles(Array.from({ length: numH }, (_, i) => i + 1));
    else if (mode === 'front9') setSelectedHoles(Array.from({ length: Math.min(9, numH) }, (_, i) => i + 1));
    else if (mode === 'back9') setSelectedHoles(Array.from({ length: Math.min(9, numH - 9) }, (_, i) => i + 10));
  };

  const toggleCustomHole = (holeNum: number) => {
    setSelectedHoles(prev => prev.includes(holeNum) ? prev.filter(h => h !== holeNum) : [...prev, holeNum]);
  };

  const totalScore = activeIndices.reduce((s, i) => s + (holeEntries[i]?.score || 0), 0);
  const totalPutts = activeIndices.reduce((s, i) => s + (holeEntries[i]?.putts || 0), 0);

  const toggleShotExpanded = (key: string) => {
    setExpandedShots(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveRound = async () => {
    if (!user) { if (Platform.OS === 'web') window.alert('Please log in first'); else Alert.alert('Error', 'Please log in first'); return; }
    if (!selectedCourse) { if (Platform.OS === 'web') window.alert('Please select a course first'); else Alert.alert('Error', 'Please select a course first'); return; }
    setSaving(true);
    try {
      const { data: round, error } = await supabase.from('sb_rounds').insert({
        user_id: user.id, course_id: selectedCourse.id, date_played: datePlayed,
        total_score: totalScore, weather, wind, is_complete: true, visibility,
        tee_set_id: selectedTee?.id || null,
        mixed_tees: mixedTees,
        notes: JSON.stringify({ tracking_mode: trackingMode, holes_played: activeHoleNumbers, track_wedge_and_in: trackWedgeAndIn, caption: roundCaption || null, photo_url: roundPhoto || null, round_type: roundType, green_firmness: greenFirmness || null, green_speed: greenSpeed || null, grass_type: grassType || null, rough_thickness: roughThickness || null }),
      }).select().single();
      if (error) throw error;

      const scoreInserts = activeIndices.map((i) => {
        const e = holeEntries[i];
        const base: any = {
          round_id: round.id, hole_id: holes[i]?.id || null, hole_number: i + 1,
          par: holes[i]?.par || teeHolesData.find(th => th.hole_number === i + 1)?.par || allTeeHolesData.find(th => th.hole_number === i + 1)?.par || null,
          score: e.score, putts: e.putts, fairway_hit: e.fairway_hit, fairway_miss_dir: e.fairway_hit === false ? e.fairway_miss_dir : null, gir: e.gir, penalties: e.penalties, wedge_and_in: trackWedgeAndIn ? e.wedge_and_in : null,
        };
        if (trackingMode === 'advanced' && e.shots.length > 0) {
          base.notes = JSON.stringify({ mode: 'advanced', shots: e.shots });
        } else if (trackingMode === 'strategy' && e.strategy) {
          base.notes = JSON.stringify({ mode: 'strategy', data: e.strategy });
        } else if (trackingMode === 'mental' && e.mental) {
          base.notes = JSON.stringify({ mode: 'mental', data: e.mental });
        }
        return base;
      });
      await supabase.from('sb_hole_scores').insert(scoreInserts);
      if (Platform.OS === 'web') {
        window.alert(`Round saved! Total: ${totalScore}`);
      } else {
        Alert.alert('Success', `Round saved! Total: ${totalScore}`);
      }
      setStep(1); setSelectedCourse(null); setHoles([]); setHoleEntries([]); setSelectedTee(null); setMixedTees(false); setHoleSelection('all'); setSelectedHoles(Array.from({ length: 18 }, (_, i) => i + 1)); setTrackWedgeAndIn(false); setRoundType('practice'); setRoundCaption(''); setRoundPhoto(null); setScannedFromPhoto(false);
    } catch (e: any) {
      console.error('Save round error:', e);
      if (Platform.OS === 'web') {
        window.alert(`Error saving round: ${e.message || JSON.stringify(e)}`);
      } else {
        Alert.alert('Error', e.message || JSON.stringify(e));
      }
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

  // 3x3 grid component for pin position / aim point
  const Grid3x3 = ({ value, onChange, markerType, pinValue }: { value: string; onChange: (v: string) => void; markerType: 'pin' | 'aim'; pinValue?: string }) => (
    <View style={s.grid3x3}>
      {GRID_3X3_DISPLAY.map((row, ri) => (
        <View key={ri} style={s.gridRow}>
          {row.map((label, ci) => {
            const key = GRID_3X3_LABELS[ri * 3 + ci];
            const isSelected = value === key;
            const isPinHere = markerType === 'aim' && pinValue === key && !isSelected;
            return (
              <TouchableOpacity key={key} style={[s.grid3Cell, isSelected && s.gridCellSelected, isPinHere && { borderColor: '#b91c1c', borderWidth: 2 }]}
                onPress={() => onChange(value === key ? '' : key)}>
                <Text style={[s.grid3CellText, isSelected && s.gridCellTextSelected]}>
                  {isSelected ? (markerType === 'pin' ? '🚩' : '🎯') : isPinHere ? '🚩' : label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  // 5x5 green result grid
  const Grid5x5 = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
    <View style={s.grid5x5}>
      {GRID_5X5.map((row, ri) => (
        <View key={ri} style={s.gridRow}>
          {row.map((cell, ci) => {
            const isSelected = value === cell.key;
            return (
              <TouchableOpacity key={`${ri}-${ci}`}
                style={[
                  s.grid5Cell,
                  cell.onGreen ? s.grid5OnGreen : s.grid5OffGreen,
                  isSelected && s.gridCellSelected,
                ]}
                onPress={() => onChange(value === cell.key ? '' : cell.key)}>
                <Text style={[
                  s.grid5CellText,
                  cell.onGreen ? s.grid5OnGreenText : s.grid5OffGreenText,
                  isSelected && s.gridCellTextSelected,
                ]}>{cell.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );

  // Per-shot section for advanced mode
  // Determine if a shot is a putt based on previous shot's result
  const isPuttShot = (holeIdx: number, shotIdx: number): boolean => {
    const entry = holeEntries[holeIdx];
    if (!entry) return false;
    // If putts are recorded and this shot is within the last N shots (where N = putts)
    const totalShots = entry.shots.length;
    const puttsCount = entry.putts;
    if (puttsCount > 0 && shotIdx >= totalShots - puttsCount) return true;
    // If previous shot landed on Green, this is a putt
    if (shotIdx > 0) {
      const prevShot = entry.shots[shotIdx - 1];
      if (prevShot?.result_lie === 'Green') return true;
    }
    // Also check if manually flagged
    return entry.shots[shotIdx]?.is_putt ?? false;
  };

  const renderPuttSection = (holeIdx: number, shotIdx: number) => {
    const entry = holeEntries[holeIdx];
    const shot = entry?.shots[shotIdx];
    if (!shot) return null;
    const puttNum = (() => {
      let count = 0;
      for (let i = 0; i <= shotIdx; i++) {
        if (isPuttShot(holeIdx, i)) count++;
      }
      return count;
    })();
    const sectionKey = `shot-${holeIdx}-${shotIdx}`;
    const isOpen = expandedShots[sectionKey] ?? (shotIdx === 0);
    const resultLabel = PUTT_RESULTS.find(r => r.key === shot.putt_result)?.label || '';
    const summary = [shot.putt_distance ? `${shot.putt_distance}ft` : '', shot.putt_break || '', resultLabel].filter(Boolean).join(' · ');

    return (
      <View key={shotIdx} style={s.section}>
        <TouchableOpacity style={s.sectionHeader} onPress={() => toggleShotExpanded(sectionKey)}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>🏌️ Putt {puttNum}{summary ? `: ${summary}` : ''}</Text>
          </View>
          <Text style={s.sectionArrow}>{isOpen ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={s.sectionBody}>
            <Text style={s.formLabel}>Distance (feet)</Text>
            <TextInput style={s.input}
              value={shot.putt_distance || ''}
              onChangeText={v => updateShot(holeIdx, shotIdx, 'putt_distance', v)}
              keyboardType="number-pad" placeholder="15" placeholderTextColor={colors.gray} />

            <Text style={s.formLabel}>Break</Text>
            <PillRow options={PUTT_BREAKS} value={shot.putt_break || ''} onChange={v => updateShot(holeIdx, shotIdx, 'putt_break', v)} wrap />

            <Text style={s.formLabel}>Break Amount</Text>
            <PillRow options={PUTT_BREAK_AMOUNTS} value={shot.putt_break_amount || ''} onChange={v => updateShot(holeIdx, shotIdx, 'putt_break_amount', v)} />

            <Text style={s.formLabel}>Slope</Text>
            <PillRow options={PUTT_SLOPES} value={shot.putt_slope || ''} onChange={v => updateShot(holeIdx, shotIdx, 'putt_slope', v)} />

            <Text style={s.formLabel}>Result</Text>
            {(() => {
              const PUTT_GRID: { key: string; label: string }[][] = [
                [{ key: 'miss-long-left', label: 'Long L' }, { key: 'miss-long', label: 'Long' }, { key: 'miss-long-right', label: 'Long R' }],
                [{ key: 'miss-left', label: 'Left' }, { key: 'made', label: 'Made ✓' }, { key: 'miss-right', label: 'Right' }],
                [{ key: 'miss-short-left', label: 'Short L' }, { key: 'miss-short', label: 'Short' }, { key: 'miss-short-right', label: 'Short R' }],
              ];
              return (
                <View style={{ gap: 4 }}>
                  {PUTT_GRID.map((row, ri) => (
                    <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
                      {row.map(cell => {
                        const selected = shot.putt_result === cell.key;
                        const isMade = cell.key === 'made';
                        return (
                          <TouchableOpacity key={cell.key}
                            style={{
                              flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center',
                              backgroundColor: selected ? (isMade ? '#16a34a' : '#dc2626') : '#f3f4f6',
                              borderWidth: 1, borderColor: selected ? (isMade ? '#16a34a' : '#dc2626') : '#d1d5db',
                            }}
                            onPress={() => updateShot(holeIdx, shotIdx, 'putt_result', shot.putt_result === cell.key ? '' : cell.key)}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: selected ? '#fff' : '#374151' }}>{cell.label}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ))}
                </View>
              );
            })()}

            {shot.putt_result && shot.putt_result !== 'made' && (
              <>
                <Text style={s.formLabel}>Distance Remaining (feet)</Text>
                <TextInput style={s.input}
                  value={shot.putt_distance_remaining || ''}
                  onChangeText={v => {
                    updateShot(holeIdx, shotIdx, 'putt_distance_remaining', v);
                    if (v && shotIdx + 1 < holeEntries[holeIdx].shots.length) {
                      updateShot(holeIdx, shotIdx + 1, 'putt_distance', v);
                    }
                  }}
                  keyboardType="number-pad" placeholder="3" placeholderTextColor={colors.gray} />
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  const renderShotSection = (holeIdx: number, shotIdx: number) => {
    // Check if this is a putt
    if (isPuttShot(holeIdx, shotIdx)) {
      return renderPuttSection(holeIdx, shotIdx);
    }

    const shot = holeEntries[holeIdx]?.shots[shotIdx];
    if (!shot) return null;
    const sectionKey = `shot-${holeIdx}-${shotIdx}`;
    const isOpen = expandedShots[sectionKey] ?? (shotIdx === 0);
    const summary = [shot.club, INTENTIONS.find(i => i.key === shot.intention)?.label, shot.result_lie].filter(Boolean).join(' · ');
    const showGreenGrid = shot.intention === 'hit_green' || shot.result_lie === 'Green' || shot.result_lie === 'Fringe';

    return (
      <View key={shotIdx} style={s.section}>
        <TouchableOpacity style={s.sectionHeader} onPress={() => toggleShotExpanded(sectionKey)}>
          <View style={{ flex: 1 }}>
            <Text style={s.sectionTitle}>Shot {shotIdx + 1}{summary ? `: ${summary}` : ''}</Text>
          </View>
          <Text style={s.sectionArrow}>{isOpen ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {isOpen && (
          <View style={s.sectionBody}>
            <Text style={s.formLabel}>Club</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <PillRow options={userBag && userBag.length > 0 ? userBag.filter(c => c !== 'Putter') : CLUBS.filter(c => c !== 'Putter')} value={shot.club} onChange={v => updateShot(holeIdx, shotIdx, 'club', v)} />
            </ScrollView>
            {(!userBag || userBag.length === 0) && <Text style={{ fontSize: 11, color: colors.grayDark, marginTop: 2 }}>Edit your bag in Profile</Text>}

            {shotIdx > 0 && (
              <>
                <Text style={s.formLabel}>Distance (yards)</Text>
                <TextInput style={s.input}
                  value={shot.approach_distance || ''}
                  onChangeText={v => updateShot(holeIdx, shotIdx, 'approach_distance', v)}
                  keyboardType="number-pad" placeholder="150" placeholderTextColor={colors.gray} />
              </>
            )}

            <Text style={s.formLabel}>Intention</Text>
            <View style={[s.pillRow, { flexWrap: 'wrap' }]}>
              {INTENTIONS.map(opt => (
                <TouchableOpacity key={opt.key} style={[s.pill, shot.intention === opt.key && s.pillActive]}
                  onPress={() => updateShot(holeIdx, shotIdx, 'intention', shot.intention === opt.key ? '' : opt.key)}>
                  <Text style={[s.pillText, shot.intention === opt.key && s.pillTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {shot.intention === 'lay_up' && (
              <>
                <Text style={s.formLabel}>Target Distance (yards)</Text>
                <TextInput style={s.input}
                  value={shot.layup_target_distance ? String(shot.layup_target_distance) : ''}
                  onChangeText={v => updateShot(holeIdx, shotIdx, 'layup_target_distance', parseInt(v) || 0)}
                  keyboardType="number-pad" placeholder="100" placeholderTextColor={colors.gray} />
              </>
            )}

            {shot.intention === 'hit_green' && (
              <>
                <Text style={s.formLabel}>Where was the pin from your position?</Text>
                <Grid3x3 value={shot.pin_position || ''} onChange={v => updateShot(holeIdx, shotIdx, 'pin_position', v)} markerType="pin" />
                <Text style={s.formLabel}>Where did you aim?</Text>
                <Grid3x3 value={shot.aim_point || ''} onChange={v => updateShot(holeIdx, shotIdx, 'aim_point', v)} markerType="aim" pinValue={shot.pin_position} />
              </>
            )}

            <Text style={s.formLabel}>Intended Shot Shape</Text>
            <PillRow options={SHOT_SHAPES} value={shot.shot_shape} onChange={v => updateShot(holeIdx, shotIdx, 'shot_shape', v)} wrap />

            <Text style={s.formLabel}>Result — Where Did You End Up?</Text>
            <PillRow options={RESULT_LIES} value={shot.result_lie} onChange={v => updateShot(holeIdx, shotIdx, 'result_lie', v)} wrap />

            <Text style={s.formLabel}>Miss Direction</Text>
            <PillRow options={MISS_DIRECTIONS} value={shot.miss_direction} onChange={v => updateShot(holeIdx, shotIdx, 'miss_direction', v)} wrap />

            {showGreenGrid && (
              <>
                <Text style={s.formLabel}>Green Position</Text>
                <Text style={{ fontSize: 11, color: colors.grayDark, marginBottom: 6 }}>Inner = on green, outer = missed in that direction</Text>
                <Grid5x5 value={shot.green_position || ''} onChange={v => updateShot(holeIdx, shotIdx, 'green_position', v)} />
              </>
            )}
          </View>
        )}
      </View>
    );
  };

  // Advanced mode: render all shots
  const renderAdvancedShots = (holeIdx: number) => {
    const entry = holeEntries[holeIdx];
    if (!entry || entry.score === 0) return (
      <View style={{ marginTop: 16, padding: 14, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.grayLight }}>
        <Text style={{ color: colors.grayDark, textAlign: 'center' }}>Set your score above to track individual shots</Text>
      </View>
    );
    return (
      <View style={{ marginTop: 8 }}>
        {entry.shots.map((_, si) => renderShotSection(holeIdx, si))}
      </View>
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
        {Platform.OS === 'web' && (
          <input
            type="file"
            accept="image/*"
            capture="environment"
            id="scan-scorecard-input"
            style={{ display: 'none' } as any}
            onChange={handleScanScorecard}
          />
        )}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
          <TouchableOpacity
            style={[s.goldBtn, { marginTop: 0, marginBottom: 0, flex: 1 }]}
            onPress={() => { if (Platform.OS === 'web') document.getElementById('scan-scorecard-input')?.click(); }}
            disabled={scanning}
          >
            <Text style={s.goldBtnText}>{scanning ? '⏳ Scanning...' : '📷 Scan Scores'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.goldBtn, { marginTop: 0, marginBottom: 0, flex: 1, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.gold }]}
            onPress={() => { if (Platform.OS === 'web') window.open('https://kathylemke.github.io/sandbagger/scorecard.pdf', '_blank'); }}
          >
            <Text style={[s.goldBtnText, { color: colors.gold }]}>🖨️ Stat Template</Text>
          </TouchableOpacity>
        </View>
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

  // Back arrow header component
  const BackArrow = ({ onPress, label }: { onPress: () => void; label?: string }) => (
    <TouchableOpacity style={s.backArrow} onPress={onPress}>
      <Text style={s.backArrowText}>‹</Text>
      {label && <Text style={s.backArrowLabel}>{label}</Text>}
    </TouchableOpacity>
  );

  // Step 2: Tee selection
  if (step === 2) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <BackArrow onPress={() => setStep(1)} label="Courses" />
        <Text style={s.stepTitle}>Step 2: Select Tees</Text>
        <Text style={s.selectedCourse}>{selectedCourse?.name}</Text>
        <Text style={{ color: colors.grayDark, marginBottom: 16 }}>Choose the tees you played from</Text>
        {teeSets.map(renderTeeCard)}
        <TouchableOpacity style={s.mixedBtn} onPress={selectMixedTees}>
          <Text style={s.mixedBtnText}>🔀 I Played Mixed Tees</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 3: Round details + tracking mode
  if (step === 3) {
    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <BackArrow onPress={() => teeSets.length > 0 ? setStep(2) : setStep(1)} label={teeSets.length > 0 ? 'Tees' : 'Courses'} />
        <Text style={s.stepTitle}>Step 3: Round Details</Text>
        <Text style={s.selectedCourse}>{selectedCourse?.name}</Text>
        {selectedTee && <Text style={s.selectedTeeLabel}>Tees: {selectedTee.name || selectedTee.color} ({selectedTee.total_yardage} yds)</Text>}
        {mixedTees && <Text style={s.selectedTeeLabel}>Mixed Tees</Text>}

        <Text style={s.formLabel}>Round Type</Text>
        <View style={s.visRow}>
          {([['practice', 'Practice 🏋️'], ['tournament', 'Tournament 🏆'], ['casual', 'Casual ⛳']] as const).map(([key, label]) => (
            <TouchableOpacity key={key} style={[s.visBtn, roundType === key && s.visBtnActive]} onPress={() => setRoundType(key)}>
              <Text style={[s.visBtnText, roundType === key && s.visBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.formLabel}>Tracking Mode</Text>
        <View style={s.modeGrid}>
          {TRACKING_MODES.map(m => (
            <TouchableOpacity key={m.key} style={[s.modeCard, trackingMode === m.key && s.modeCardActive]} onPress={() => setTrackingMode(m.key)}>
              <Text style={s.modeEmoji}>{m.emoji}</Text>
              <Text style={[s.modeLabel, trackingMode === m.key && s.modeLabelActive]}>{m.label}</Text>
              <Text style={[s.modeDesc, trackingMode === m.key && s.modeDescActive]}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.formLabel}>Holes Played</Text>
        <View style={s.holeSelRow}>
          {([['all', 'All 18'], ['front9', 'Front 9'], ['back9', 'Back 9'], ['custom', 'Custom']] as const).map(([key, label]) => (
            <TouchableOpacity key={key} style={[s.holeSelPill, holeSelection === key && s.holeSelPillActive]} onPress={() => handleHoleSelectionChange(key)}>
              <Text style={[s.holeSelPillText, holeSelection === key && s.holeSelPillTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {holeSelection === 'custom' && (
          <View style={s.customHoleGrid}>
            {Array.from({ length: holes.length || 18 }, (_, i) => i + 1).map(num => (
              <TouchableOpacity key={num} style={[s.customHoleBtn, selectedHoles.includes(num) && s.customHoleBtnActive]} onPress={() => toggleCustomHole(num)}>
                <Text style={[s.customHoleBtnText, selectedHoles.includes(num) && s.customHoleBtnTextActive]}>{num}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.formLabel}>Track Wedge & In</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity style={[s.toggleBtn, trackWedgeAndIn && s.toggleBtnActive]} onPress={() => setTrackWedgeAndIn(true)}>
            <Text style={[s.toggleBtnText, trackWedgeAndIn && s.toggleBtnTextActive]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, !trackWedgeAndIn && s.toggleBtnActive]} onPress={() => setTrackWedgeAndIn(false)}>
            <Text style={[s.toggleBtnText, !trackWedgeAndIn && s.toggleBtnTextActive]}>No</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.formLabel}>Date</Text>
        <TextInput style={s.input} value={datePlayed} onChangeText={setDatePlayed} placeholder="YYYY-MM-DD" placeholderTextColor={colors.gray} />
        <Text style={s.formLabel}>Weather</Text>
        <PillRow options={WEATHER_OPTIONS} value={weather} onChange={v => setWeather(weather === v ? '' : v)} wrap />
        <Text style={s.formLabel}>Wind</Text>
        <PillRow options={WIND_OPTIONS} value={wind} onChange={v => setWind(wind === v ? '' : v)} wrap />

        <Text style={s.formLabel}>Green Firmness (1 = soft, 5 = firm)</Text>
        <View style={s.visRow}>
          {[1,2,3,4,5].map(n => (
            <TouchableOpacity key={n} style={[s.visBtn, greenFirmness === n && s.visBtnActive]} onPress={() => setGreenFirmness(greenFirmness === n ? 0 : n)}>
              <Text style={[s.visBtnText, greenFirmness === n && s.visBtnTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.formLabel}>Green Speed (stimp, 1-16)</Text>
        <View style={[s.visRow, { flexWrap: 'wrap', gap: 4 }]}>
          {Array.from({length: 16}, (_, i) => i + 1).map(n => (
            <TouchableOpacity key={n} style={[s.visBtn, { minWidth: 36, paddingHorizontal: 6 }, greenSpeed === n && s.visBtnActive]} onPress={() => setGreenSpeed(greenSpeed === n ? 0 : n)}>
              <Text style={[s.visBtnText, greenSpeed === n && s.visBtnTextActive]}>{n}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.formLabel}>Grass Type</Text>
        <PillRow options={GRASS_TYPES} value={grassType} onChange={v => setGrassType(grassType === v ? '' : v)} wrap />

        <Text style={s.formLabel}>Rough Thickness</Text>
        <PillRow options={ROUGH_THICKNESS} value={roughThickness} onChange={v => setRoughThickness(roughThickness === v ? '' : v)} wrap />
        <Text style={s.formLabel}>Visibility</Text>
        <View style={s.visRow}>
          {['private', 'partners', 'public'].map(v => (
            <TouchableOpacity key={v} style={[s.visBtn, visibility === v && s.visBtnActive]} onPress={() => setVisibility(v)}>
              <Text style={[s.visBtnText, visibility === v && s.visBtnTextActive]}>{v.charAt(0).toUpperCase() + v.slice(1)}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={s.goldBtn} onPress={() => { setCurrentHole(0); setStep(4); }}><Text style={s.goldBtnText}>Next: Score Entry →</Text></TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 4: Hole-by-hole
  if (step === 4) {
    const safePos = Math.min(currentHole, activeIndices.length - 1);
    const actualHoleIdx = activeIndices[safePos] ?? 0;
    const entry = holeEntries[actualHoleIdx];
    const hole = holes[actualHoleIdx];
    const holeNum = actualHoleIdx + 1;
    const teeHole = mixedTees && entry.tee_set_id
      ? allTeeHolesData.find(th => th.tee_set_id === entry.tee_set_id && th.hole_number === holeNum)
      : teeHolesData.find(th => th.hole_number === holeNum);
    const yardage = entry.custom_yardage || teeHole?.yardage || hole?.distance_yards;
    const modeInfo = TRACKING_MODES.find(m => m.key === trackingMode);

    return (
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16 }}>
        <BackArrow onPress={() => setStep(3)} label="Round Details" />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={s.stepTitle}>Hole-by-Hole</Text>
          <View style={s.modeBadge}>
            <Text style={s.modeBadgeText}>{modeInfo?.emoji} {modeInfo?.label}</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={s.holeSelector}>
            {activeIndices.map((idx, pos) => (
              <TouchableOpacity key={idx} style={[s.holePill, safePos === pos && s.holePillActive, holeEntries[idx]?.score > 0 && s.holePillDone]}
                onPress={() => { setCurrentHole(pos); setExpandedSection(null); setExpandedShots({}); }}>
                <Text style={[s.holePillText, safePos === pos && s.holePillTextActive]}>{idx + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={s.holeHeader}>
          <Text style={s.holeTitle}>Hole {actualHoleIdx + 1}</Text>
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
                      onPress={() => updateHoleEntry(actualHoleIdx, 'tee_set_id', tee.id)}>
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
              onChangeText={v => updateHoleEntry(actualHoleIdx, 'custom_yardage', parseInt(v) || 0)}
            />
          </View>
        )}

        {/* Basic fields — always shown */}
        <Text style={s.formLabel}>Score</Text>
        <View style={s.counterRow}>
          <TouchableOpacity style={s.counterBtn} onPress={() => entry.score > 0 && updateHoleEntry(actualHoleIdx, 'score', entry.score - 1)}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{entry.score || '—'}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(actualHoleIdx, 'score', entry.score + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {trackWedgeAndIn && (
          <>
            <Text style={s.formLabel}>Wedge & In Shots</Text>
            <View style={s.counterRow}>
              <TouchableOpacity style={s.counterBtn} onPress={() => (entry.wedge_and_in || 0) > 0 && updateHoleEntry(actualHoleIdx, 'wedge_and_in', (entry.wedge_and_in || 0) - 1)}>
                <Text style={s.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={s.counterVal}>{entry.wedge_and_in || 0}</Text>
              <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(actualHoleIdx, 'wedge_and_in', (entry.wedge_and_in || 0) + 1)}>
                <Text style={s.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={s.formLabel}>Putts</Text>
        <View style={s.counterRow}>
          <TouchableOpacity style={s.counterBtn} onPress={() => entry.putts > 0 && updateHoleEntry(actualHoleIdx, 'putts', entry.putts - 1)}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{entry.putts}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(actualHoleIdx, 'putts', entry.putts + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.formLabel}>Fairway Hit</Text>
        <View style={s.toggleRow}>
          {[{ label: 'Yes', val: true }, { label: 'No', val: false }, { label: 'N/A', val: null }].map(opt => (
            <TouchableOpacity key={String(opt.val)} style={[s.toggleBtn, entry.fairway_hit === opt.val && s.toggleBtnActive]}
              onPress={() => updateHoleEntry(actualHoleIdx, 'fairway_hit', opt.val)}>
              <Text style={[s.toggleBtnText, entry.fairway_hit === opt.val && s.toggleBtnTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {entry.fairway_hit === false && (
          <>
            <Text style={s.formLabel}>Miss Direction</Text>
            <View style={s.toggleRow}>
              <TouchableOpacity style={[s.toggleBtn, entry.fairway_miss_dir === 'L' && s.toggleBtnActive]} onPress={() => updateHoleEntry(actualHoleIdx, 'fairway_miss_dir', entry.fairway_miss_dir === 'L' ? null : 'L')}>
                <Text style={[s.toggleBtnText, entry.fairway_miss_dir === 'L' && s.toggleBtnTextActive]}>← L</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.toggleBtn, entry.fairway_miss_dir === 'R' && s.toggleBtnActive]} onPress={() => updateHoleEntry(actualHoleIdx, 'fairway_miss_dir', entry.fairway_miss_dir === 'R' ? null : 'R')}>
                <Text style={[s.toggleBtnText, entry.fairway_miss_dir === 'R' && s.toggleBtnTextActive]}>R →</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <Text style={s.formLabel}>Green in Regulation</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity style={[s.toggleBtn, entry.gir && s.toggleBtnActive]} onPress={() => updateHoleEntry(actualHoleIdx, 'gir', true)}>
            <Text style={[s.toggleBtnText, entry.gir && s.toggleBtnTextActive]}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, !entry.gir && s.toggleBtnActive]} onPress={() => updateHoleEntry(actualHoleIdx, 'gir', false)}>
            <Text style={[s.toggleBtnText, !entry.gir && s.toggleBtnTextActive]}>No</Text>
          </TouchableOpacity>
        </View>


        <Text style={s.formLabel}>Penalties</Text>
        <View style={s.counterRow}>
          <TouchableOpacity style={s.counterBtn} onPress={() => entry.penalties > 0 && updateHoleEntry(actualHoleIdx, 'penalties', entry.penalties - 1)}>
            <Text style={s.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.counterVal}>{entry.penalties}</Text>
          <TouchableOpacity style={s.counterBtn} onPress={() => updateHoleEntry(actualHoleIdx, 'penalties', entry.penalties + 1)}>
            <Text style={s.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Mode-specific fields */}
        {trackingMode === 'advanced' && renderAdvancedShots(actualHoleIdx)}
        {trackingMode === 'strategy' && renderStrategyFields(actualHoleIdx)}
        {trackingMode === 'mental' && renderMentalFields(actualHoleIdx)}

        <View style={s.holeNav}>
          {safePos > 0 && (
            <TouchableOpacity style={s.backBtn} onPress={() => { setCurrentHole(safePos - 1); setExpandedSection(null); setExpandedShots({}); }}>
              <Text style={s.backBtnText}>← Hole {activeIndices[safePos - 1] + 1}</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {safePos < activeIndices.length - 1 ? (
            <TouchableOpacity style={s.goldBtn} onPress={() => { setCurrentHole(safePos + 1); setExpandedSection(null); setExpandedShots({}); }}>
              <Text style={s.goldBtnText}>Hole {activeIndices[safePos + 1] + 1} →</Text>
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
      <BackArrow onPress={() => scannedFromPhoto ? setStep(4) : setStep(4)} label="Edit Holes" />
      {scannedFromPhoto && (
        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B' }}>
          <Text style={{ color: '#92400E', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>📷 Scanned from photo — tap any hole to edit</Text>
        </View>
      )}
      <Text style={s.stepTitle}>Review & Save</Text>
      <Text style={s.selectedCourse}>{selectedCourse?.name}</Text>
      {selectedTee && <Text style={s.selectedTeeLabel}>Tees: {selectedTee.name || selectedTee.color}</Text>}
      {mixedTees && <Text style={s.selectedTeeLabel}>Mixed Tees</Text>}
      <Text style={s.reviewDate}>{datePlayed} · {weather || 'No weather'} · {visibility} · {roundType === 'practice' ? 'Practice 🏋️' : roundType === 'tournament' ? 'Tournament 🏆' : 'Casual ⛳'}</Text>
      <View style={s.modeBadge}>
        <Text style={s.modeBadgeText}>{TRACKING_MODES.find(m => m.key === trackingMode)?.emoji} {TRACKING_MODES.find(m => m.key === trackingMode)?.label} Mode</Text>
      </View>

      {visibility !== 'private' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={s.formLabel}>Caption</Text>
          <TextInput
            style={[s.input, { minHeight: 60 }]}
            value={roundCaption}
            onChangeText={setRoundCaption}
            placeholder="Add a caption to your round..."
            placeholderTextColor={colors.gray}
            multiline
          />
          <Text style={s.formLabel}>Photo</Text>
          {Platform.OS === 'web' && (
            <input
              type="file"
              accept="image/*"
              id="round-photo-input"
              style={{ display: 'none' } as any}
              onChange={(e: any) => {
                const file = e.target?.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev: any) => setRoundPhoto(ev.target?.result as string);
                reader.readAsDataURL(file);
              }}
            />
          )}
          {!roundPhoto ? (
            <TouchableOpacity
              style={{ backgroundColor: colors.gold, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, alignSelf: 'flex-start' }}
              onPress={() => {
                if (Platform.OS === 'web') {
                  document.getElementById('round-photo-input')?.click();
                }
              }}
            >
              <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 14 }}>📷 Add Photo</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ position: 'relative', alignSelf: 'flex-start' }}>
              <img src={roundPhoto} style={{ width: 120, height: 120, borderRadius: 10, objectFit: 'cover' } as any} />
              <TouchableOpacity
                style={{ position: 'absolute', top: -8, right: -8, backgroundColor: colors.red, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => setRoundPhoto(null)}
              >
                <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

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

      {/* Summary Stats */}
      {(() => {
        const fwHoles = activeIndices.filter(i => holeEntries[i]?.fairway_hit !== null);
        const fwHit = fwHoles.filter(i => holeEntries[i]?.fairway_hit === true).length;
        const girHit = activeIndices.filter(i => holeEntries[i]?.gir).length;
        const totalWedge = trackWedgeAndIn ? activeIndices.reduce((s, i) => s + (holeEntries[i]?.wedge_and_in || 0), 0) : 0;
        return (
          <View style={s.summaryPills}>
            <View style={s.summaryPill}><Text style={s.summaryPillLabel}>FW</Text><Text style={s.summaryPillValue}>{fwHit}/{fwHoles.length}</Text></View>
            <View style={s.summaryPill}><Text style={s.summaryPillLabel}>GIR</Text><Text style={s.summaryPillValue}>{girHit}/{activeIndices.length}</Text></View>
            <View style={s.summaryPill}><Text style={s.summaryPillLabel}>Putts</Text><Text style={s.summaryPillValue}>{totalPutts}</Text></View>
            {trackWedgeAndIn && <View style={s.summaryPill}><Text style={s.summaryPillLabel}>W&I</Text><Text style={s.summaryPillValue}>{totalWedge}</Text></View>}
          </View>
        );
      })()}

      <View style={s.reviewTable}>
        <View style={s.reviewHeaderRow}>
          <Text style={[s.reviewCell, s.reviewHeaderText, { flex: 0.5 }]}>Hole</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>Par</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>Score</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>Putts</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>FW</Text>
          <Text style={[s.reviewCell, s.reviewHeaderText]}>GIR</Text>
          {trackWedgeAndIn && <Text style={[s.reviewCell, s.reviewHeaderText]}>W&I</Text>}
        </View>
        {activeIndices.map((i, pos) => {
          const e = holeEntries[i];
          return (
            <TouchableOpacity key={i} style={s.reviewRow} onPress={() => { setCurrentHole(pos); setStep(4); }}>
              <Text style={[s.reviewCell, { flex: 0.5 }]}>{i + 1}</Text>
              <Text style={s.reviewCell}>{holes[i]?.par || '—'}</Text>
              <View style={[{ flex: 1, alignItems: 'center' }]}>
                <ScoreCell score={e.score} par={holes[i]?.par || 0} size={14} />
              </View>
              <Text style={s.reviewCell}>{e.putts || '—'}</Text>
              <Text style={s.reviewCell}>{e.fairway_hit === null ? '—' : e.fairway_hit ? '✓' : '✗'}</Text>
              <Text style={s.reviewCell}>{e.gir ? '✓' : '✗'}</Text>
              {trackWedgeAndIn && <Text style={s.reviewCell}>{e.wedge_and_in === null ? '—' : e.wedge_and_in}</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity style={[s.goldBtn, saving && { opacity: 0.6 }]} onPress={saveRound} disabled={saving}>
        <Text style={s.goldBtnText}>{saving ? 'Saving...' : '✓ Save Round'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  backArrow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' },
  backArrowText: { fontSize: 28, fontWeight: '300', color: colors.gold, marginRight: 4, lineHeight: 32 },
  backArrowLabel: { fontSize: 15, fontWeight: '600', color: colors.gold },
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
  summaryPills: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  summaryPill: { flex: 1, minWidth: 70, backgroundColor: colors.primaryDark, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  summaryPillLabel: { fontSize: 11, color: colors.grayLight, fontWeight: '600' },
  summaryPillValue: { fontSize: 18, fontWeight: '800', color: colors.gold, marginTop: 2 },
  reviewTable: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden' },
  reviewHeaderRow: { flexDirection: 'row', backgroundColor: colors.primary, padding: 10 },
  reviewHeaderText: { color: colors.white, fontWeight: '700' },
  reviewRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  reviewCell: { flex: 1, textAlign: 'center', fontSize: 14 },
  reviewScore: { fontWeight: '700' },
  under: { color: colors.green },
  over: { color: colors.red },
  holeSelRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  holeSelPill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: colors.grayLight, alignItems: 'center', backgroundColor: colors.white },
  holeSelPillActive: { backgroundColor: colors.primary, borderColor: colors.gold },
  holeSelPillText: { fontSize: 13, fontWeight: '700', color: colors.grayDark },
  holeSelPillTextActive: { color: colors.gold },
  customHoleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8, marginTop: 4 },
  customHoleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.grayLight, alignItems: 'center', justifyContent: 'center' },
  customHoleBtnActive: { backgroundColor: colors.primary, borderColor: colors.gold },
  customHoleBtnText: { fontSize: 15, fontWeight: '700', color: colors.grayDark },
  customHoleBtnTextActive: { color: colors.gold },
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
  pillRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  pill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight },
  pillActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillMade: { backgroundColor: colors.green, borderColor: colors.green },
  pillText: { fontSize: 13, fontWeight: '600', color: colors.grayDark },
  pillTextActive: { color: colors.white },
  scaleRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  scaleBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLight, alignItems: 'center', justifyContent: 'center' },
  scaleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  scaleBtnText: { fontSize: 16, fontWeight: '700', color: colors.grayDark },
  scaleBtnTextActive: { color: colors.gold },
  section: { backgroundColor: colors.white, borderRadius: 12, marginTop: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: colors.primaryDark },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gold, flex: 1 },
  sectionArrow: { fontSize: 16, color: colors.gold },
  sectionBody: { padding: 14 },
  // 3x3 grid
  grid3x3: { alignSelf: 'center', borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  gridRow: { flexDirection: 'row' },
  grid3Cell: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight, borderWidth: 0.5, borderColor: colors.primary },
  grid3CellText: { fontSize: 12, fontWeight: '700', color: colors.white },
  gridCellSelected: { backgroundColor: colors.gold, borderColor: colors.gold, borderWidth: 2 },
  gridCellTextSelected: { color: colors.primaryDark, fontWeight: '800' },
  // 5x5 grid
  grid5x5: { alignSelf: 'center', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  grid5Cell: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 0.5, borderColor: colors.grayLight },
  grid5OnGreen: { backgroundColor: colors.primaryLight },
  grid5OffGreen: { backgroundColor: colors.offWhite },
  grid5CellText: { fontSize: 12, fontWeight: '700' },
  grid5OnGreenText: { color: colors.white },
  grid5OffGreenText: { color: colors.grayDark },
});
