import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { colors } from '../lib/theme';

interface RoundData {
  id: string;
  date_played: string;
  total_score: number;
  weather?: string;
  wind?: string;
  notes?: string;
}

interface HoleScore {
  round_id: string;
  hole_number: number;
  score: number;
  par?: number;
  putts?: number;
  fairway_hit?: boolean;
  gir?: boolean;
}

interface Props {
  rounds: RoundData[];
  holeScores: Map<string, HoleScore[]>;
}

type FilterCategory = 'weather' | 'wind' | 'grass' | 'green_firmness' | 'green_speed';

interface Filter {
  category: FilterCategory;
  values: string[];
}

const WEATHER_OPTIONS = ['Sunny', 'Partly Cloudy', 'Overcast', 'Light Rain', 'Rain', 'Windy', 'Cold', 'Hot & Humid'];
const WIND_OPTIONS = ['Calm', '5-10 mph', '10-15 mph', '15-20 mph', '20+ mph'];
const GRASS_OPTIONS = ['Bermuda', 'Bentgrass', 'Poa Annua', 'Zoysia', 'Ryegrass'];
const FIRMNESS_OPTIONS = ['1', '2', '3', '4', '5'];
const SPEED_OPTIONS = ['1-8', '9-11', '12-14', '15+'];

export default function ConditionFilteredStats({ rounds, holeScores }: Props) {
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<FilterCategory | null>(null);

  const parseRoundNotes = (notes: string | undefined): Record<string, any> => {
    if (!notes) return {};
    try {
      return JSON.parse(notes);
    } catch {
      return {};
    }
  };

  const toggleFilter = (category: FilterCategory, value: string) => {
    setActiveFilters(prev => {
      const existing = prev.find(f => f.category === category);
      if (existing) {
        const newValues = existing.values.includes(value)
          ? existing.values.filter(v => v !== value)
          : [...existing.values, value];
        
        if (newValues.length === 0) {
          return prev.filter(f => f.category !== category);
        }
        return prev.map(f => f.category === category ? { ...f, values: newValues } : f);
      }
      return [...prev, { category, values: [value] }];
    });
  };

  const isFilterActive = (category: FilterCategory, value: string): boolean => {
    const filter = activeFilters.find(f => f.category === category);
    return filter?.values.includes(value) || false;
  };

  const getFilteredRounds = (): RoundData[] => {
    if (activeFilters.length === 0) return rounds;

    return rounds.filter(round => {
      const notes = parseRoundNotes(round.notes);

      for (const filter of activeFilters) {
        switch (filter.category) {
          case 'weather':
            if (!filter.values.includes(round.weather || '')) return false;
            break;
          case 'wind':
            if (!filter.values.includes(round.wind || '')) return false;
            break;
          case 'grass':
            if (!filter.values.includes(notes.grass_type || '')) return false;
            break;
          case 'green_firmness':
            const firmness = notes.green_firmness?.toString();
            if (!filter.values.includes(firmness || '')) return false;
            break;
          case 'green_speed':
            const speed = notes.green_speed;
            if (speed) {
              const speedBracket = speed <= 8 ? '1-8' : speed <= 11 ? '9-11' : speed <= 14 ? '12-14' : '15+';
              if (!filter.values.includes(speedBracket)) return false;
            } else {
              return false;
            }
            break;
        }
      }
      return true;
    });
  };

  const filteredRounds = getFilteredRounds();
  const filteredScores = (() => {
    const scores: HoleScore[] = [];
    const roundIds = new Set(filteredRounds.map(r => r.id));
    holeScores.forEach((holes, roundId) => {
      if (roundIds.has(roundId)) scores.push(...holes);
    });
    return scores;
  })();

  // Calculate stats
  const avgScore = filteredRounds.length > 0
    ? (filteredRounds.reduce((sum, r) => sum + r.total_score, 0) / filteredRounds.length).toFixed(1)
    : '—';

  const fwHoles = filteredScores.filter(s => s.fairway_hit !== null && s.fairway_hit !== undefined);
  const fwPct = fwHoles.length > 0
    ? Math.round(fwHoles.filter(s => s.fairway_hit).length / fwHoles.length * 100)
    : null;

  const girHoles = filteredScores.filter(s => s.gir !== null && s.gir !== undefined);
  const girPct = girHoles.length > 0
    ? Math.round(girHoles.filter(s => s.gir).length / girHoles.length * 100)
    : null;

  const puttHoles = filteredScores.filter(s => s.putts !== null && s.putts !== undefined);
  const avgPutts = puttHoles.length > 0 && filteredRounds.length > 0
    ? (puttHoles.reduce((sum, s) => sum + (s.putts || 0), 0) / filteredRounds.length).toFixed(1)
    : null;

  // Compare to overall
  const overallAvg = rounds.length > 0
    ? rounds.reduce((sum, r) => sum + r.total_score, 0) / rounds.length
    : 0;
  const filteredAvg = filteredRounds.length > 0
    ? filteredRounds.reduce((sum, r) => sum + r.total_score, 0) / filteredRounds.length
    : 0;
  const scoreDiff = filteredRounds.length > 0 && rounds.length > 0
    ? (filteredAvg - overallAvg).toFixed(1)
    : null;

  const renderFilterPill = (category: FilterCategory, options: string[], label: string, icon: string) => {
    const isExpanded = expandedCategory === category;
    const activeCount = activeFilters.find(f => f.category === category)?.values.length || 0;

    return (
      <View style={s.filterSection}>
        <TouchableOpacity
          style={[s.filterHeader, activeCount > 0 && s.filterHeaderActive]}
          onPress={() => setExpandedCategory(isExpanded ? null : category)}
        >
          <Text style={s.filterIcon}>{icon}</Text>
          <Text style={[s.filterLabel, activeCount > 0 && s.filterLabelActive]}>{label}</Text>
          {activeCount > 0 && (
            <View style={s.filterBadge}>
              <Text style={s.filterBadgeText}>{activeCount}</Text>
            </View>
          )}
          <Text style={s.filterChevron}>{isExpanded ? '▼' : '▶'}</Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={s.filterOptions}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[s.filterOption, isFilterActive(category, opt) && s.filterOptionActive]}
                onPress={() => toggleFilter(category, opt)}
              >
                <Text style={[s.filterOptionText, isFilterActive(category, opt) && s.filterOptionTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>🎯 Condition-Filtered Stats</Text>
        <Text style={s.subtitle}>See how conditions affect your game</Text>
      </View>

      {/* Filters */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll}>
        <View style={s.filterRow}>
          {renderFilterPill('weather', WEATHER_OPTIONS, 'Weather', '🌤️')}
          {renderFilterPill('wind', WIND_OPTIONS, 'Wind', '💨')}
          {renderFilterPill('grass', GRASS_OPTIONS, 'Grass', '🌱')}
          {renderFilterPill('green_firmness', FIRMNESS_OPTIONS, 'Firmness', '⚫')}
          {renderFilterPill('green_speed', SPEED_OPTIONS, 'Speed', '⚡')}
        </View>
      </ScrollView>

      {/* Active filter tags */}
      {activeFilters.length > 0 && (
        <View style={s.activeFilters}>
          <Text style={s.activeFiltersLabel}>Filtering by:</Text>
          <View style={s.activeFilterTags}>
            {activeFilters.flatMap(f => f.values.map(v => (
              <TouchableOpacity
                key={`${f.category}-${v}`}
                style={s.activeTag}
                onPress={() => toggleFilter(f.category, v)}
              >
                <Text style={s.activeTagText}>{v}</Text>
                <Text style={s.activeTagX}>✕</Text>
              </TouchableOpacity>
            )))}
          </View>
          <TouchableOpacity onPress={() => setActiveFilters([])}>
            <Text style={s.clearAll}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats display */}
      <View style={s.statsContainer}>
        <View style={s.statsHeader}>
          <Text style={s.statsTitle}>
            {activeFilters.length > 0 ? 'Filtered Results' : 'Overall Stats'}
          </Text>
          <Text style={s.statsCount}>{filteredRounds.length} rounds</Text>
        </View>

        <View style={s.statsGrid}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{avgScore}</Text>
            <Text style={s.statLabel}>Avg Score</Text>
            {scoreDiff && activeFilters.length > 0 && (
              <View style={[s.diffBadge, parseFloat(scoreDiff) > 0 ? s.diffBadgeBad : s.diffBadgeGood]}>
                <Text style={s.diffBadgeText}>
                  {parseFloat(scoreDiff) > 0 ? '+' : ''}{scoreDiff}
                </Text>
              </View>
            )}
          </View>

          <View style={s.statBox}>
            <Text style={s.statNum}>{fwPct !== null ? `${fwPct}%` : '—'}</Text>
            <Text style={s.statLabel}>Fairways</Text>
          </View>

          <View style={s.statBox}>
            <Text style={s.statNum}>{girPct !== null ? `${girPct}%` : '—'}</Text>
            <Text style={s.statLabel}>GIR</Text>
          </View>

          <View style={s.statBox}>
            <Text style={s.statNum}>{avgPutts || '—'}</Text>
            <Text style={s.statLabel}>Putts/Rnd</Text>
          </View>
        </View>

        {/* Insights */}
        {activeFilters.length > 0 && filteredRounds.length >= 3 && (
          <View style={s.insights}>
            <Text style={s.insightsTitle}>💡 Insights</Text>
            {scoreDiff && parseFloat(scoreDiff) > 2 && (
              <Text style={s.insightText}>
                ⚠️ You score ~{Math.abs(parseFloat(scoreDiff))} strokes worse in these conditions
              </Text>
            )}
            {scoreDiff && parseFloat(scoreDiff) < -2 && (
              <Text style={s.insightText}>
                ✅ You score ~{Math.abs(parseFloat(scoreDiff))} strokes better in these conditions!
              </Text>
            )}
            {fwPct !== null && fwPct < 50 && activeFilters.some(f => f.category === 'wind') && (
              <Text style={s.insightText}>
                💨 Wind significantly impacts your accuracy off the tee
              </Text>
            )}
          </View>
        )}

        {filteredRounds.length === 0 && activeFilters.length > 0 && (
          <View style={s.noData}>
            <Text style={s.noDataIcon}>🔍</Text>
            <Text style={s.noDataText}>No rounds match these conditions</Text>
            <Text style={s.noDataSub}>Try adjusting your filters</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginVertical: 16 },
  header: { marginBottom: 12 },
  title: { fontSize: 18, fontWeight: '800', color: colors.primary },
  subtitle: { fontSize: 13, color: colors.grayDark, marginTop: 2 },

  filterScroll: { marginBottom: 12 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  filterSection: { minWidth: 100 },
  filterHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.grayLight },
  filterHeaderActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterIcon: { fontSize: 14 },
  filterLabel: { fontSize: 12, fontWeight: '600', color: colors.grayDark },
  filterLabelActive: { color: colors.gold },
  filterBadge: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: colors.primary },
  filterChevron: { fontSize: 10, color: colors.gray, marginLeft: 4 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8, paddingHorizontal: 4 },
  filterOption: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.offWhite, borderRadius: 8, borderWidth: 1, borderColor: colors.grayLight },
  filterOptionActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  filterOptionText: { fontSize: 11, color: colors.grayDark },
  filterOptionTextActive: { color: colors.primary, fontWeight: '700' },

  activeFilters: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12, paddingHorizontal: 4 },
  activeFiltersLabel: { fontSize: 12, color: colors.grayDark },
  activeFilterTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activeTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: colors.primary, borderRadius: 12 },
  activeTagText: { fontSize: 11, color: colors.gold, fontWeight: '600' },
  activeTagX: { fontSize: 12, color: colors.white, opacity: 0.7 },
  clearAll: { fontSize: 12, color: colors.primary, fontWeight: '600', textDecorationLine: 'underline' },

  statsContainer: { backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  statsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  statsTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  statsCount: { fontSize: 13, color: colors.grayDark },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { flex: 1, minWidth: '45%', backgroundColor: colors.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 28, fontWeight: '800', color: colors.gold },
  statLabel: { fontSize: 11, color: colors.white, opacity: 0.8, marginTop: 2 },
  diffBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffBadgeGood: { backgroundColor: '#22c55e' },
  diffBadgeBad: { backgroundColor: '#ef4444' },
  diffBadgeText: { fontSize: 11, fontWeight: '700', color: colors.white },

  insights: { marginTop: 16, padding: 12, backgroundColor: colors.offWhite, borderRadius: 10 },
  insightsTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  insightText: { fontSize: 13, color: colors.grayDark, marginBottom: 4 },

  noData: { alignItems: 'center', padding: 24 },
  noDataIcon: { fontSize: 32, marginBottom: 8 },
  noDataText: { fontSize: 15, fontWeight: '600', color: colors.grayDark },
  noDataSub: { fontSize: 13, color: colors.gray, marginTop: 4 },
});
