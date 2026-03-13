import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, Animated, Easing } from 'react-native';
import { colors } from '../lib/theme';

const WIND_DIRECTIONS = [
  { deg: 0, label: 'N', full: 'North' },
  { deg: 45, label: 'NE', full: 'Northeast' },
  { deg: 90, label: 'E', full: 'East' },
  { deg: 135, label: 'SE', full: 'Southeast' },
  { deg: 180, label: 'S', full: 'South' },
  { deg: 225, label: 'SW', full: 'Southwest' },
  { deg: 270, label: 'W', full: 'West' },
  { deg: 315, label: 'NW', full: 'Northwest' },
];

interface Props {
  value: number | null; // degrees 0-360
  onChange: (deg: number | null) => void;
  size?: number;
}

export default function WindDirectionDial({ value, onChange, size = 120 }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const spinAnim = useRef(new Animated.Value(value || 0)).current;
  const dialRef = useRef<View>(null);
  const [dialLayout, setDialLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const handleLayout = () => {
    dialRef.current?.measure((x, y, width, height, pageX, pageY) => {
      setDialLayout({ x: pageX, y: pageY, width, height });
    });
  };

  const getAngleFromTouch = (touchX: number, touchY: number): number => {
    const centerX = dialLayout.x + dialLayout.width / 2;
    const centerY = dialLayout.y + dialLayout.height / 2;
    const dx = touchX - centerX;
    const dy = touchY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return Math.round(angle / 22.5) * 22.5 % 360; // Snap to 22.5 degree increments
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (_, gestureState) => {
      setIsDragging(true);
    },
    onPanResponderMove: (evt, gestureState) => {
      const angle = getAngleFromTouch(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      spinAnim.setValue(angle);
      onChange(angle);
    },
    onPanResponderRelease: () => {
      setIsDragging(false);
    },
  });

  const selectDirection = (deg: number) => {
    const newVal = value === deg ? null : deg;
    if (newVal !== null) {
      Animated.timing(spinAnim, {
        toValue: newVal,
        duration: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    }
    onChange(newVal);
  };

  const needleRotation = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const getDirectionLabel = (): string => {
    if (value === null) return 'Tap to set';
    const closest = WIND_DIRECTIONS.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.deg - value);
      const currDiff = Math.abs(curr.deg - value);
      return currDiff < prevDiff ? curr : prev;
    });
    return closest.full;
  };

  return (
    <View style={s.container}>
      <View
        ref={dialRef}
        style={[s.dial, { width: size, height: size }]}
        onLayout={handleLayout}
        {...panResponder.panHandlers}
      >
        {/* Direction markers */}
        {WIND_DIRECTIONS.map((dir) => {
          const isSelected = value !== null && Math.abs(value - dir.deg) < 22.5;
          const radians = (dir.deg - 90) * (Math.PI / 180);
          const markerX = Math.cos(radians) * (size / 2 - 16);
          const markerY = Math.sin(radians) * (size / 2 - 16);
          
          return (
            <TouchableOpacity
              key={dir.deg}
              style={[
                s.dirMarker,
                {
                  left: size / 2 + markerX - 14,
                  top: size / 2 + markerY - 14,
                },
                isSelected && s.dirMarkerActive,
              ]}
              onPress={() => selectDirection(dir.deg)}
            >
              <Text style={[s.dirMarkerText, isSelected && s.dirMarkerTextActive]}>
                {dir.label}
              </Text>
            </TouchableOpacity>
          );
        })}
        
        {/* Center circle */}
        <View style={s.centerCircle}>
          <Text style={s.centerText}>🌬️</Text>
        </View>
        
        {/* Animated needle */}
        {value !== null && (
          <Animated.View
            style={[
              s.needle,
              {
                transform: [
                  { translateX: -2 },
                  { translateY: -(size / 2 - 30) / 2 },
                  { rotate: needleRotation },
                  { translateY: (size / 2 - 30) / 2 },
                ],
              },
            ]}
          >
            <View style={[s.needleArrow, { height: size / 2 - 30 }]} />
          </Animated.View>
        )}
      </View>
      
      <Text style={s.label}>{getDirectionLabel()}</Text>
      
      {value !== null && (
        <TouchableOpacity style={s.clearBtn} onPress={() => onChange(null)}>
          <Text style={s.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { alignItems: 'center' },
  dial: {
    borderRadius: 999,
    backgroundColor: colors.offWhite,
    borderWidth: 3,
    borderColor: colors.primary,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dirMarker: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.grayLight,
  },
  dirMarkerActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dirMarkerText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.grayDark,
  },
  dirMarkerTextActive: {
    color: colors.gold,
  },
  centerCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerText: {
    fontSize: 20,
  },
  needle: {
    position: 'absolute',
    width: 4,
    alignItems: 'center',
  },
  needleArrow: {
    width: 4,
    backgroundColor: colors.gold,
    borderRadius: 2,
  },
  label: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  clearBtn: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.grayLight,
  },
  clearBtnText: {
    fontSize: 12,
    color: colors.grayDark,
    fontWeight: '600',
  },
});
