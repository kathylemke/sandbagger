import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

interface Props {
  value: number; // 0-100
  onChange: (val: number) => void;
}

const FIRMNESS_LABELS = [
  { min: 0, max: 20, label: 'Very Soft', color: '#3b82f6', desc: 'Balls plug, spin holds' },
  { min: 21, max: 40, label: 'Soft', color: '#22c55e', desc: 'Good spin, some release' },
  { min: 41, max: 60, label: 'Medium', color: '#eab308', desc: 'Normal conditions' },
  { min: 61, max: 80, label: 'Firm', color: '#f97316', desc: 'More release, less spin' },
  { min: 81, max: 100, label: 'Very Firm', color: '#ef4444', desc: 'Balls bounce off greens' },
];

const getLabel = (value: number) => {
  return FIRMNESS_LABELS.find(l => value >= l.min && value <= l.max) || FIRMNESS_LABELS[2];
};

export default function GreenFirmnessSlider({ value, onChange }: Props) {
  const currentLabel = getLabel(value);
  const sliderWidth = 280;
  
  const handlePress = (position: number) => {
    const newValue = Math.round((position / sliderWidth) * 100);
    onChange(Math.max(0, Math.min(100, newValue)));
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Green Firmness</Text>
        <View style={[s.badge, { backgroundColor: currentLabel.color }]}>
          <Text style={s.badgeText}>{currentLabel.label}</Text>
        </View>
      </View>
      
      <Text style={s.desc}>{currentLabel.desc}</Text>
      
      {/* Slider track */}
      <View style={s.sliderContainer}>
        <View style={s.track}>
          {/* Gradient segments */}
          {FIRMNESS_LABELS.map((seg, i) => (
            <View
              key={i}
              style={[
                s.segment,
                { backgroundColor: seg.color, flex: 1 },
                i === 0 && s.segmentFirst,
                i === FIRMNESS_LABELS.length - 1 && s.segmentLast,
              ]}
            />
          ))}
          
          {/* Filled portion */}
          <View
            style={[
              s.filled,
              {
                width: `${value}%`,
                backgroundColor: currentLabel.color,
              },
            ]}
          />
          
          {/* Thumb */}
          <View
            style={[
              s.thumb,
              {
                left: `${value}%`,
                marginLeft: -12,
                backgroundColor: currentLabel.color,
              },
            ]}
          >
            <Text style={s.thumbText}>{value}</Text>
          </View>
        </View>
        
        {/* Touch targets */}
        <View style={s.touchTargets}>
          {Array.from({ length: 11 }).map((_, i) => (
            <TouchableOpacity
              key={i}
              style={s.touchTarget}
              onPress={() => onChange(i * 10)}
            />
          ))}
        </View>
      </View>
      
      {/* Labels */}
      <View style={s.labels}>
        <Text style={s.labelText}>Soft</Text>
        <Text style={s.labelText}>Firm</Text>
      </View>
      
      {/* Quick presets */}
      <View style={s.presets}>
        {FIRMNESS_LABELS.map((preset, i) => (
          <TouchableOpacity
            key={i}
            style={[
              s.preset,
              value >= preset.min && value <= preset.max && { borderColor: preset.color, borderWidth: 2 },
            ]}
            onPress={() => onChange(Math.round((preset.min + preset.max) / 2))}
          >
            <View style={[s.presetDot, { backgroundColor: preset.color }]} />
            <Text style={s.presetText}>{preset.label.split(' ')[preset.label.includes('Very') ? 1 : 0]}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginVertical: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '700', color: colors.primary },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.white },
  desc: { fontSize: 12, color: colors.grayDark, marginBottom: 12 },
  
  sliderContainer: { position: 'relative', height: 40, marginBottom: 8 },
  track: {
    position: 'absolute',
    top: 12,
    left: 0,
    right: 0,
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: colors.grayLight,
  },
  segment: { opacity: 0.3 },
  segmentFirst: { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
  segmentLast: { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  filled: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 8,
    borderRadius: 4,
  },
  thumb: {
    position: 'absolute',
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  thumbText: { fontSize: 9, fontWeight: '800', color: colors.white },
  
  touchTargets: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 40,
    flexDirection: 'row',
  },
  touchTarget: { flex: 1 },
  
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  labelText: { fontSize: 11, color: colors.grayDark },
  
  presets: { flexDirection: 'row', gap: 8, justifyContent: 'center' },
  preset: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.offWhite,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  presetDot: { width: 8, height: 8, borderRadius: 4 },
  presetText: { fontSize: 11, color: colors.grayDark, fontWeight: '600' },
});
