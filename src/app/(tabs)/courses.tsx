import { useState, useEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { supabase } from '../../lib/supabase';
import { colors } from '../../lib/theme';

interface Course { id: string; name: string; city: string; state: string; country: string; num_holes: number; created_at: string; }
interface Hole { id: string; hole_number: number; par: number; distance_yards: number; shape: string; hazards: any[]; notes: string; }

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Course | null>(null);
  const [holes, setHoles] = useState<Hole[]>([]);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    supabase.from('sb_courses').select('*').order('name').then(({ data }) => setCourses(data || []));
  }, []);

  const filtered = courses.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.city || '').toLowerCase().includes(search.toLowerCase()));

  const viewCourse = async (course: Course) => {
    setSelected(course);
    const { data } = await supabase.from('sb_holes').select('*').eq('course_id', course.id).order('hole_number');
    setHoles(data || []);
    setShowDetail(true);
  };

  const totalPar = holes.reduce((s, h) => s + h.par, 0);
  const totalYards = holes.reduce((s, h) => s + (h.distance_yards || 0), 0);

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
  holeTable: { margin: 16 },
  holeTableHeader: { flexDirection: 'row', backgroundColor: colors.primary, borderRadius: 8, padding: 10 },
  holeTableHeaderText: { color: colors.white, fontWeight: '700' },
  holeTableRow: { flexDirection: 'row', padding: 10, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  holeTableCell: { flex: 1, textAlign: 'center', fontSize: 14 },
  closeBtn: { marginHorizontal: 16, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  closeBtnText: { color: colors.gold, fontWeight: '700', fontSize: 16 },
});
