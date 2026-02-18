import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { colors } from '../../lib/theme';
import ScoreCell from '../../components/ScoreCell';

type RangeOption = 'all' | '3' | '5' | '10' | '25';

interface RoundStat { id: string; date_played: string; total_score: number; course_name?: string; }
interface HoleScore { round_id: string; hole_number: number; score: number; par?: number; }
interface ClubStat { club: string; avgDistance: number; count: number; }
interface RecentHole { hole_number: number; score: number; par: number; putts: number; fairway_hit: boolean | null; gir: boolean; wedge_and_in: number | null; }
interface RecentRound { id: string; date_played: string; total_score: number; course_name: string; holes: RecentHole[]; wedge_total?: number | null; }

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
  const [allRounds, setAllRounds] = useState<RoundStat[]>([]);
  const [range, setRange] = useState<RangeOption>('all');
  const [allScoresByRound, setAllScoresByRound] = useState<Map<string, any[]>>(new Map());
  const [clubs, setClubs] = useState<ClubStat[]>([]);
  const [recentRounds, setRecentRounds] = useState<RecentRound[]>([]);
  const [wedgeTotalsByRound, setWedgeTotalsByRound] = useState<Map<string, number>>(new Map());
  const [expandedRoundId, setExpandedRoundId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;
    const { data: roundsData } = await supabase.from('sb_rounds')
      .select('id, date_played, total_score, notes')
      .eq('user_id', user.id).eq('is_complete', true)
      .order('date_played', { ascending: true });

    const rds = roundsData || [];
    setAllRounds(rds);

    const roundIds = rds.map(r => r.id);
    if (roundIds.length) {
      const { data: scores } = await supabase.from('sb_hole_scores')
        .select('round_id, fairway_hit, fairway_miss_dir, gir, putts, wedge_and_in, hole_number, score, par')
        .in('round_id', roundIds)
        .order('hole_number');

      const byRound = new Map<string, any[]>();
      (scores || []).forEach((sc: any) => {
        if (!byRound.has(sc.round_id)) byRound.set(sc.round_id, []);
        byRound.get(sc.round_id)!.push(sc);
      });
      setAllScoresByRound(byRound);

      // Wedge totals per round
      const wTotals = new Map<string, number>();
      byRound.forEach((holes, roundId) => {
        const wedgeHoles = holes.filter((h: any) => h.wedge_and_in !== null && h.wedge_and_in !== undefined && typeof h.wedge_and_in === 'number');
        if (wedgeHoles.length > 0) {
          wTotals.set(roundId, wedgeHoles.reduce((s: number, h: any) => s + (h.wedge_and_in || 0), 0));
        }
      });
      setWedgeTotalsByRound(wTotals);

      // Recent rounds with hole scores
      const { data: recentFull } = await supabase.from('sb_rounds')
        .select('id, date_played, total_score, notes, sb_courses(name)')
        .eq('user_id', user.id).eq('is_complete', true)
        .order('date_played', { ascending: false })
        .limit(10);

      setRecentRounds((recentFull || []).map((r: any) => {
        const rScores = byRound.get(r.id) || [];
        const wedgeHoles = rScores.filter((h: any) => h.wedge_and_in !== null && typeof h.wedge_and_in === 'number');
        const wTotal = wedgeHoles.length > 0 ? wedgeHoles.reduce((s: number, h: any) => s + (h.wedge_and_in || 0), 0) : null;
        return {
          id: r.id,
          date_played: r.date_played,
          total_score: r.total_score,
          course_name: r.sb_courses?.name || 'Unknown',
          holes: rScores.map((h: any) => ({ hole_number: h.hole_number, score: h.score, par: h.par || 0, putts: h.putts ?? 0, fairway_hit: h.fairway_hit, gir: !!h.gir, wedge_and_in: h.wedge_and_in })).sort((a: any, b: any) => a.hole_number - b.hole_number),
          wedge_total: wTotal,
        };
      }));

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

  // Compute filtered stats based on range
  const filteredRounds = range === 'all' ? allRounds : allRounds.slice(-parseInt(range));
  const filteredIds = new Set(filteredRounds.map(r => r.id));
  const filteredScores = (() => {
    const arr: any[] = [];
    allScoresByRound.forEach((scores, roundId) => {
      if (filteredIds.has(roundId)) arr.push(...scores);
    });
    return arr;
  })();

  const rounds = filteredRounds;
  const avgScore = rounds.length ? Math.round(rounds.reduce((s, r) => s + (r.total_score || 0), 0) / rounds.length * 10) / 10 : 0;
  const fwHoles = filteredScores.filter((s: any) => s.fairway_hit !== null);
  const fwPct = fwHoles.length ? Math.round(fwHoles.filter((s: any) => s.fairway_hit).length / fwHoles.length * 100) : 0;
  const girHoles = filteredScores.filter((s: any) => s.gir !== null);
  const girPct = girHoles.length ? Math.round(girHoles.filter((s: any) => s.gir).length / girHoles.length * 100) : 0;
  const puttHoles = filteredScores.filter((s: any) => s.putts !== null);
  const avgPutts = puttHoles.length && rounds.length ? Math.round(puttHoles.reduce((s: number, h: any) => s + h.putts, 0) / rounds.length * 10) / 10 : 0;
  const onePuttsTotal = puttHoles.filter((s: any) => s.putts === 1).length;
  const threePuttsTotal = puttHoles.filter((s: any) => s.putts >= 3).length;
  const roundCount = filteredRounds.length || 1;
  const onePuttsPer18 = (onePuttsTotal / roundCount).toFixed(1);
  const threePuttsPer18 = (threePuttsTotal / roundCount).toFixed(1);
  const fwMisses = filteredScores.filter((sc: any) => sc.fairway_hit === false && sc.fairway_miss_dir);
  const missLPct = fwMisses.length ? Math.round(fwMisses.filter((sc: any) => sc.fairway_miss_dir === 'L').length / fwMisses.length * 100) : 0;
  const missRPct = fwMisses.length ? Math.round(fwMisses.filter((sc: any) => sc.fairway_miss_dir === 'R').length / fwMisses.length * 100) : 0;
  const wedgeHolesFiltered = filteredScores.filter((sc: any) => sc.wedge_and_in !== null && typeof sc.wedge_and_in === 'number');
  const wedgeInTotal = wedgeHolesFiltered.length;
  const wedgeInMade = wedgeHolesFiltered.reduce((s: number, sc: any) => s + (sc.wedge_and_in || 0), 0);
  const scoreData = rounds.slice(-10).map(r => ({
    label: new Date(r.date_played).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: r.total_score || 0,
  }));

  const RANGE_OPTIONS: { key: RangeOption; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: '3', label: 'Last 3' },
    { key: '5', label: 'Last 5' },
    { key: '10', label: 'Last 10' },
    { key: '25', label: 'Last 25' },
  ];

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {allRounds.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyIcon}>📊</Text>
          <Text style={s.emptyText}>No stats yet</Text>
          <Text style={s.emptySubtext}>Log some rounds to see your stats</Text>
        </View>
      ) : (
        <>
          {/* Range Filter */}
          <View style={s.rangePillRow}>
            {RANGE_OPTIONS.map(opt => (
              <TouchableOpacity key={opt.key} style={[s.rangePill, range === opt.key && s.rangePillActive]} onPress={() => setRange(opt.key)}>
                <Text style={[s.rangePillText, range === opt.key && s.rangePillTextActive]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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

          {/* Putting & Miss Direction */}
          <View style={s.summaryRow}>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{onePuttsPer18}</Text>
              <Text style={s.summaryLabel}>1-Putts/Rnd</Text>
            </View>
            <View style={s.summaryCard}>
              <Text style={s.summaryNum}>{threePuttsPer18}</Text>
              <Text style={s.summaryLabel}>3-Putts/Rnd</Text>
            </View>
            {(missLPct > 0 || missRPct > 0) && (
              <>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{missLPct}%</Text>
                  <Text style={s.summaryLabel}>Miss L</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{missRPct}%</Text>
                  <Text style={s.summaryLabel}>Miss R</Text>
                </View>
              </>
            )}
          </View>

          <Text style={s.sectionTitle}>Scoring Trend (Last 10)</Text>
          <BarChart data={scoreData} maxVal={Math.max(...scoreData.map(d => d.value), 72)} label="" />

          {recentRounds.length > 0 && (
            <>
              <Text style={s.sectionTitle}>Recent Rounds</Text>
              {recentRounds.map(r => {
                const isExpanded = expandedRoundId === r.id;
                const hasWedge = r.holes.some(h => h.wedge_and_in != null);
                // Summary stats for expanded view
                const fwTracked = r.holes.filter(h => h.fairway_hit !== null);
                const fwHitCount = fwTracked.filter(h => h.fairway_hit === true).length;
                const girCount = r.holes.filter(h => h.gir).length;
                const totalPutts = r.holes.reduce((sum, h) => sum + h.putts, 0);
                const birdies = r.holes.filter(h => h.score && h.par && h.score < h.par).length;
                const bogeys = r.holes.filter(h => h.score && h.par && h.score > h.par).length;

                return (
                  <TouchableOpacity key={r.id} activeOpacity={0.7} onPress={() => setExpandedRoundId(isExpanded ? null : r.id)}>
                    <View style={s.recentCard}>
                      <View style={s.recentHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={s.recentCourse}>{r.course_name}</Text>
                          <Text style={s.recentDate}>{new Date(r.date_played).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={s.recentScore}>{r.total_score}</Text>
                          {r.wedge_total != null && (
                            <Text style={{ fontSize: 11, color: colors.gold, fontWeight: '600' }}>W&I: {r.wedge_total}</Text>
                          )}
                        </View>
                      </View>

                      {/* Collapsed: mini scorecard */}
                      {!isExpanded && r.holes.length > 0 && (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.miniScorecard}>
                          <View style={{ flexDirection: 'row', gap: 2 }}>
                            {r.holes.map((h, idx) => (
                              <View key={idx} style={s.miniScoreCell}>
                                <Text style={s.miniHoleNum}>{h.hole_number}</Text>
                                <ScoreCell score={h.score} par={h.par} size={11} mini />
                              </View>
                            ))}
                          </View>
                        </ScrollView>
                      )}

                      {/* Expanded: full scorecard + summary */}
                      {isExpanded && r.holes.length > 0 && (
                        <View style={s.expandedDetail}>
                          {/* Round summary pills */}
                          <View style={s.detailPillRow}>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>FW</Text><Text style={s.detailPillValue}>{fwHitCount}/{fwTracked.length}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>GIR</Text><Text style={s.detailPillValue}>{girCount}/{r.holes.length}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>Putts</Text><Text style={s.detailPillValue}>{totalPutts}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>🐦</Text><Text style={s.detailPillValue}>{birdies}</Text></View>
                            <View style={s.detailPill}><Text style={s.detailPillLabel}>Bogey+</Text><Text style={s.detailPillValue}>{bogeys}</Text></View>
                            {hasWedge && r.wedge_total != null && (
                              <View style={s.detailPill}><Text style={s.detailPillLabel}>W&I</Text><Text style={s.detailPillValue}>{r.wedge_total}</Text></View>
                            )}
                          </View>

                          {/* Full scorecard table */}
                          <View style={s.detailTable}>
                            <View style={s.detailHeaderRow}>
                              <Text style={[s.detailCell, s.detailHeaderText, { flex: 0.5 }]}>Hole</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>Par</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>Score</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>Putts</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>FW</Text>
                              <Text style={[s.detailCell, s.detailHeaderText]}>GIR</Text>
                              {hasWedge && <Text style={[s.detailCell, s.detailHeaderText]}>W&I</Text>}
                            </View>
                            {r.holes.map((h, idx) => (
                              <View key={h.hole_number} style={[s.detailRow, idx % 2 === 0 && { backgroundColor: colors.offWhite }]}>
                                <Text style={[s.detailCell, { flex: 0.5, fontWeight: '700', color: colors.primary }]}>{h.hole_number}</Text>
                                <Text style={s.detailCell}>{h.par}</Text>
                                <View style={{ flex: 1, alignItems: 'center' }}>
                                  <ScoreCell score={h.score} par={h.par} size={13} />
                                </View>
                                <Text style={s.detailCell}>{h.putts || '—'}</Text>
                                <Text style={s.detailCell}>{h.fairway_hit === null ? '—' : h.fairway_hit ? '✓' : '✗'}</Text>
                                <Text style={s.detailCell}>{h.gir ? '✓' : '✗'}</Text>
                                {hasWedge && <Text style={s.detailCell}>{h.wedge_and_in != null ? h.wedge_and_in : '—'}</Text>}
                              </View>
                            ))}
                          </View>

                          <Text style={{ fontSize: 11, color: colors.gray, textAlign: 'center', marginTop: 8 }}>Tap to collapse</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </>
          )}

          <Text style={s.sectionTitle}>Rounds Played</Text>
          <Text style={s.roundCount}>{rounds.length} rounds</Text>

          {wedgeInTotal > 0 && (
            <>
              <Text style={s.sectionTitle}>Wedge & In</Text>
              <View style={s.summaryRow}>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInMade}</Text>
                  <Text style={s.summaryLabel}>Total Shots</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInTotal > 0 ? (wedgeInMade / wedgeInTotal).toFixed(1) : '0'}</Text>
                  <Text style={s.summaryLabel}>Avg/Hole</Text>
                </View>
                <View style={s.summaryCard}>
                  <Text style={s.summaryNum}>{wedgeInTotal}</Text>
                  <Text style={s.summaryLabel}>Holes Tracked</Text>
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
  recentCard: { backgroundColor: colors.white, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.grayLight },
  recentHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recentCourse: { fontSize: 15, fontWeight: '700', color: colors.primary },
  recentDate: { fontSize: 12, color: colors.grayDark, marginTop: 2 },
  recentScore: { fontSize: 28, fontWeight: '800', color: colors.gold },
  miniScorecard: { marginTop: 4 },
  miniScoreCell: { alignItems: 'center', width: 26 },
  miniHoleNum: { fontSize: 8, color: colors.gray, marginBottom: 1 },
  rangePillRow: { flexDirection: 'row', gap: 6, marginBottom: 20 },
  rangePill: { flex: 1, paddingVertical: 10, borderRadius: 20, borderWidth: 2, borderColor: colors.grayLight, alignItems: 'center', backgroundColor: colors.white },
  rangePillActive: { backgroundColor: colors.primary, borderColor: colors.gold },
  rangePillText: { fontSize: 12, fontWeight: '700', color: colors.grayDark },
  rangePillTextActive: { color: colors.gold },
  expandedDetail: { marginTop: 10, borderTopWidth: 1, borderTopColor: colors.grayLight, paddingTop: 12 },
  detailPillRow: { flexDirection: 'row', gap: 6, marginBottom: 12, flexWrap: 'wrap' },
  detailPill: { flex: 1, minWidth: 50, backgroundColor: colors.primary, borderRadius: 8, paddingVertical: 6, paddingHorizontal: 4, alignItems: 'center' },
  detailPillLabel: { fontSize: 10, color: colors.white, opacity: 0.8, fontWeight: '600' },
  detailPillValue: { fontSize: 15, fontWeight: '800', color: colors.gold, marginTop: 1 },
  detailTable: { backgroundColor: colors.white, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  detailHeaderRow: { flexDirection: 'row', backgroundColor: colors.primary, paddingVertical: 8, paddingHorizontal: 4 },
  detailHeaderText: { color: colors.white, fontWeight: '700', fontSize: 11 },
  detailRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  detailCell: { flex: 1, textAlign: 'center', fontSize: 12, color: colors.black },
});
