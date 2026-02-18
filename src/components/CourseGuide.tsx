import { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Alert, Platform } from 'react-native';
import { colors } from '../lib/theme';
import { supabase } from '../lib/supabase';
import {
  HoleDetail, HoleHazard, CourseMetadata,
  getHoleDetails, saveHoleDetail, resetHoleDetail,
  SHAPE_OPTIONS, GREEN_SHAPE_OPTIONS, FAIRWAY_WIDTH_OPTIONS, ELEVATION_OPTIONS,
  HAZARD_TYPE_OPTIONS, LOCATION_OPTIONS,
  getShapeIcon, getHazardIcon, getHazardLabel, getLocationLabel,
} from '../lib/holeMetadata';

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

interface HoleData {
  hole_number: number;
  par: number;
  yardage: number;
  tee_set_id: string;
}

const TEE_COLOR_MAP: Record<string, string> = {
  black: '#222',
  blue: '#2563eb',
  white: '#e5e7eb',
  gold: '#d4a017',
  red: '#dc2626',
  green: '#16a34a',
  silver: '#9ca3af',
  orange: '#ea580c',
};

interface Props {
  courseId: string;
  courseName: string;
  visible: boolean;
  onClose: () => void;
}

function OptionPicker({ label, options, value, onChange }: { label: string; options: { value: string; label: string; icon?: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={ps.container}>
      <Text style={ps.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={ps.scroll}>
        {options.map(o => (
          <TouchableOpacity key={o.value} style={[ps.chip, value === o.value && ps.chipActive]} onPress={() => onChange(o.value)}>
            <Text style={[ps.chipText, value === o.value && ps.chipTextActive]}>{o.icon ? `${o.icon} ` : ''}{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const ps = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  scroll: { flexDirection: 'row' },
  chip: { backgroundColor: colors.offWhite, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: colors.grayLight },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.grayDark },
  chipTextActive: { color: colors.gold, fontWeight: '700' },
});

function HazardEditor({ hazard, onChange, onDelete }: { hazard: HoleHazard; onChange: (h: HoleHazard) => void; onDelete: () => void }) {
  return (
    <View style={he.card}>
      <View style={he.header}>
        <Text style={he.icon}>{getHazardIcon(hazard.type)}</Text>
        <Text style={he.title}>{getHazardLabel(hazard.type)}</Text>
        <TouchableOpacity onPress={onDelete}><Text style={he.delete}>✕</Text></TouchableOpacity>
      </View>
      <OptionPicker label="Type" options={HAZARD_TYPE_OPTIONS} value={hazard.type} onChange={v => onChange({ ...hazard, type: v })} />
      <OptionPicker label="Location" options={LOCATION_OPTIONS} value={hazard.location} onChange={v => onChange({ ...hazard, location: v })} />
      <View style={he.row}>
        <View style={he.field}>
          <Text style={he.fieldLabel}>From Tee (yds)</Text>
          <TextInput style={he.input} keyboardType="number-pad" value={hazard.distance_from_tee ? String(hazard.distance_from_tee) : ''} onChangeText={t => onChange({ ...hazard, distance_from_tee: t ? parseInt(t) : undefined })} placeholder="—" placeholderTextColor={colors.gray} />
        </View>
        <View style={he.field}>
          <Text style={he.fieldLabel}>From Green (yds)</Text>
          <TextInput style={he.input} keyboardType="number-pad" value={hazard.distance_from_green ? String(hazard.distance_from_green) : ''} onChangeText={t => onChange({ ...hazard, distance_from_green: t ? parseInt(t) : undefined })} placeholder="—" placeholderTextColor={colors.gray} />
        </View>
        {hazard.type === 'forced_carry' && (
          <View style={he.field}>
            <Text style={he.fieldLabel}>Carry (yds)</Text>
            <TextInput style={he.input} keyboardType="number-pad" value={hazard.carry_distance ? String(hazard.carry_distance) : ''} onChangeText={t => onChange({ ...hazard, carry_distance: t ? parseInt(t) : undefined })} placeholder="—" placeholderTextColor={colors.gray} />
          </View>
        )}
      </View>
      <TextInput style={he.notesInput} value={hazard.notes || ''} onChangeText={t => onChange({ ...hazard, notes: t })} placeholder="Notes..." placeholderTextColor={colors.gray} />
    </View>
  );
}

const he = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.grayLight },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  icon: { fontSize: 18, marginRight: 8 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.primary },
  delete: { fontSize: 18, color: colors.red, fontWeight: '700', padding: 4 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  field: { flex: 1 },
  fieldLabel: { fontSize: 11, color: colors.grayDark, marginBottom: 4 },
  input: { backgroundColor: colors.offWhite, borderRadius: 6, padding: 8, fontSize: 14, borderWidth: 1, borderColor: colors.grayLight },
  notesInput: { backgroundColor: colors.offWhite, borderRadius: 6, padding: 8, fontSize: 13, borderWidth: 1, borderColor: colors.grayLight },
});

function HoleEditModal({ hole, holeNumber, onSave, onCancel, onReset }: { hole: HoleDetail; holeNumber: number; onSave: (h: HoleDetail) => void; onCancel: () => void; onReset: () => void }) {
  const [draft, setDraft] = useState<HoleDetail>({ ...hole, hazards: hole.hazards.map(h => ({ ...h })) });

  const updateHazard = (idx: number, h: HoleHazard) => {
    const haz = [...draft.hazards];
    haz[idx] = h;
    setDraft({ ...draft, hazards: haz });
  };
  const deleteHazard = (idx: number) => {
    setDraft({ ...draft, hazards: draft.hazards.filter((_, i) => i !== idx) });
  };
  const addHazard = () => {
    setDraft({ ...draft, hazards: [...draft.hazards, { type: 'fairway_bunker', location: 'left' }] });
  };

  return (
    <Modal visible animationType="slide" transparent>
      <View style={em.overlay}>
        <View style={em.modal}>
          <View style={em.header}>
            <Text style={em.title}>Hole {holeNumber}</Text>
            {hole.user_modified && (
              <TouchableOpacity onPress={onReset}><Text style={em.resetText}>Reset to Default</Text></TouchableOpacity>
            )}
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <OptionPicker label="Hole Shape" options={SHAPE_OPTIONS} value={draft.shape} onChange={v => setDraft({ ...draft, shape: v })} />
            <OptionPicker label="Green Shape" options={GREEN_SHAPE_OPTIONS} value={draft.green_shape || ''} onChange={v => setDraft({ ...draft, green_shape: v })} />
            <OptionPicker label="Fairway Width" options={FAIRWAY_WIDTH_OPTIONS} value={draft.fairway_width || ''} onChange={v => setDraft({ ...draft, fairway_width: v })} />
            <OptionPicker label="Elevation" options={ELEVATION_OPTIONS} value={draft.elevation_change || ''} onChange={v => setDraft({ ...draft, elevation_change: v })} />
            <View style={{ marginBottom: 12 }}>
              <Text style={ps.label}>Notes</Text>
              <TextInput style={[he.notesInput, { minHeight: 60 }]} multiline value={draft.notes || ''} onChangeText={t => setDraft({ ...draft, notes: t })} placeholder="Hole notes..." placeholderTextColor={colors.gray} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[ps.label, { flex: 1, marginBottom: 0 }]}>Hazards</Text>
              <TouchableOpacity style={em.addBtn} onPress={addHazard}>
                <Text style={em.addBtnText}>+ Add Hazard</Text>
              </TouchableOpacity>
            </View>
            {draft.hazards.map((h, i) => (
              <HazardEditor key={i} hazard={h} onChange={haz => updateHazard(i, haz)} onDelete={() => deleteHazard(i)} />
            ))}
            {draft.hazards.length === 0 && <Text style={{ color: colors.gray, textAlign: 'center', padding: 20 }}>No hazards — tap "Add Hazard" above</Text>}
          </ScrollView>
          <View style={em.footer}>
            <TouchableOpacity style={em.cancelBtn} onPress={onCancel}><Text style={em.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={em.saveBtn} onPress={() => onSave(draft)}><Text style={em.saveText}>Save</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const em = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.cardBg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  title: { fontSize: 20, fontWeight: '800', color: colors.primary, flex: 1 },
  resetText: { fontSize: 13, color: colors.red, fontWeight: '600' },
  footer: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.grayLight },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.offWhite, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '700', color: colors.grayDark },
  saveBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '700', color: colors.gold },
  addBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  addBtnText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
});

export default function CourseGuide({ courseId, courseName, visible, onClose }: Props) {
  const [metadata, setMetadata] = useState<CourseMetadata>({});
  const [editingHole, setEditingHole] = useState<number | null>(null);
  const [teeSets, setTeeSets] = useState<TeeSet[]>([]);
  const [selectedTeeId, setSelectedTeeId] = useState<string | null>(null);
  const [holesData, setHolesData] = useState<HoleData[]>([]);

  const load = useCallback(async () => {
    const data = await getHoleDetails(courseId);
    setMetadata(data);
  }, [courseId]);

  const loadTeeData = useCallback(async () => {
    const { data: sets } = await supabase
      .from('sb_tee_sets')
      .select('*')
      .eq('course_id', courseId)
      .order('total_yardage', { ascending: false });
    if (sets && sets.length > 0) {
      setTeeSets(sets);
      setSelectedTeeId(prev => prev && sets.find((s: TeeSet) => s.id === prev) ? prev : sets[0].id);
    }
    const { data: holes } = await supabase
      .from('sb_holes')
      .select('*')
      .eq('course_id', courseId)
      .order('hole_number');
    if (holes) setHolesData(holes);
  }, [courseId]);

  useEffect(() => { if (visible) { load(); loadTeeData(); } }, [visible, load, loadTeeData]);

  const getHolePar = (holeNum: number): number | null => {
    const h = holesData.find(d => d.hole_number === holeNum && d.tee_set_id === selectedTeeId);
    return h ? h.par : null;
  };

  const getHoleYardage = (holeNum: number): number | null => {
    const h = holesData.find(d => d.hole_number === holeNum && d.tee_set_id === selectedTeeId);
    return h ? h.yardage : null;
  };

  const handleSave = async (holeNumber: number, detail: HoleDetail) => {
    await saveHoleDetail(courseId, holeNumber, detail);
    setEditingHole(null);
    load();
  };

  const handleReset = async (holeNumber: number) => {
    const doReset = () => {
      resetHoleDetail(courseId, holeNumber).then(() => { setEditingHole(null); load(); });
    };
    if (Platform.OS === 'web') { if (confirm('Reset this hole to defaults?')) doReset(); }
    else { Alert.alert('Reset', 'Reset this hole to defaults?', [{ text: 'Cancel' }, { text: 'Reset', style: 'destructive', onPress: doReset }]); }
  };

  const holes = Array.from({ length: 18 }, (_, i) => i + 1);

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={g.overlay}>
        <View style={g.modal}>
          <View style={g.header}>
            <View style={{ flex: 1 }}>
              <Text style={g.title}>📋 Course Guide</Text>
              <Text style={g.subtitle}>{courseName}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            {teeSets.length > 0 && (
              <View style={g.teeSelector}>
                {teeSets.map(tee => {
                  const isSelected = tee.id === selectedTeeId;
                  const bgColor = TEE_COLOR_MAP[tee.color?.toLowerCase()] || colors.grayDark;
                  const textColor = ['white', 'gold', 'silver'].includes(tee.color?.toLowerCase()) ? colors.black : '#fff';
                  return (
                    <TouchableOpacity
                      key={tee.id}
                      style={[g.teePill, { backgroundColor: bgColor }, isSelected && g.teePillSelected]}
                      onPress={() => setSelectedTeeId(tee.id)}
                    >
                      <Text style={[g.teePillText, { color: textColor }]}>{tee.name || tee.color}</Text>
                      <Text style={[g.teePillYds, { color: textColor, opacity: 0.8 }]}>{tee.total_yardage}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            {holes.map(num => {
              const hole = metadata[String(num)];
              if (!hole) return null;
              const shapeOpt = SHAPE_OPTIONS.find(s => s.value === hole.shape);
              const par = getHolePar(num);
              const yardage = getHoleYardage(num);
              return (
                <TouchableOpacity key={num} style={g.holeCard} onPress={() => setEditingHole(num)} activeOpacity={0.7}>
                  <View style={g.holeHeader}>
                    <View style={g.holeNum}><Text style={g.holeNumText}>{num}</Text></View>
                    {par != null && (
                      <View style={g.parBadge}><Text style={g.parBadgeText}>Par {par}</Text></View>
                    )}
                    {yardage != null && (
                      <Text style={g.yardageText}>{yardage} yds</Text>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={g.shapeText}>{shapeOpt?.icon || '⬆️'} {shapeOpt?.label || 'Straight'}</Text>
                        {hole.user_modified && <View style={g.modBadge}><Text style={g.modBadgeText}>Modified</Text></View>}
                      </View>
                      <View style={g.tags}>
                        {hole.elevation_change && (
                          <View style={g.tag}><Text style={g.tagText}>{ELEVATION_OPTIONS.find(e => e.value === hole.elevation_change)?.icon} {hole.elevation_change.replace(/_/g, ' ')}</Text></View>
                        )}
                        {hole.fairway_width && (
                          <View style={g.tag}><Text style={g.tagText}>{FAIRWAY_WIDTH_OPTIONS.find(f => f.value === hole.fairway_width)?.icon} {hole.fairway_width}</Text></View>
                        )}
                        {hole.green_shape && (
                          <View style={g.tag}><Text style={g.tagText}>🟢 {GREEN_SHAPE_OPTIONS.find(gs => gs.value === hole.green_shape)?.label || hole.green_shape}</Text></View>
                        )}
                      </View>
                    </View>
                    <Text style={g.chevron}>›</Text>
                  </View>
                  {hole.notes ? <Text style={g.holeNotes}>{hole.notes}</Text> : null}
                  {hole.hazards.length > 0 && (
                    <View style={g.hazardList}>
                      {hole.hazards.map((h, i) => (
                        <View key={i} style={g.hazardRow}>
                          <Text style={g.hazardIcon}>{getHazardIcon(h.type)}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={g.hazardText}>{getHazardLabel(h.type)} — {getLocationLabel(h.location)}</Text>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {h.distance_from_green && <Text style={g.hazardDist}>{h.distance_from_green} yds to green</Text>}
                              {!h.distance_from_green && h.distance_from_tee && <Text style={g.hazardDist}>{h.distance_from_tee} yds from tee</Text>}
                              {h.distance_from_green && <Text style={g.hazardDist}>{h.distance_from_green} yds from green</Text>}
                              {h.carry_distance && <Text style={g.hazardDist}>Carry: {h.carry_distance} yds</Text>}
                            </View>
                            {h.notes && <Text style={g.hazardNotes}>{h.notes}</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <TouchableOpacity style={g.closeBtn} onPress={onClose}>
            <Text style={g.closeBtnText}>Close</Text>
          </TouchableOpacity>
          {editingHole && metadata[String(editingHole)] && (
            <HoleEditModal
              hole={metadata[String(editingHole)]}
              holeNumber={editingHole}
              onSave={(d) => handleSave(editingHole, d)}
              onCancel={() => setEditingHole(null)}
              onReset={() => handleReset(editingHole)}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const g = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.offWhite, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '92%', flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.grayLight, backgroundColor: colors.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.gold },
  subtitle: { fontSize: 14, color: colors.white, marginTop: 2, opacity: 0.9 },
  holeCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  holeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  holeNum: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  holeNumText: { color: colors.gold, fontWeight: '800', fontSize: 16 },
  shapeText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  modBadge: { backgroundColor: colors.gold, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  modBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  tag: { backgroundColor: colors.offWhite, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 11, color: colors.grayDark, textTransform: 'capitalize' },
  chevron: { fontSize: 24, color: colors.gray },
  holeNotes: { fontSize: 12, color: colors.grayDark, marginTop: 8, fontStyle: 'italic', paddingLeft: 48 },
  hazardList: { marginTop: 10, paddingLeft: 48 },
  hazardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  hazardIcon: { fontSize: 16, marginTop: 1 },
  hazardText: { fontSize: 13, fontWeight: '600', color: colors.black },
  hazardDist: { fontSize: 11, color: colors.grayDark },
  hazardNotes: { fontSize: 11, color: colors.gray, fontStyle: 'italic' },
  closeBtn: { marginHorizontal: 16, marginBottom: 16, backgroundColor: colors.primary, borderRadius: 10, padding: 14, alignItems: 'center' },
  closeBtnText: { color: colors.gold, fontWeight: '700', fontSize: 16 },
});
