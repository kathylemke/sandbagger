import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors, teeColors } from '../../lib/theme';
import CourseGuide from '../../components/CourseGuide';

interface Course { id: string; name: string; city: string; state: string; country: string; num_holes: number; created_at: string; }
interface Hole { id: string; hole_number: number; par: number; distance_yards: number; shape: string; hazards: any[]; notes: string; }
interface TeeSet { id: string; course_id: string; color: string; name: string; total_yardage: number; total_par: number; rating: number; slope: number; }
interface TeeHole { id: string; tee_set_id: string; hole_number: number; yardage: number; par: number; handicap_index: number; }

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Course | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [expandedTee, setExpandedTee] = useState<string | null>(null);
  const [teeHoles, setTeeHoles] = useState<Record<string, TeeHole[]>>({});
  const [showDetail, setShowDetail] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    supabase.from('sb_courses').select('*').order('name').then(({ data }) => setCourses(data || []));
  }, []);

  const filtered = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.city || '').toLowerCase().includes(search.toLowerCase()));

  const viewCourse = async (course: Course) => {
    setSelected(course);
    setExpandedTee(null);
    const [holesRes, teesRes] = await Promise.all([
      supabase.from('sb_holes').select('*').eq('course_id', course.id).order('hole_number'),
      supabase.from('sb_tee_sets').select('*').eq('course_id', course.id).order('total_yardage', { ascending: false }),
    ]);
    setHoles(holesRes.data || []);
    setTeeSets(teesRes.data || []);
    setShowDetail(true);
  };

  const toggleTee = async (teeSet: TeeSet) => {
    if (expandedTee === teeSet.id) { setExpandedTee(null); return; }
    setExpandedTee(teeSet.id);
    if (!teeHoles[teeSet.id]) {
      const { data } = await supabase.from('sb_tee_holes').select('*').eq('tee_set_id', teeSet.id).order('hole_number');
      setTeeHoles(prev => ({ ...prev, [teeSet.id]: data || [] }));
    }
  };

  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const totalYards = holes.reduce((s, h) => s + (h.distance_yards || 0), 0);

  const renderTeeCard = (tee: TeeSet) => {
    const dotColor = teeColors[tee.color] || teeColors[tee.name] || colors.gray;
    const isWhite = tee.color === 'White' || tee.name === 'White';
    const expanded = expandedTee === tee.id;
    const holeData = teeHoles[tee.id] || [];
    const front9 = holeData.filter(h => h.hole_number <= 9);
    const back9 = holeData.filter(h => h.hole_number > 9);

    return (
      <View key={tee.id} style={s.teeCard}>
        <TouchableOpacity style={s.teeCardHeader} onPress={() => toggleTee(tee)}>
          <View style={[s.teeDot, { backgroundColor: dotColor }, isWhite && { borderWidth: 2, borderColor: colors.grayLight }]} />
          <View style={{ flex: 1 }}>
            <Text style={s.teeName}>{tee.name || tee.color}</Text>
            <Text style={s.teeSub}>
              {(tee.total_yardage || 0).toLocaleString()} yds | Par {tee.total_par} | Rating {tee.rating} / Slope {tee.slope}
            </Text>
          </View>
          <Text style={s.teeChevron}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {expanded && holeData.length > 0 && (
          <View style={s.teeScorecard}>
            {[{ label: 'Front 9', data: front9 }, { label: 'Back 9', data: back9 }].map(section => section.data.length > 0 && (
              <View key={section.label} style={{ marginBottom: 8 }}>
                <Text style={s.sectionLabel}>{section.label}</Text>
                <View style={s.scHeader}>
                  <Text style={[s.scCell, s.scHeaderText, { flex: 0.6 }]}>Hole</Text>
                  <Text style={[s.scCell, s.scHeaderText]}>Par</Text>
                  <Text style={[s.scCell, s.scHeaderText]}>Yds</Text>
                  <Text style={[s.scCell, s.scHeaderText]}>Hcp</Text>
                </View>
                {section.data.map(h => (
                  <View key={h.hole_number} style={s.scRow}>
                    <Text style={[s.scCell, { flex: 0.6, fontWeight: '700' }]}>{h.hole_number}</Text>
                    <Text style={s.scCell}>{h.par}</Text>
                    <Text style={s.scCell}>{h.yardage}</Text>
                    <Text style={s.scCell}>{h.handicap_index}</Text>
                  </View>
                ))}
                <View style={[s.scRow, { backgroundColor: colors.offWhite }]}>  
                  <Text style={[s.scCell, { flex: 0.6, fontWeight: '800' }]}>Tot</Text>
                  <Text style={[s.scCell, { fontWeight: '800' }]}>{section.data.reduce((a, h) => a + h.par, 0)}</Text>
                  <Text style={[s.scCell, { fontWeight: '800' }]}>{section.data.reduce((a, h) => a + h.yardage, 0)}</Text>
                  <Text style={s.scCell}>—</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.searchBar}>
        <TextInput style={s.searchInput} placeholder="Search courses..." placeholderTextColor={colors.gray} value={search} onChangeText={setSearch} />
      </View>
      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => viewCourse(item)}>
            <View style={s.cardRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{item.name}</Text>
                <Text style={s.cardLoc}>{item.city}{item.state ? `, ${item.state}` : ''}</Text>
              </View>
              <View style={s.holeBadge}>
                <Text style={s.holeBadgeText}>{item.num_holes}</Text>
                <Text style={s.holeBadgeLabel}>holes</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⛳</Text>
            <Text style={s.emptyText}>No courses found</Text>
            <Text style={s.emptySubtext}>Add a course when logging a round</Text>
          </View>
        }
      />
      <Modal visible={showDetail} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <ScrollView>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{selected?.name}</Text>
                <Text style={s.modalLoc}>{selected?.city}{selected?.state ? `, ${selected.state}` : ''}</Text>
                {holes.length > 0 && (
                  <View style={s.modalStats}>
                    <Text style={s.modalStat}>Par {totalPar}</Text>
                    {totalYards > 0 && <Text style={s.modalStat}>{totalYards.toLocaleString()} yards</Text>}
                  </View>
                )}
              </View>

              {teeSets.length > 0 && (
                <View style={{ padding: 16 }}>
                  <Text style={s.teeSectionTitle}>Tee Sets</Text>
                  {teeSets.map(renderTeeCard)}
                </View>
              )}

              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                <TouchableOpacity style={s.guideBtn} onPress={() => setShowGuide(true)}>
                  <Text style={s.guideBtnIcon}>📋</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.guideBtnText}>Course Guide</Text>
                    <Text style={s.guideBtnSub}>Hole details, hazards & strategy</Text>
                  </View>
                  <Text style={s.teeChevron}>▶</Text>
                </TouchableOpacity>
              </View>

              {holes.length > 0 && (
                <View style={s.holeTable}>
                  <View style={s.holeTableHeader}>
                    <Text style={[s.holeTableCell, s.holeTableHeaderText, { flex: 0.5 }]}>Hole</Text>
                    <Text style={[s.holeTableCell, s.holeTableHeaderText]}>Par</Text>
                    <Text style={[s.holeTableCell, s.holeTableHeaderText]}>Yards</Text>
                    <Text style={[s.holeTableCell, s.holeTableHeaderText, { flex: 1.5 }]}>Shape</Text>
                  </View>
                  {holes.map(h => (
                    <View key={h.id} style={s.holeTableRow}>
                      <Text style={[s.holeTableCell, { flex: 0.5 }]}>{h.hole_number}</Text>
                      <Text style={[s.holeTableCell, { fontWeight: '700' }]}>{h.par}</Text>
                      <Text style={s.holeTableCell}>{h.distance_yards || '—'}</Text>
                      <Text style={[s.holeTableCell, { flex: 1.5 }]}>{h.shape?.replace('_', ' ') || '—'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowDetail(false)}>
              <Text style={s.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {selected && (
        <CourseGuide
          courseId={selected.id}
          courseName={selected.name}
          visible={showGuide}
          onClose={() => setShowGuide(false)}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  searchBar: { padding: 16, paddingBottom: 0 },
  searchInput: { backgroundColor: colors.white, borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: colors.grayLight },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.primary },
  cardLoc: { fontSize: 13, color: colors.grayDark, marginTop: 2 },
  holeBadge: { backgroundColor: colors.primary, borderRadius: 8, padding: 8, alignItems: 'center', minWidth: 50 },
  holeBadgeText: { fontSize: 18, fontWeight: '800', color: colors.gold },
  holeBadgeLabel: { fontSize: 10, color: colors.white, opacity: 0.8 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  emptySubtext: { fontSize: 14, color: colors.gray, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: 32 },
  modalHeader: { padding: 20, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  modalTitle: { fontSize: 22, fontWeight: '800', color: colors.primary },
  modalLoc: { fontSize: 14, color: colors.grayDark, marginTop: 4 },
  modalStats: { flexDirection: 'row', gap: 16, marginTop: 12 },
  modalStat: { fontSize: 15, fontWeight: '700', color: colors.gold, backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  teeSectionTitle: { fontSize: 16, fontWeight: '800', color: colors.primary, marginBottom: 10 },
  teeCard: { backgroundColor: colors.cardBg, borderRadius: 10, marginBottom: 8, overflow: 'hidden' },
  teeCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  teeDot: { width: 24, height: 24, borderRadius: 12 },
  teeName: { fontSize: 15, fontWeight: '700', color: colors.black },
  teeSub: { fontSize: 12, color: colors.grayDark, marginTop: 2 },
  teeChevron: { fontSize: 12, color: colors.gray },
  teeScorecard: { paddingHorizontal: 14, paddingBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, marginBottom: 4 },
  scHeader: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 6, padding: 6 },
  scHeaderText: { color: colors.white, fontWeight: '700', fontSize: 11 },
  scCell: { flex: 1, textAlign: 'center', fontSize: 12 },
  scRow: { flexDirection: 'row', padding: 6, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  holeTable: { margin: 16 },
  holeTableHeader: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 8, padding: 10 },
  holeTableHeaderText: { color: colors.white, fontWeight: '700' },
  holeTableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  holeTableCell: { flex: 1, textAlign: 'center', fontSize: 14 },
  closeBtn: { marginHorizontal: 16, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  closeBtnText: { color: colors.gold, fontWeight: '700', fontSize: 16 },
  guideBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, padding: 16, gap: 12 },
  guideBtnIcon: { fontSize: 24 },
  guideBtnText: { fontSize: 16, fontWeight: '800', color: colors.gold },
  guideBtnSub: { fontSize: 12, color: colors.white, opacity: 0.8, marginTop: 2 },
});
