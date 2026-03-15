import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions } from 'react-native';
import { colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import { getHoleDetails, CourseMetadata, HoleDetail } from '../lib/holeMetadata';
import { useDistanceUnit, formatDistance } from '../lib/distanceUnits';
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

// Page types: each hole gets 2 pages (hole overview + green detail)
// Total: 36 pages for 18 holes
type PageInfo = { holeNum: number; type: 'hole' | 'green' };

function buildPages(): PageInfo[] {
  const pages: PageInfo[] = [];
  for (let i = 1; i <= 18; i++) {
    pages.push({ holeNum: i, type: 'hole' });
    pages.push({ holeNum: i, type: 'green' });
  }
  return pages;
}

export default function CourseGuideOverhaul({ courseId, courseName, visible, onClose }: Props) {
  const [metadata, setMetadata] = useState<CourseMetadata>({});
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [selectedTee, setSelectedTee] = useState<TeeSet | null>(null);
  const [teeHoles, setTeeHoles] = useState<TeeHole[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const { unit: distanceUnit } = useDistanceUnit();
  
  const pages = buildPages();

  useEffect(() => {
    if (visible) loadData();
  }, [visible, courseId]);

  const loadData = async () => {
    const data = await getHoleDetails(courseId);
    setMetadata(data);

    const { data: sets } = await supabase
      .from('sb_tee_sets')
      .select('*')
      .eq('course_id', courseId)
      .order('total_yardage', { ascending: false });
    
    if (sets && sets.length > 0) {
      setTeeSets(sets);
      setSelectedTee(sets[0]);
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

  const goToPage = (idx: number) => {
    setCurrentPage(idx);
  };

  const goToHole = (holeNum: number) => {
    // Jump to the hole overview page (index = (holeNum - 1) * 2)
    goToPage((holeNum - 1) * 2);
  };

  const nextPage = () => {
    if (currentPage < pages.length - 1) goToPage(currentPage + 1);
  };
  const prevPage = () => {
    if (currentPage > 0) goToPage(currentPage - 1);
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

  const getHoleMeta = (holeNum: number): HoleDetail =>
    metadata[String(holeNum)] || { shape: 'straight', green_shape: 'oval', fairway_width: '30-50 yds', elevation_change: 'flat', hazards: [], notes: '' };

  const currentPageInfo = pages[currentPage];
  const currentHoleNum = currentPageInfo?.holeNum || 1;
  const isGreenPage = currentPageInfo?.type === 'green';

  const getTeeColor = (tee: TeeSet): string => {
    const map: Record<string, string> = {
      black: '#222', blue: '#2563eb', white: '#e5e7eb', gold: '#d4a017',
      red: '#dc2626', green: '#16a34a', silver: '#9ca3af',
    };
    return map[tee.color?.toLowerCase()] || colors.grayDark;
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          {/* Header */}
          <View style={s.header}>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>YARDAGE BOOK</Text>
              <Text style={s.subtitle}>{courseName}</Text>
            </View>
            <TouchableOpacity style={s.closeBtn} onPress={onClose}>
              <Text style={s.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tee selector */}
          {teeSets.length > 0 && (
            <View style={s.teeSelector}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {teeSets.map(tee => {
                  const isSelected = selectedTee?.id === tee.id;
                  return (
                    <TouchableOpacity
                      key={tee.id}
                      style={[s.teePill, isSelected && s.teePillActive]}
                      onPress={() => selectTee(tee)}
                    >
                      <View style={[s.teeDot, { backgroundColor: getTeeColor(tee) }]} />
                      <Text style={[s.teeText, isSelected && s.teeTextActive]}>
                        {tee.name || tee.color} ({formatDistance(tee.total_yardage, distanceUnit)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Hole jump strip */}
          <View style={s.holeStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 6 }}>
              {Array.from({ length: 18 }, (_, i) => i + 1).map(num => (
                <TouchableOpacity
                  key={num}
                  style={[s.holePill, currentHoleNum === num && s.holePillActive]}
                  onPress={() => goToHole(num)}
                >
                  <Text style={[s.holePillText, currentHoleNum === num && s.holePillTextActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Current page */}
          <View style={s.pageContainer}>
            <HoleDrawing
              hole={getHoleInfo(currentHoleNum)}
              metadata={getHoleMeta(currentHoleNum)}
              page={isGreenPage ? 'green' : 'hole'}
            />
          </View>

          {/* Page indicator */}
          <View style={s.pageIndicator}>
            <Text style={s.pageIndicatorText}>
              {isGreenPage ? 'GREEN' : 'HOLE'} {currentHoleNum}
            </Text>
            <Text style={s.pageCount}>
              {currentPage + 1} / {pages.length}
            </Text>
          </View>

          {/* Navigation */}
          <View style={s.nav}>
            <TouchableOpacity
              style={[s.navBtn, currentPage === 0 && s.navBtnDisabled]}
              onPress={prevPage}
              disabled={currentPage === 0}
            >
              <Text style={[s.navBtnText, currentPage === 0 && s.navBtnTextDisabled]}>‹</Text>
            </TouchableOpacity>
            
            <Text style={s.navLabel}>
              {isGreenPage ? 'Tap › for next hole' : 'Tap › for green detail'}
            </Text>
            
            <TouchableOpacity
              style={[s.navBtn, currentPage === pages.length - 1 && s.navBtnDisabled]}
              onPress={nextPage}
              disabled={currentPage === pages.length - 1}
            >
              <Text style={[s.navBtnText, currentPage === pages.length - 1 && s.navBtnTextDisabled]}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#2a2a2a', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%', flex: 1 },
  
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#1a1a1a', borderTopLeftRadius: 20, borderTopRightRadius: 20,
  },
  title: { fontSize: 16, fontWeight: '800', color: '#ffffff', letterSpacing: 3 },
  subtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { fontSize: 16, color: '#999', fontWeight: '700' },
  
  teeSelector: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#1a1a1a' },
  teePill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, marginRight: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#444',
  },
  teePillActive: { borderColor: '#fff', backgroundColor: 'rgba(255,255,255,0.08)' },
  teeDot: { width: 10, height: 10, borderRadius: 5 },
  teeText: { fontSize: 11, color: '#888' },
  teeTextActive: { color: '#fff', fontWeight: '600' },
  
  holeStrip: { backgroundColor: '#222', paddingVertical: 6 },
  holePill: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#333', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 3,
  },
  holePillActive: { backgroundColor: '#fff' },
  holePillText: { fontSize: 12, fontWeight: '700', color: '#888' },
  holePillTextActive: { color: '#222' },
  
  pageContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  
  pageIndicator: { alignItems: 'center', paddingVertical: 4 },
  pageIndicatorText: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 2 },
  pageCount: { fontSize: 9, color: '#666', marginTop: 2 },
  
  nav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#1a1a1a',
  },
  navBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { backgroundColor: '#333' },
  navBtnText: { fontSize: 28, fontWeight: '300', color: '#222', marginTop: -2 },
  navBtnTextDisabled: { color: '#555' },
  navLabel: { fontSize: 11, color: '#666' },
});
