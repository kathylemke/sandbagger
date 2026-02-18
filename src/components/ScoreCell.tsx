import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../lib/theme';

const BIRDIE_COLOR = '#D32F2F'; // red circles for under par
const BOGEY_COLOR = '#1B4332'; // green boxes for over par

interface ScoreCellProps {
  score: number;
  par: number;
  size?: number; // font size, default 14
  mini?: boolean; // compact mode for mini scorecards
}

export default function ScoreCell({ score, par, size = 14, mini = false }: ScoreCellProps) {
  if (!score || !par) {
    return <Text style={[styles.base, { fontSize: size }]}>—</Text>;
  }

  const diff = score - par;
  const cellSize = mini ? size + 10 : size + 14;

  // Eagle or better: double circle (gold)
  if (diff <= -2) {
    return (
      <View style={[styles.center, { width: cellSize, height: cellSize }]}>
        <View style={[styles.circleOuter, { width: cellSize, height: cellSize, borderRadius: cellSize / 2, borderColor: BIRDIE_COLOR }]}>
          <View style={[styles.circleInner, { width: cellSize - 6, height: cellSize - 6, borderRadius: (cellSize - 6) / 2, borderColor: BIRDIE_COLOR }]}>
            <Text style={[styles.scoreText, { fontSize: size, color: BIRDIE_COLOR }]}>{score}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Birdie: single circle (gold)
  if (diff === -1) {
    return (
      <View style={[styles.center, { width: cellSize, height: cellSize }]}>
        <View style={[styles.circle, { width: cellSize, height: cellSize, borderRadius: cellSize / 2, borderColor: BIRDIE_COLOR }]}>
          <Text style={[styles.scoreText, { fontSize: size, color: BIRDIE_COLOR }]}>{score}</Text>
        </View>
      </View>
    );
  }

  // Par: no styling
  if (diff === 0) {
    return (
      <View style={[styles.center, { width: cellSize, height: cellSize }]}>
        <Text style={[styles.scoreText, { fontSize: size }]}>{score}</Text>
      </View>
    );
  }

  // Bogey: single box
  if (diff === 1) {
    return (
      <View style={[styles.center, { width: cellSize, height: cellSize }]}>
        <View style={[styles.box, { width: cellSize, height: cellSize, borderColor: BOGEY_COLOR }]}>
          <Text style={[styles.scoreText, { fontSize: size, color: BOGEY_COLOR }]}>{score}</Text>
        </View>
      </View>
    );
  }

  // Double bogey: double box
  if (diff === 2) {
    return (
      <View style={[styles.center, { width: cellSize, height: cellSize }]}>
        <View style={[styles.box, { width: cellSize, height: cellSize, borderColor: BOGEY_COLOR }]}>
          <View style={[styles.boxInner, { width: cellSize - 6, height: cellSize - 6, borderColor: BOGEY_COLOR }]}>
            <Text style={[styles.scoreText, { fontSize: size, color: BOGEY_COLOR }]}>{score}</Text>
          </View>
        </View>
      </View>
    );
  }

  // Triple bogey+: triple box
  return (
    <View style={[styles.center, { width: cellSize, height: cellSize }]}>
      <View style={[styles.box, { width: cellSize, height: cellSize, borderColor: BOGEY_COLOR }]}>
        <View style={[styles.boxInner, { width: cellSize - 5, height: cellSize - 5, borderColor: BOGEY_COLOR }]}>
          <View style={[styles.boxInner, { width: cellSize - 10, height: cellSize - 10, borderColor: BOGEY_COLOR }]}>
            <Text style={[styles.scoreText, { fontSize: size, color: BOGEY_COLOR }]}>{score}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  base: { textAlign: 'center', fontWeight: '700', color: colors.black },
  scoreText: { fontWeight: '700', textAlign: 'center', color: colors.black },
  circle: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  circleOuter: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  circleInner: { borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  box: { borderWidth: 2, borderRadius: 2, alignItems: 'center', justifyContent: 'center' },
  boxInner: { borderWidth: 2, borderRadius: 1, alignItems: 'center', justifyContent: 'center' },
});
