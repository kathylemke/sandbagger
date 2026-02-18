import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import ScoreCell from '../../components/ScoreCell';

interface FeedRound {
  id: string;
  date_played: string;
  total_score: number;
  weather: string;
  user_id: string;
  visibility: string;
  course: { id: string; name: string; city: string; state: string } | null;
  player: { display_name: string; username: string } | null;
  fairway_pct: number | null;
  gir_pct: number | null;
  avg_putts: number | null;
  birdies: number;
  eagles: number;
  wedge_total: number | null;
}

interface HoleScore {
  id: string;
  round_id: string;
  hole_number: number;
  par?: number;
  score: number;
  putts: number;
  fairway_hit: boolean | null;
  gir: boolean | null;
  penalties: number;
}

function confirmAction(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n${message}`)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
  }
}

export default function Feed() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<FeedRound[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [holeScores, setHoleScores] = useState<HoleScore[]>([]);
  const [loadingScores, setLoadingScores] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editScores, setEditScores] = useState<HoleScore[]>([]);
  const [saving, setSaving] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!user) return;

    // Get people I follow
    const { data: rels } = await supabase.from('sb_relationships')
      .select('target_id')
      .eq('user_id', user.id)
      .eq('type', 'follow')
      .eq('status', 'accepted');

    const followingIds = (rels || []).map(r => r.target_id);
    const visibleUserIds = [user.id, ...followingIds];

    const { data: roundsData } = await supabase.from('sb_rounds')
      .select('*, sb_courses(id, name, city, state)')
      .eq('is_complete', true)
      .in('user_id', visibleUserIds)
      .order('date_played', { ascending: false })
      .limit(50);

    if (!roundsData) { setRounds([]); return; }

    const userIds = [...new Set(roundsData.map(r => r.user_id))];
    const { data: users } = await supabase.from('sb_users')
      .select('id, display_name, username')
      .in('id', userIds);

    const userMap = new Map((users || []).map(u => [u.id, u]));

    const roundIds = roundsData.map(r => r.id);
    const { data: scores } = await supabase.from('sb_hole_scores')
      .select('round_id, fairway_hit, gir, putts, score, par')
      .in('round_id', roundIds);

    const scoresByRound = new Map<string, any[]>();
    (scores || []).forEach(s => {
      if (!scoresByRound.has(s.round_id)) scoresByRound.set(s.round_id, []);
      scoresByRound.get(s.round_id)!.push(s);
    });

    // Also fetch wedge_and_in for totals
    const { data: wedgeScores } = await supabase.from('sb_hole_scores')
      .select('round_id, wedge_and_in')
      .in('round_id', roundIds)
      .not('wedge_and_in', 'is', null);

    const wedgeTotalsByRound = new Map<string, number>();
    (wedgeScores || []).forEach((ws: any) => {
      if (typeof ws.wedge_and_in === 'number') {
        wedgeTotalsByRound.set(ws.round_id, (wedgeTotalsByRound.get(ws.round_id) || 0) + ws.wedge_and_in);
      }
    });

    const feed: FeedRound[] = roundsData
      .map(r => {
        const hs = scoresByRound.get(r.id) || [];
        const fwHoles = hs.filter(h => h.fairway_hit !== null);
        const girHoles = hs.filter(h => h.gir !== null);
        const puttHoles = hs.filter(h => h.putts !== null);
        return {
          id: r.id,
          date_played: r.date_played,
          total_score: r.total_score,
          weather: r.weather,
          user_id: r.user_id,
          visibility: r.visibility,
          course: r.sb_courses,
          player: userMap.get(r.user_id) || null,
          fairway_pct: fwHoles.length ? Math.round(fwHoles.filter(h => h.fairway_hit).length / fwHoles.length * 100) : null,
          gir_pct: girHoles.length ? Math.round(girHoles.filter(h => h.gir).length / girHoles.length * 100) : null,
          avg_putts: puttHoles.length ? Math.round(puttHoles.reduce((s, h) => s + h.putts, 0) / puttHoles.length * 10) / 10 : null,
          birdies: hs.filter((h: any) => h.score && h.par && h.score === h.par - 1).length,
          eagles: hs.filter((h: any) => h.score && h.par && h.score <= h.par - 2).length,
          wedge_total: wedgeTotalsByRound.has(r.id) ? wedgeTotalsByRound.get(r.id)! : null,
        };
      });

    setRounds(feed);
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const onRefresh = async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); };

  const toggleExpand = async (roundId: string) => {
    if (expandedId === roundId) {
      setExpandedId(null);
      setHoleScores([]);
      setEditing(false);
      return;
    }
    setExpandedId(roundId);
    setEditing(false);
    setLoadingScores(true);
    const { data } = await supabase.from('sb_hole_scores')
      .select('id, round_id, hole_number, score, putts, fairway_hit, gir, penalties, par')
      .eq('round_id', roundId)
      .order('hole_number', { ascending: true });
    setHoleScores(data || []);
    setLoadingScores(false);
  };

  const startEdit = () => {
    setEditScores(holeScores.map(h => ({ ...h })));
    setEditing(true);
  };

  const cancelEdit = () => { setEditing(false); setEditScores([]); };

  const updateEditScore = (idx: number, field: keyof HoleScore, value: any) => {
    setEditScores(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      return next;
    });
  };

  const saveEdits = async (roundId: string) => {
    setSaving(true);
    try {
      for (const hole of editScores) {
        await supabase.from('sb_hole_scores')
          .update({ score: hole.score, putts: hole.putts, fairway_hit: hole.fairway_hit, gir: hole.gir })
          .eq('id', hole.id);
      }
      const newTotal = editScores.reduce((sum, h) => sum + (h.score || 0), 0);
      await supabase.from('sb_rounds').update({ total_score: newTotal }).eq('id', roundId);
      setHoleScores(editScores);
      setEditing(false);
      // Update local feed state
      setRounds(prev => prev.map(r => r.id === roundId ? { ...r, total_score: newTotal } : r));
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes');
    }
    setSaving(false);
  };

  const deleteRound = (roundId: string) => {
    confirmAction('Delete Round', 'Are you sure? This cannot be undone.', async () => {
      await supabase.from('sb_hole_scores').delete().eq('round_id', roundId);
      await supabase.from('sb_rounds').delete().eq('id', roundId);
      setRounds(prev => prev.filter(r => r.id !== roundId));
      setExpandedId(null);
      setHoleScores([]);
    });
  };

  const renderRound = ({ item }: { item: FeedRound }) => {
    const isExpanded = expandedId === item.id;
    const isOwn = item.user_id === user?.id;
    const scores = isExpanded ? (editing ? editScores : holeScores) : [];

    return (
      <TouchableOpacity activeOpacity={0.7} onPress={() => toggleExpand(item.id)}>
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.playerName}>{item.player?.display_name || 'Unknown'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={s.date}>{new Date(item.date_played).toLocaleDateString()}</Text>
              <Text style={{ color: colors.gold, fontSize: 16, fontWeight: '700' }}>{isExpanded ? '›' : '‹'}</Text>
            </View>
          </View>
          <Text style={s.courseName}>{item.course?.name || 'Unknown Course'}</Text>
          {item.course?.city && <Text style={s.courseLocation}>{item.course.city}, {item.course.state}</Text>}
          <View style={s.scoreRow}>
            <View style={s.scoreBig}>
              <Text style={s.scoreNum}>{item.total_score || '—'}</Text>
              <Text style={s.scoreLabel}>Score</Text>
            </View>
            <View style={s.statsCol}>
              {item.fairway_pct !== null && (
                <View style={s.statRow}><Text style={s.statLabel}>FW</Text><Text style={s.statVal}>{item.fairway_pct}%</Text></View>
              )}
              {item.gir_pct !== null && (
                <View style={s.statRow}><Text style={s.statLabel}>GIR</Text><Text style={s.statVal}>{item.gir_pct}%</Text></View>
              )}
              {item.avg_putts !== null && (
                <View style={s.statRow}><Text style={s.statLabel}>Putts</Text><Text style={s.statVal}>{item.avg_putts}/hole</Text></View>
              )}
              {item.eagles > 0 && (
                <View style={s.statRow}><Text style={s.statLabel}>🦅 Eagles</Text><Text style={[s.statVal, { color: colors.gold }]}>{item.eagles}</Text></View>
              )}
              {item.birdies > 0 && (
                <View style={s.statRow}><Text style={s.statLabel}>🐦 Birdies</Text><Text style={[s.statVal, { color: colors.gold }]}>{item.birdies}</Text></View>
              )}
              {item.wedge_total != null && (
                <View style={s.statRow}><Text style={s.statLabel}>W&I</Text><Text style={s.statVal}>{item.wedge_total}</Text></View>
              )}
            </View>
          </View>
          {item.weather && <Text style={s.weather}>🌤 {item.weather}</Text>}

          {/* Expanded scorecard */}
          {isExpanded && (
            <View style={s.expandedSection}>
              {loadingScores ? (
                <Text style={{ color: colors.gray, textAlign: 'center', paddingVertical: 12 }}>Loading...</Text>
              ) : (
                <>
                  {/* Header row */}
                  <View style={s.holeRow}>
                    <Text style={[s.holeCell, s.holeHeader, { flex: 0.6 }]}>Hole</Text>
                    <Text style={[s.holeCell, s.holeHeader]}>Par</Text>
                    <Text style={[s.holeCell, s.holeHeader]}>Score</Text>
                    <Text style={[s.holeCell, s.holeHeader]}>Putts</Text>
                    <Text style={[s.holeCell, s.holeHeader]}>FW</Text>
                    <Text style={[s.holeCell, s.holeHeader]}>GIR</Text>
                  </View>
                  {scores.map((hole, idx) => (
                    <View key={hole.hole_number} style={[s.holeRow, idx % 2 === 0 && { backgroundColor: colors.cardBg }]}>
                      <Text style={[s.holeCell, { flex: 0.6, fontWeight: '700', color: colors.primary }]}>{hole.hole_number}</Text>
                      {editing ? (
                        <>
                          <Text style={s.holeCell}>{hole.par ?? '—'}</Text>
                          <TextInput
                            style={[s.holeCell, s.editInput]}
                            keyboardType="number-pad"
                            value={String(hole.score ?? '')}
                            onChangeText={v => updateEditScore(idx, 'score', parseInt(v) || 0)}
                          />
                          <TextInput
                            style={[s.holeCell, s.editInput]}
                            keyboardType="number-pad"
                            value={String(hole.putts ?? '')}
                            onChangeText={v => updateEditScore(idx, 'putts', parseInt(v) || 0)}
                          />
                          <TouchableOpacity style={s.holeCell} onPress={() => updateEditScore(idx, 'fairway_hit', !hole.fairway_hit)}>
                            <Text style={{ textAlign: 'center', fontSize: 16 }}>{hole.fairway_hit ? '✅' : '—'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={s.holeCell} onPress={() => updateEditScore(idx, 'gir', !hole.gir)}>
                            <Text style={{ textAlign: 'center', fontSize: 16 }}>{hole.gir ? '✅' : '—'}</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <Text style={s.holeCell}>{hole.par ?? '—'}</Text>
                          <View style={{ flex: 1, alignItems: 'center' }}>
                            <ScoreCell score={hole.score} par={hole.par || 0} size={13} />
                          </View>
                          <Text style={s.holeCell}>{hole.putts ?? '—'}</Text>
                          <Text style={s.holeCell}>{hole.fairway_hit ? '✓' : hole.fairway_hit === false ? '✗' : '—'}</Text>
                          <Text style={s.holeCell}>{hole.gir ? '✓' : hole.gir === false ? '✗' : '—'}</Text>
                        </>
                      )}
                    </View>
                  ))}

                  {/* Action buttons for own rounds */}
                  {isOwn && !editing && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.editBtn} onPress={startEdit}>
                        <Text style={s.editBtnText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.deleteBtn} onPress={() => deleteRound(item.id)}>
                        <Text style={s.deleteBtnText}>Delete Round</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {isOwn && editing && (
                    <View style={s.actionRow}>
                      <TouchableOpacity style={s.cancelBtn} onPress={cancelEdit}>
                        <Text style={s.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[s.editBtn, saving && { opacity: 0.5 }]} onPress={() => saveEdits(item.id)} disabled={saving}>
                        <Text style={s.editBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <FlatList
        data={rounds}
        keyExtractor={i => i.id}
        renderItem={renderRound}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>⛳</Text>
            <Text style={s.emptyText}>No rounds yet</Text>
            <Text style={s.emptySubtext}>Log your first round to see it here!</Text>
          </View>
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  card: { backgroundColor: colors.white, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  playerName: { fontSize: 16, fontWeight: '700', color: colors.primary },
  date: { fontSize: 13, color: colors.gray },
  courseName: { fontSize: 15, fontWeight: '600', color: colors.black, marginBottom: 2 },
  courseLocation: { fontSize: 12, color: colors.grayDark, marginBottom: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  scoreBig: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 10, padding: 12, minWidth: 70 },
  scoreNum: { fontSize: 28, fontWeight: '800', color: colors.gold },
  scoreLabel: { fontSize: 11, color: colors.white, opacity: 0.8 },
  statsCol: { flex: 1, gap: 4 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  statLabel: { fontSize: 13, color: colors.grayDark, fontWeight: '600' },
  statVal: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  weather: { fontSize: 12, color: colors.gray, marginTop: 8 },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  emptySubtext: { fontSize: 14, color: colors.gray, marginTop: 4 },
  expandedSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: colors.grayLight, paddingTop: 12 },
  holeRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 4 },
  holeCell: { flex: 1, textAlign: 'center', fontSize: 13, color: colors.black },
  holeHeader: { fontWeight: '700', color: colors.primary, fontSize: 12, marginBottom: 4 },
  editInput: { borderWidth: 1, borderColor: colors.grayLight, borderRadius: 6, paddingVertical: 2, paddingHorizontal: 4, backgroundColor: colors.white, marginHorizontal: 2, textAlign: 'center', fontSize: 13 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, gap: 12 },
  editBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  editBtnText: { color: colors.gold, fontWeight: '700', fontSize: 14 },
  cancelBtn: { flex: 1, backgroundColor: colors.grayLight, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: colors.grayDark, fontWeight: '700', fontSize: 14 },
  deleteBtn: { flex: 1, backgroundColor: colors.red, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  deleteBtnText: { color: colors.white, fontWeight: '700', fontSize: 14 },
});
