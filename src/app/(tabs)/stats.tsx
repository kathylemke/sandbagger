import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';

interface RoundStat { id: string; date_played: string; total_score: number; }
interface ClubStat { club: string; avgDistance: number; count: number; }

function BarChart({ data, maxVal, label }: { data: { label: string; value: number }[]; maxVal: number; label: string }) {
  if (!data.length) return null;
  return (
    <View style={cs.chart}>
      <Text style={cs.chartLabel}>{label}</Text>
      <View style={cs.bars}>
        {data.map((d, i) => (
          <View key={i} style={cs.barCol}>
            <Text style={cs.barVal}>{d.value}</Text>
            <View style={[cs.bar, { height: Math.max(4, (d.value / maxVal) * 120) }]} />
            <Text style={cs.barLabel}>{d.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Stats() {
  const { user } = useAuth();
  const [rounds, setRounds] = useState<RoundStat[]>([]);
  const [avgScore, setAvgScore] = useState(0);
  const [fwPct, setFwPct] = useState(0);
  const [girPct, setGirPct] = useState(0);
  const [avgPutts, setAvgPutts] = useState(0);
  const [clubs, setClubs] = useState<ClubStat[]>([]);
  const [scoreData, setScoreData] = useState<{ label: string; value: number }[]>([]);
  const [wedgeInMade, setWedgeInMade] = useState(0);
  const [wedgeInTotal, setWedgeInTotal] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    // Rounds
    const { data: roundsData } = await supabase.from('sb_rounds')
      .select('id, date_played, total_score')
      .eq('user_id', user.id).eq('is_complete', true)
      .order('date_played', { ascending: true });

    const rds = roundsData || [];
    setRounds(rds);

    if (rds.length) {
      setAvgScore(Math.round(rds.reduce((s, r) => s + (r.total_score || 0), 0) / rds.length * 10) / 10);
      const last10 = rds.slice(-10);
      setScoreData(last10.map(r => ({
        label: new Date(r.date_played).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        value: r.total_score || 0,
      })));
    }

    // Hole scores
    const roundIds = rds.map(r => r.id);
    if (roundIds.length) {
      const { data: scores } = await supabase.from('sb_hole_scores')
        .select('fairway_hit, gir, putts, wedge_and_in')
        .in('round_id', roundIds);

      if (scores?.length) {
        const fwHoles = scores.filter(s => s.fairway_hit !== null);
        const girHoles = scores.filter(s => s.gir !== null);
        const puttHoles = scores.filter(s => s.putts !== null);
        if (fwHoles.length) setFwPct(Math.round(fwHoles.filter(s => s.fairway_hit).length / fwHoles.length * 100));
        if (girHoles.length) setGirPct(Math.round(girHoles.filter(s => s.gir).length / girHoles.length * 100));
        if (puttHoles.length) setAvgPutts(Math.round(puttHoles.reduce((s, h) => s + h.putts, 0) / rds.length * 10) / 10);

        // Wedge & In stats
        const wedgeHoles = scores.filter((sc: any) => sc.wedge_and_in !== null && sc.wedge_and_in !== undefined);
        setWedgeInTotal(wedgeHoles.length);
        setWedgeInMade(wedgeHoles.filter((sc: any) => sc.wedge_and_in === true).length);
      }

      // Club distances
      const { data: shots } = await supabase.from('sb_shots')
        .select('club, distance_yards, hole_score_id')
        .not('club', 'is', null)
        .not('distance_yards', 'is', null);

      if (shots?.length) {
        const clubMap = new Map<string, number[]>();
        shots.forEach(s => {
          if (!s.club || !s.distance_yards) return;
          if (!clubMap.has(s.club)) clubMap.set(s.club, []);
          clubMap.get(s.club)!.push(s.distance_yards);
        });
        const clubStats: ClubStat[] = Array.from(clubMap.entries()).map(([club, dists]) => ({
          club, avgDistance: Math.round(dists.reduce((a, b) => a + b, 0) / dists.length), count: dists.length
        })).sort((a, b) => b.avgDistance - a.avgDistance);
        setClubs(clubStats);
      }
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {rounds.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📊</Text>
          <Text style={s.emptyText}>No stats yet</Text>
          <Text style={s.emptySubtext}>Log some rounds to see your stats</Text>
        </View>
      ) : (
        <>
          {/* Summary Cards */}
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{avgScore || '—'}</Text>
              <Text style={s.summaryLabel}>Avg Score</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{fwPct}%</Text>
              <Text style={s.summaryLabel}>Fairways</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{girPct}%</Text>
              <Text style={s.summaryLabel}>GIR</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{avgPutts || '—'}</Text>
              <Text style={s.summaryLabel}>Putts/Rnd</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>Scoring Trend (Last 10)</Text>
          <BarChart data={scoreData} maxVal={Math.max(...scoreData.map(d => d.value), 72)} label="" />

          <Text style={s.sectionTitle}>Rounds Played</Text>
          <Text style={s.roundCount}>{rounds.length} rounds</Text>

          {wedgeInTotal > 0 && (
            <>
              <Text style={s.sectionTitle}>Wedge & In</Text>
              <View style={s.summaryRow}>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInMade}</Text>
                  <Text style={s.summaryLabel}>Made</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInTotal > 0 ? Math.round(wedgeInMade / wedgeInTotal * 100) : 0}%</Text>
                  <Text style={s.summaryLabel}>Avg/Hole</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInTotal}</Text>
                  <Text style={s.summaryLabel}>Tracked</Text>
                </View>
              </View>
            </>
          )}

          {clubs.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Club Distances</Text>
              {clubs.map(c => (
                <View key={c.club} style={s.clubRow}>
                  <Text style={s.clubName}>{c.club}</Text>
                  <View style={s.clubBarContainer}>
                    <View style={[s.clubBar, { width: `${Math.min(100, (c.avgDistance / 300) * 100)}%` }]} />
                  </View>
                  <Text style={s.clubDist}>{c.avgDistance} yds</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const cs = StyleSheet.create({
  chart: { marginBottom: 20 },
  chartLabel: { fontSize: 14, fontWeight: '600', color: colors.primary, marginBottom: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 150, paddingTop: 20 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '80%', backgroundColor: colors.gold, borderRadius: 4, minHeight: 4 },
  barVal: { fontSize: 10, color: colors.primary, fontWeight: '700', marginBottom: 2 },
  barLabel: { fontSize: 9, color: colors.gray, marginTop: 4 },
});

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  empty: { alignItems: 'center', paddingTop: 100 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  emptySubtext: { fontSize: 14, color: colors.gray, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  summaryCard: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryNum: { fontSize: 22, fontWeight: '800', color: colors.gold },
  summaryLabel: { fontSize: 11, color: colors.white, opacity: 0.8, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginTop: 20, marginBottom: 12 },
  roundCount: { fontSize: 24, fontWeight: '800', color: colors.gold },
  clubRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  clubName: { fontSize: 13, fontWeight: '600', color: colors.primary, width: 70 },
  clubBarContainer: { flex: 1, height: 20, backgroundColor: colors.grayLight, borderRadius: 10, overflow: 'hidden' },
  clubBar: { height: '100%', backgroundColor: colors.gold, borderRadius: 10 },
  clubDist: { fontSize: 13, fontWeight: '700', color: colors.primary, width: 60, textAlign: 'right' },
});
