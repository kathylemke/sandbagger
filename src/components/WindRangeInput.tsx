import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

interface Props {
  minValue: number;
  maxValue: number;
  onChangeMin: (val: number) => void;
  onChangeMax: (val: number) => void;
}

const PRESETS = [
  { min: 0, max: 5, label: 'Calm' },
  { min: 5, max: 10, label: 'Light' },
  { min: 10, max: 15, label: 'Moderate' },
  { min: 15, max: 20, label: 'Strong' },
  { min: 20, max: 30, label: 'Very Strong' },
];

export default function WindRangeInput({ minValue, maxValue, onChangeMin, onChangeMax }: Props) {
  const getDescription = () => {
    if (minValue === 0 && maxValue === 0) return 'No wind selected';
    if (minValue === maxValue) return `Steady ${minValue} mph`;
    if (maxValue <= 5) return 'Calm conditions';
    if (maxValue <= 10) return 'Light breeze';
    if (maxValue <= 15) return 'Moderate wind';
    if (maxValue <= 20) return 'Strong wind';
    return 'Very windy conditions';
  };

  const selectPreset = (preset: typeof PRESETS[0]) => {
    onChangeMin(preset.min);
    onChangeMax(preset.max);
  };

  const isPresetSelected = (preset: typeof PRESETS[0]) => {
    return minValue === preset.min && maxValue === preset.max;
  };

  return (
    <View style={s.container}>
      <Text style={s.title}>Wind Speed (mph)</Text>
      
      {/* Range inputs */}
      <View style={s.inputRow}>
        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Min</Text>
          <TextInput
            style={s.input}
            value={minValue.toString()}
            onChangeText={v => onChangeMin(parseInt(v) || 0)}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={2}
          />
        </View>
        
        <Text style={s.dash}>—</Text>
        
        <View style={s.inputGroup}>
          <Text style={s.inputLabel}>Max</Text>
          <TextInput
            style={s.input}
            value={maxValue.toString()}
            onChangeText={v => onChangeMax(parseInt(v) || 0)}
            keyboardType="number-pad"
            selectTextOnFocus
            maxLength={2}
          />
        </View>
        
        <Text style={s.unit}>mph</Text>
      </View>
      
      {/* Visual representation */}
      <View style={s.visualContainer}>
        <View style={s.visualTrack}>
          {/* Wind intensity gradient */}
          <View style={[s.visualFill, { 
            left: `${(minValue / 30) * 100}%`,
            width: `${((maxValue - minValue) / 30) * 100}%`,
          }]} />
        </View>
        <View style={s.visualLabels}>
          <Text style={s.visualLabel}>0</Text>
          <Text style={s.visualLabel}>10</Text>
          <Text style={s.visualLabel}>20</Text>
          <Text style={s.visualLabel}>30</Text>
        </View>
      </View>
      
      <Text style={s.desc}>{getDescription()}</Text>
      
      {/* Quick presets */}
      <View style={s.presets}>
        {PRESETS.map((preset, i) => (
          <TouchableOpacity
            key={i}
            style={[s.preset, isPresetSelected(preset) && s.presetActive]}
            onPress={() => selectPreset(preset)}
          >
            <Text style={[s.presetText, isPresetSelected(preset) && s.presetTextActive]}>
              {preset.label}
            </Text>
            <Text style={[s.presetRange, isPresetSelected(preset) && s.presetRangeActive]}>
              {preset.min}-{preset.max}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginVertical: 8 },
  title: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 12 },
  inputGroup: { alignItems: 'center' },
  inputLabel: { fontSize: 11, color: colors.grayDark, marginBottom: 4 },
  input: {
    width: 60,
    height: 44,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    color: colors.primary,
  },
  dash: { fontSize: 20, color: colors.grayDark, marginTop: 16 },
  unit: { fontSize: 14, fontWeight: '600', color: colors.grayDark, marginTop: 16 },
  
  visualContainer: { marginBottom: 8 },
  visualTrack: {
    height: 8,
    backgroundColor: colors.grayLight,
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  visualFill: {
    position: 'absolute',
    top: 0,
    height: 8,
    backgroundColor: colors.gold,
    borderRadius: 4,
  },
  visualLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  visualLabel: { fontSize: 10, color: colors.grayDark },
  
  desc: { fontSize: 13, color: colors.grayDark, textAlign: 'center', marginBottom: 12 },
  
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  preset: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
    borderWidth: 1,
    borderColor: colors.grayLight,
    alignItems: 'center',
  },
  presetActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  presetText: { fontSize: 12, fontWeight: '600', color: colors.grayDark },
  presetTextActive: { color: colors.gold },
  presetRange: { fontSize: 10, color: colors.gray, marginTop: 2 },
  presetRangeActive: { color: colors.white, opacity: 0.8 },
});
