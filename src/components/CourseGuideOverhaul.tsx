import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, Animated } from 'react-native';
import { colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { getHoleDetails, CourseMetadata, HoleDetail } from '../lib/holeMetadata';
import HoleDrawing from './HoleDrawing';

interface TeeSet {
  id: string;
  course_id: string;
  color: string;
  name: string;
  total_yardage: number;
  total_par: number;
  rating: number;
  slope: number;
}

interface TeeHole {
  id: string;
  tee_set_id: string;
  hole_number: number;
  yardage: number;
  par: number;
  handicap_index: number;
}

interface Props {
  courseId: string;
  courseName: string;
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function CourseGuideOverhaul({ courseId, courseName, visible, onClose }: Props) {
  const [metadata, setMetadata] = useState<CourseMetadata>({});
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [selectedTee, setSelectedTee] = useState<TeeSet | null>(null);
  const [teeHoles, setTeeHoles] = useState<TeeHole[]>([]);
  const [currentHole, setCurrentHole] = useState(1);
  const [showGreenView, setShowGreenView] = useState(false);
  const [viewMode, setViewMode] = useState<'flip' | 'list'>('flip');
  const scrollRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadData();
    }
  }, [visible, courseId]);

  const loadData = async () => {
    // Load hole metadata
    const data = await getHoleDetails(courseId);
    setMetadata(data);

    // Load tee sets
    const { data: sets } = await supabase
      .from('sb_tee_sets')
      .select('*')
      .eq('course_id', courseId)
      .order('total_yardage', { ascending: false });
    
    if (sets && sets.length > 0) {
      setTeeSets(sets);
      setSelectedTee(sets[0]);
      
      // Load tee hole data for first tee
      const { data: holes } = await supabase
        .from('sb_tee_holes')
        .select('*')
        .eq('tee_set_id', sets[0].id)
        .order('hole_number');
      setTeeHoles(holes || []);
    }
  };

  const selectTee = async (tee: TeeSet) => {
    setSelectedTee(tee);
    const { data: holes } = await supabase
      .from('sb_tee_holes')
      .select('*')
      .eq('tee_set_id', tee.id)
      .order('hole_number');
    setTeeHoles(holes || []);
  };

  const goToHole = (holeNum: number) => {
    setCurrentHole(holeNum);
    setShowGreenView(false);
    
    // Animate transition
    Animated.spring(slideAnim, {
      toValue: holeNum,
      useNativeDriver: true,
      tension: 50,
      friction: 10,
    }).start();
  };

  const nextHole = () => {
    if (currentHole < 18) goToHole(currentHole + 1);
  };

  const prevHole = () => {
    if (currentHole > 1) goToHole(currentHole - 1);
  };

  const getHoleInfo = (holeNum: number) => {
    const teeHole = teeHoles.find(h => h.hole_number === holeNum);
    return {
      hole_number: holeNum,
      par: teeHole?.par || 4,
      yardage: teeHole?.yardage || 400,
      handicap_index: teeHole?.handicap_index,
    };
  };

  const getHoleMetadata = (holeNum: number): HoleDetail => {
    return metadata[String(holeNum)] || {
      shape: 'straight',
      green_shape: 'oval',
      fairway_width: '30-50 yds',
      elevation_change: 'flat',
      hazards: [],
      notes: '',
    };
  };

  const getTeeColor = (tee: TeeSet): string => {
    const colorMap: Record<string, string> = {
      black: '#222',
      blue: '#2563eb',
      white: '#e5e7eb',
      gold: '#d4a017',
      red: '#dc2626',
      green: '#16a34a',
      silver: '#9ca3af',
    };
    return colorMap[tee.color?.toLowerCase()] || colors.grayDark;
  };

  // Flip-through view
  const renderFlipView = () => {
    const holeInfo = getHoleInfo(currentHole);
    const holeMeta = getHoleMetadata(currentHole);

    return (
      <View style={s.flipContainer}>
        {/* Hole selector strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.holeSelectorStrip}
          contentContainerStyle={{ paddingHorizontal: 8 }}
        >
          {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
            <TouchableOpacity
              key={num}
              style={[s.holePill, currentHole === num && s.holePillActive]}
              onPress={() => goToHole(num)}
            >
              <Text style={[s.holePillText, currentHole === num && s.holePillTextActive]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Hole drawing */}
        <View style={s.drawingContainer}>
          <HoleDrawing
            hole={holeInfo}
            metadata={holeMeta}
            showGreenView={showGreenView}
            onToggleView={() => setShowGreenView(!showGreenView)}
          />
        </View>

        {/* Navigation arrows */}
        <View style={s.navArrows}>
          <TouchableOpacity
            style={[s.navBtn, currentHole === 1 && s.navBtnDisabled]}
            onPress={prevHole}
            disabled={currentHole === 1}
          >
            <Text style={[s.navBtnText, currentHole === 1 && s.navBtnTextDisabled]}>‹ Hole {currentHole - 1}</Text>
          </TouchableOpacity>
          
          <View style={s.holeIndicator}>
            <Text style={s.holeIndicatorText}>{currentHole} / 18</Text>
          </View>
          
          <TouchableOpacity
            style={[s.navBtn, currentHole === 18 && s.navBtnDisabled]}
            onPress={nextHole}
            disabled={currentHole === 18}
          >
            <Text style={[s.navBtnText, currentHole === 18 && s.navBtnTextDisabled]}>Hole {currentHole + 1} ›</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // List view
  const renderListView = () => (
    <ScrollView style={s.listContainer} contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {Array.from({ length: 18 }, (_, i) => i + 1).map(num => {
        const holeInfo = getHoleInfo(num);
        const holeMeta = getHoleMetadata(num);
        
        return (
          <TouchableOpacity
            key={num}
            style={s.listCard}
            onPress={() => {
              setCurrentHole(num);
              setViewMode('flip');
            }}
          >
            <View style={s.listCardHeader}>
              <View style={s.listHoleNum}>
                <Text style={s.listHoleNumText}>{num}</Text>
              </View>
              <View style={s.listHoleInfo}>
                <Text style={s.listParText}>Par {holeInfo.par}</Text>
                <Text style={s.listYardageText}>{holeInfo.yardage} yds</Text>
                {holeInfo.handicap_index && (
                  <Text style={s.listHcpText}>Hcp {holeInfo.handicap_index}</Text>
                )}
              </View>
              <View style={s.listTags}>
                <View style={s.listTag}>
                  <Text style={s.listTagText}>{holeMeta.shape?.replace(/_/g, ' ') || 'Straight'}</Text>
                </View>
                {holeMeta.elevation_change && holeMeta.elevation_change !== 'flat' && (
                  <View style={s.listTag}>
                    <Text style={s.listTagText}>{holeMeta.elevation_change}</Text>
                  </View>
                )}
              </View>
              <Text style={s.listChevron}>›</Text>
            </View>
            {holeMeta.notes && (
              <Text style={s.listNotes}>{holeMeta.notes}</Text>
            )}
            {holeMeta.hazards.length > 0 && (
              <View style={s.listHazards}>
                {holeMeta.hazards.slice(0, 3).map((h, i) => (
                  <Text key={i} style={s.listHazardText}>
                    {h.type === 'water' ? '💧' : h.type === 'fairway_bunker' || h.type === 'greenside_bunker' ? '⛱️' : h.type === 'trees' ? '🌲' : '⚠️'}
                    {' '}{h.location?.replace(/_/g, ' ')}
                  </Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>📋 Course Guide</Text>
              <Text style={s.subtitle}>{courseName}</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tee selector */}
          {teeSets.length > 0 && (
            <View style={s.teeSelector}>
              <Text style={s.teeSelectorLabel}>Playing from:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {teeSets.map(tee => {
                  const isSelected = selectedTee?.id === tee.id;
                  const teeColor = getTeeColor(tee);
                  const needsBorder = ['white', 'silver'].includes(tee.color?.toLowerCase());
                  
                  return (
                    <TouchableOpacity
                      key={tee.id}
                      style={[s.teePill, isSelected && { borderColor: colors.gold, borderWidth: 2 }]}
                      onPress={() => selectTee(tee)}
                    >
                      <View style={[
                        s.teeDot,
                        { backgroundColor: teeColor },
                        needsBorder && { borderWidth: 1, borderColor: colors.grayLight }
                      ]} />
                      <View>
                        <Text style={[s.teePillName, isSelected && { color: colors.gold }]}>{tee.name || tee.color}</Text>
                        <Text style={s.teePillYardage}>{tee.total_yardage} yds</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* View mode toggle */}
          <View style={s.viewModeToggle}>
            <TouchableOpacity
              style={[s.viewModeBtn, viewMode === 'flip' && s.viewModeBtnActive]}
              onPress={() => setViewMode('flip')}
            >
              <Text style={[s.viewModeBtnText, viewMode === 'flip' && s.viewModeBtnTextActive]}>🎴 Flip Through</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.viewModeBtn, viewMode === 'list' && s.viewModeBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <Text style={[s.viewModeBtnText, viewMode === 'list' && s.viewModeBtnTextActive]}>📋 All Holes</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={{ flex: 1 }}>
            {viewMode === 'flip' ? renderFlipView() : renderListView()}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.offWhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%', flex: 1 },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: colors.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.gold },
  subtitle: { fontSize: 14, color: colors.white, opacity: 0.9, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 18, color: colors.white, fontWeight: '700' },
  
  teeSelector: { padding: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  teeSelectorLabel: { fontSize: 12, fontWeight: '600', color: colors.grayDark, marginBottom: 8 },
  teePill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 10, backgroundColor: colors.offWhite, borderRadius: 12, borderWidth: 1, borderColor: colors.grayLight },
  teeDot: { width: 16, height: 16, borderRadius: 8 },
  teePillName: { fontSize: 13, fontWeight: '700', color: colors.primary },
  teePillYardage: { fontSize: 11, color: colors.grayDark },
  
  viewModeToggle: { flexDirection: 'row', padding: 12, gap: 8 },
  viewModeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', borderWidth: 1, borderColor: colors.grayLight },
  viewModeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  viewModeBtnText: { fontSize: 13, fontWeight: '600', color: colors.grayDark },
  viewModeBtnTextActive: { color: colors.gold },
  
  // Flip view
  flipContainer: { flex: 1 },
  holeSelectorStrip: { maxHeight: 50, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  holePill: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.offWhite, alignItems: 'center', justifyContent: 'center', marginHorizontal: 4, marginVertical: 7 },
  holePillActive: { backgroundColor: colors.primary },
  holePillText: { fontSize: 14, fontWeight: '700', color: colors.grayDark },
  holePillTextActive: { color: colors.gold },
  
  drawingContainer: { flex: 1, padding: 16, justifyContent: 'center' },
  
  navArrows: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.grayLight },
  navBtn: { paddingVertical: 10, paddingHorizontal: 16, backgroundColor: colors.primary, borderRadius: 10 },
  navBtnDisabled: { backgroundColor: colors.grayLight },
  navBtnText: { fontSize: 14, fontWeight: '600', color: colors.gold },
  navBtnTextDisabled: { color: colors.gray },
  holeIndicator: { backgroundColor: colors.offWhite, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  holeIndicatorText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  
  // List view
  listContainer: { flex: 1 },
  listCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.grayLight },
  listCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  listHoleNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  listHoleNumText: { fontSize: 16, fontWeight: '800', color: colors.gold },
  listHoleInfo: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  listParText: { fontSize: 14, fontWeight: '700', color: colors.gold, backgroundColor: colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  listYardageText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  listHcpText: { fontSize: 12, color: colors.grayDark },
  listTags: { flex: 1, flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  listTag: { backgroundColor: colors.offWhite, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  listTagText: { fontSize: 10, color: colors.grayDark, textTransform: 'capitalize' },
  listChevron: { fontSize: 24, color: colors.gray },
  listNotes: { fontSize: 12, color: colors.grayDark, marginTop: 8, fontStyle: 'italic', paddingLeft: 48 },
  listHazards: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, paddingLeft: 48 },
  listHazardText: { fontSize: 11, color: colors.grayDark },
});
