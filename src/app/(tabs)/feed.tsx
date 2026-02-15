import { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';

interface FeedRound {
  id: string;
  date_played: string;
  total_score: number;
  weather: string;
  user_id: string;
  visibility: string;
  course: { name: string; city: string; state: string } | null;
  player: { display_name: string; username: string } | null;
  fairway_pct: number | null;
  gir_pct: number | null;
  avg_putts: number | null;
}

export default function Feed() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<FeedRound[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    if (!user) return;
    // Get partner IDs
    const { data: rels } = await supabase.from('sb_relationships')
      .select('target_id, user_id')
      .or(`user_id.eq.${user.id},target_id.eq.${user.id}`)
      .eq('status', 'accepted');

    const partnerIds = (rels || []).map(r => r.user_id === user.id ? r.target_id : r.user_id);

    // Get rounds: own + partners' visible + public
    const { data: roundsData } = await supabase.from('sb_rounds')
      .select('*, sb_courses(name, city, state)')
      .eq('is_complete', true)
      .order('date_played', { ascending: false })
      .limit(50);

    if (!roundsData) { setRounds([]); return; }

    const userIds = [...new Set(roundsData.map(r => r.user_id))];
    const { data: users } = await supabase.from('sb_users')
      .select('id, display_name, username')
      .in('id', userIds);

    const userMap = new Map((users || []).map(u => [u.id, u]));

    // Get hole scores for stats
    const roundIds = roundsData.map(r => r.id);
    const { data: scores } = await supabase.from('sb_hole_scores')
      .select('round_id, fairway_hit, gir, putts')
      .in('round_id', roundIds);

    const scoresByRound = new Map<string, any[]>();
    (scores || []).forEach(s => {
      if (!scoresByRound.has(s.round_id)) scoresByRound.set(s.round_id, []);
      scoresByRound.get(s.round_id)!.push(s);
    });

    const feed: FeedRound[] = roundsData
      .filter(r => {
        if (r.user_id === user.id) return true;
        if (r.visibility === 'public') return true;
        if (r.visibility === 'partners' && partnerIds.includes(r.user_id)) return true;
        return false;
      })
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
        };
      });

    setRounds(feed);
  }, [user]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

  const onRefresh = async () => { setRefreshing(true); await loadFeed(); setRefreshing(false); };

  const renderRound = ({ item }: { item: FeedRound }) => (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.playerName}>{item.player?.display_name || 'Unknown'}</Text>
        <Text style={s.date}>{new Date(item.date_played).toLocaleDateString()}</Text>
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
        </View>
      </View>
      {item.weather && <Text style={s.weather}>🌤 {item.weather}</Text>}
    </View>
  );

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
});
