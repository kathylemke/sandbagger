import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Platform } from 'react-native';
import { colors } from '../lib/theme';

interface ScannedHole {
  hole: number;
  par: number | null;
  score: number | null;
  putts: number | null;
  fairway_hit: boolean | null;
  gir: boolean | null;
  penalties: number | null;
}

interface ScannedData {
  course_name: string | null;
  date: string | null;
  tee_color: string | null;
  weather: string | null;
  holes: ScannedHole[];
  front_9_total: number | null;
  back_9_total: number | null;
  total_score: number | null;
  total_putts: number | null;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: ScannedData) => void;
  initialData?: Partial<ScannedData>;
}

const OPENAI_API_KEY = 'sk-proj-ceUGQnbSF4ZoZXbl0HXNiAaW';

export default function ScorecardScanner({ visible, onClose, onConfirm, initialData }: Props) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedData, setScannedData] = useState<ScannedData | null>(initialData as ScannedData || null);
  const [editMode, setEditMode] = useState(false);

  const scanImage = async (imageBase64: string) => {
    setScanning(true);
    setError(null);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${OPENAI_API_KEY}` 
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [{ 
            role: 'user', 
            content: [
              { 
                type: 'text', 
                text: `You are a golf scorecard OCR expert. Extract ALL data from this scorecard image with extreme precision.

Return ONLY valid JSON with this exact structure:
{
  "course_name": "string or null",
  "date": "YYYY-MM-DD or null",
  "tee_color": "string or null (e.g., 'Blue', 'White', 'Red')",
  "weather": "string or null",
  "holes": [
    {
      "hole": 1,
      "par": 4,
      "score": 5,
      "putts": 2,
      "fairway_hit": true,
      "gir": false,
      "penalties": 0
    }
  ],
  "front_9_total": number or null,
  "back_9_total": number or null,
  "total_score": number or null,
  "total_putts": number or null
}

Important extraction rules:
1. Include ALL holes (9 or 18 typically)
2. Par values are usually printed on the card (3, 4, or 5)
3. Scores are handwritten numbers in the main grid
4. Putts may be in a separate row or circled
5. Fairway hits/GIR may be marked with ✓, X, circles, or dots
6. Look for front 9, back 9, and total rows
7. Course name is usually at the top
8. Date may be handwritten
9. If a value is unclear or missing, use null
10. fairway_hit should be null for par 3s (no fairway)

Be thorough - extract every visible number and marking.` 
              },
              { type: 'image_url', image_url: { url: imageBase64, detail: 'high' } }
            ] 
          }],
          max_tokens: 3000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content
        .replace(/```json\n?|```\n?/g, '')
        .trim();
      
      const parsed = JSON.parse(content);
      
      // Validate and normalize the data
      const normalized: ScannedData = {
        course_name: parsed.course_name || null,
        date: parsed.date || null,
        tee_color: parsed.tee_color || null,
        weather: parsed.weather || null,
        holes: (parsed.holes || []).map((h: any, i: number) => ({
          hole: h.hole || i + 1,
          par: typeof h.par === 'number' ? h.par : null,
          score: typeof h.score === 'number' ? h.score : null,
          putts: typeof h.putts === 'number' ? h.putts : null,
          fairway_hit: typeof h.fairway_hit === 'boolean' ? h.fairway_hit : null,
          gir: typeof h.gir === 'boolean' ? h.gir : null,
          penalties: typeof h.penalties === 'number' ? h.penalties : 0,
        })),
        front_9_total: parsed.front_9_total || null,
        back_9_total: parsed.back_9_total || null,
        total_score: parsed.total_score || null,
        total_putts: parsed.total_putts || null,
      };

      // Ensure we have 18 holes (fill with nulls if needed)
      while (normalized.holes.length < 18) {
        normalized.holes.push({
          hole: normalized.holes.length + 1,
          par: null,
          score: null,
          putts: null,
          fairway_hit: null,
          gir: null,
          penalties: null,
        });
      }

      setScannedData(normalized);
      setEditMode(true);
    } catch (err: any) {
      console.error('Scan error:', err);
      setError(err.message || 'Failed to scan scorecard');
    } finally {
      setScanning(false);
    }
  };

  const handleFileSelect = async (e: any) => {
    const file = e.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev: any) => {
      scanImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const updateHole = (holeIdx: number, field: keyof ScannedHole, value: any) => {
    if (!scannedData) return;
    const updated = { ...scannedData };
    updated.holes = updated.holes.map((h, i) => 
      i === holeIdx ? { ...h, [field]: value } : h
    );
    
    // Recalculate totals
    const front9 = updated.holes.slice(0, 9);
    const back9 = updated.holes.slice(9, 18);
    updated.front_9_total = front9.reduce((sum, h) => sum + (h.score || 0), 0) || null;
    updated.back_9_total = back9.reduce((sum, h) => sum + (h.score || 0), 0) || null;
    updated.total_score = (updated.front_9_total || 0) + (updated.back_9_total || 0) || null;
    updated.total_putts = updated.holes.reduce((sum, h) => sum + (h.putts || 0), 0) || null;
    
    setScannedData(updated);
  };

  const handleConfirm = () => {
    if (scannedData) {
      onConfirm(scannedData);
    }
  };

  // Initial scan view
  if (!scannedData) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.header}>
              <Text style={s.title}>📷 Scan Scorecard</Text>
              <TouchableOpacity onPress={onClose}>
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={s.content}>
              <View style={s.uploadArea}>
                <Text style={s.uploadIcon}>📄</Text>
                <Text style={s.uploadTitle}>Upload Scorecard Photo</Text>
                <Text style={s.uploadDesc}>
                  Take a photo or upload an image of your scorecard. 
                  We'll extract all the data for you to verify.
                </Text>
                
                {Platform.OS === 'web' && (
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="scorecard-scan-input"
                    style={{ display: 'none' } as any}
                    onChange={handleFileSelect}
                  />
                )}
                
                <TouchableOpacity 
                  style={s.uploadBtn}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      document.getElementById('scorecard-scan-input')?.click();
                    }
                  }}
                  disabled={scanning}
                >
                  <Text style={s.uploadBtnText}>
                    {scanning ? '⏳ Scanning...' : '📷 Choose Photo'}
                  </Text>
                </TouchableOpacity>
                
                {error && (
                  <View style={s.errorBox}>
                    <Text style={s.errorText}>❌ {error}</Text>
                  </View>
                )}
              </View>
              
              <View style={s.tips}>
                <Text style={s.tipsTitle}>📋 Tips for best results:</Text>
                <Text style={s.tip}>• Lay the scorecard flat with good lighting</Text>
                <Text style={s.tip}>• Include the entire card in the frame</Text>
                <Text style={s.tip}>• Make sure scores are clearly visible</Text>
                <Text style={s.tip}>• Works with any scorecard format</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  // Edit/verify view
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={s.overlay}>
        <View style={s.modal}>
          <View style={s.header}>
            <Text style={s.title}>✅ Verify Scores</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={s.scrollContent}>
            {/* Course info */}
            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Course</Text>
              <TextInput
                style={s.infoInput}
                value={scannedData.course_name || ''}
                onChangeText={v => setScannedData({ ...scannedData, course_name: v })}
                placeholder="Course name"
                placeholderTextColor={colors.gray}
              />
            </View>
            
            <View style={s.infoRowHalf}>
              <View style={s.halfField}>
                <Text style={s.infoLabel}>Date</Text>
                <TextInput
                  style={s.infoInput}
                  value={scannedData.date || ''}
                  onChangeText={v => setScannedData({ ...scannedData, date: v })}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.gray}
                />
              </View>
              <View style={s.halfField}>
                <Text style={s.infoLabel}>Tees</Text>
                <TextInput
                  style={s.infoInput}
                  value={scannedData.tee_color || ''}
                  onChangeText={v => setScannedData({ ...scannedData, tee_color: v })}
                  placeholder="Blue"
                  placeholderTextColor={colors.gray}
                />
              </View>
            </View>
            
            {/* Totals summary */}
            <View style={s.totalsRow}>
              <View style={s.totalBox}>
                <Text style={s.totalNum}>{scannedData.total_score || '—'}</Text>
                <Text style={s.totalLabel}>Total</Text>
              </View>
              <View style={s.totalBox}>
                <Text style={s.totalNum}>{scannedData.front_9_total || '—'}</Text>
                <Text style={s.totalLabel}>Front 9</Text>
              </View>
              <View style={s.totalBox}>
                <Text style={s.totalNum}>{scannedData.back_9_total || '—'}</Text>
                <Text style={s.totalLabel}>Back 9</Text>
              </View>
              <View style={s.totalBox}>
                <Text style={s.totalNum}>{scannedData.total_putts || '—'}</Text>
                <Text style={s.totalLabel}>Putts</Text>
              </View>
            </View>
            
            {/* Instructions */}
            <View style={s.instructions}>
              <Text style={s.instructionsText}>
                ⚠️ Review and correct any errors below. Tap values to edit.
              </Text>
            </View>
            
            {/* Hole-by-hole table */}
            <View style={s.table}>
              <View style={s.tableHeader}>
                <Text style={[s.tableCell, s.headerCell, { flex: 0.5 }]}>Hole</Text>
                <Text style={[s.tableCell, s.headerCell]}>Par</Text>
                <Text style={[s.tableCell, s.headerCell]}>Score</Text>
                <Text style={[s.tableCell, s.headerCell]}>Putts</Text>
                <Text style={[s.tableCell, s.headerCell]}>FW</Text>
                <Text style={[s.tableCell, s.headerCell]}>GIR</Text>
              </View>
              
              {scannedData.holes.map((hole, idx) => (
                <View key={idx} style={[s.tableRow, idx % 2 === 0 && s.tableRowAlt]}>
                  <Text style={[s.tableCell, { flex: 0.5, fontWeight: '700' }]}>{hole.hole}</Text>
                  <TextInput
                    style={[s.tableCell, s.editableCell]}
                    value={hole.par?.toString() || ''}
                    onChangeText={v => updateHole(idx, 'par', parseInt(v) || null)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <TextInput
                    style={[s.tableCell, s.editableCell, s.scoreCell]}
                    value={hole.score?.toString() || ''}
                    onChangeText={v => updateHole(idx, 'score', parseInt(v) || null)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <TextInput
                    style={[s.tableCell, s.editableCell]}
                    value={hole.putts?.toString() || ''}
                    onChangeText={v => updateHole(idx, 'putts', parseInt(v) || null)}
                    keyboardType="number-pad"
                    selectTextOnFocus
                  />
                  <TouchableOpacity 
                    style={s.tableCell}
                    onPress={() => {
                      // Cycle: null -> true -> false -> null
                      const next = hole.fairway_hit === null ? true : hole.fairway_hit === true ? false : null;
                      updateHole(idx, 'fairway_hit', next);
                    }}
                  >
                    <Text style={s.toggleText}>
                      {hole.fairway_hit === null ? '—' : hole.fairway_hit ? '✓' : '✗'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={s.tableCell}
                    onPress={() => {
                      const next = hole.gir === null ? true : hole.gir === true ? false : null;
                      updateHole(idx, 'gir', next);
                    }}
                  >
                    <Text style={s.toggleText}>
                      {hole.gir === null ? '—' : hole.gir ? '✓' : '✗'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
          
          <View style={s.footer}>
            <TouchableOpacity style={s.rescanBtn} onPress={() => setScannedData(null)}>
              <Text style={s.rescanBtnText}>📷 Rescan</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
              <Text style={s.confirmBtnText}>✓ Use These Scores</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '95%', flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: colors.grayLight, backgroundColor: colors.primary, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { fontSize: 20, fontWeight: '800', color: colors.gold },
  closeBtn: { fontSize: 24, color: colors.white, padding: 4 },
  content: { flex: 1, padding: 20 },
  scrollContent: { flex: 1, padding: 16 },
  
  // Upload area
  uploadArea: { backgroundColor: colors.offWhite, borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 2, borderColor: colors.grayLight, borderStyle: 'dashed' },
  uploadIcon: { fontSize: 48, marginBottom: 12 },
  uploadTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  uploadDesc: { fontSize: 14, color: colors.grayDark, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  uploadBtn: { backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
  uploadBtnText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  
  errorBox: { marginTop: 16, padding: 12, backgroundColor: '#fef2f2', borderRadius: 8 },
  errorText: { color: '#dc2626', fontSize: 14 },
  
  tips: { marginTop: 24, padding: 16, backgroundColor: colors.offWhite, borderRadius: 12 },
  tipsTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  tip: { fontSize: 13, color: colors.grayDark, marginBottom: 4 },
  
  // Info fields
  infoRow: { marginBottom: 12 },
  infoRowHalf: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  halfField: { flex: 1 },
  infoLabel: { fontSize: 12, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  infoInput: { backgroundColor: colors.offWhite, borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: colors.grayLight },
  
  // Totals
  totalsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  totalBox: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  totalNum: { fontSize: 24, fontWeight: '800', color: colors.gold },
  totalLabel: { fontSize: 11, color: colors.white, opacity: 0.8 },
  
  instructions: { backgroundColor: '#fef3c7', borderRadius: 8, padding: 10, marginBottom: 12 },
  instructionsText: { fontSize: 13, color: '#92400e', textAlign: 'center' },
  
  // Table
  table: { backgroundColor: colors.white, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  tableHeader: { flexDirection: 'row', backgroundColor: colors.primary, padding: 10 },
  headerCell: { color: colors.white, fontWeight: '700', fontSize: 12 },
  tableRow: { flexDirection: 'row', padding: 8, borderBottomWidth: 1, borderBottomColor: colors.grayLight },
  tableRowAlt: { backgroundColor: colors.offWhite },
  tableCell: { flex: 1, textAlign: 'center', fontSize: 14, alignItems: 'center', justifyContent: 'center' },
  editableCell: { backgroundColor: colors.white, borderRadius: 6, padding: 6, marginHorizontal: 2, borderWidth: 1, borderColor: colors.grayLight },
  scoreCell: { fontWeight: '700' },
  toggleText: { fontSize: 16, fontWeight: '700', color: colors.primary },
  
  // Footer
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: colors.grayLight },
  rescanBtn: { flex: 0.4, padding: 14, borderRadius: 10, backgroundColor: colors.offWhite, alignItems: 'center' },
  rescanBtnText: { fontSize: 15, fontWeight: '700', color: colors.grayDark },
  confirmBtn: { flex: 0.6, padding: 14, borderRadius: 10, backgroundColor: colors.gold, alignItems: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: colors.primary },
});
