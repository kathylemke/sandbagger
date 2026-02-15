import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { updateProfile } from '../../lib/auth';
import { colors } from '../../lib/theme';

interface Relationship { id: string; user_id: string; target_id: string; type: string; status: string; user?: any; target?: any; }

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [handicap, setHandicap] = useState(user?.handicap?.toString() || '');
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [partnerSearch, setPartnerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [coachNotes, setCoachNotes] = useState<any[]>([]);
  const [practicePlans, setPracticePlans] = useState<any[]>([]);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: rels } = await supabase.from('sb_relationships')
      .select('*')
      .or(`user_id.eq.${user.id},target_id.eq.${user.id}`);

    if (rels?.length) {
      const ids = [...new Set(rels.flatMap(r => [r.user_id, r.target_id]).filter(id => id !== user.id))];
      const { data: users } = await supabase.from('sb_users').select('id, display_name, username').in('id', ids);
      const userMap = new Map((users || []).map(u => [u.id, u]));
      setRelationships(rels.map(r => ({
        ...r,
        user: userMap.get(r.user_id),
        target: userMap.get(r.target_id),
      })));
    }

    if (user.profile_type === 'coach' || user.profile_type === 'both') {
      const { data: notes } = await supabase.from('sb_coach_notes').select('*').eq('coach_id', user.id).order('created_at', { ascending: false }).limit(20);
      setCoachNotes(notes || []);
    }

    const { data: plans } = await supabase.from('sb_practice_plans').select('*')
      .or(`coach_id.eq.${user.id},player_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    setPracticePlans(plans || []);
  };

  const saveProfile = async () => {
    if (!user) return;
    try {
      const updated = await updateProfile(user.id, {
        display_name: displayName,
        bio,
        handicap: handicap ? parseFloat(handicap) : null,
      } as any);
      setUser(updated);
      setEditing(false);
      Alert.alert('Saved', 'Profile updated');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const searchUsers = async (q: string) => {
    setPartnerSearch(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('sb_users').select('id, display_name, username')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', user?.id || '')
      .limit(10);
    setSearchResults(data || []);
  };

  const addRelationship = async (targetId: string, type: string) => {
    if (!user) return;
    await supabase.from('sb_relationships').insert({ user_id: user.id, target_id: targetId, type, status: 'accepted' });
    setShowAddPartner(false);
    setPartnerSearch('');
    loadData();
  };

  const partners = relationships.filter(r => r.type === 'playing_partner' && r.status === 'accepted');
  const followers = relationships.filter(r => r.type === 'follower');

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Profile Header */}
      <View style={s.profileHeader}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{(user?.display_name || '?')[0].toUpperCase()}</Text>
        </View>
        <Text style={s.displayName}>{user?.display_name || user?.username}</Text>
        <Text style={s.username}>@{user?.username}</Text>
        <View style={s.badges}>
          <View style={s.badge}><Text style={s.badgeText}>{user?.profile_type}</Text></View>
          {user?.handicap !== null && user?.handicap !== undefined && (
            <View style={s.badge}><Text style={s.badgeText}>HCP {user.handicap}</Text></View>
          )}
        </View>
        {user?.bio && <Text style={s.bio}>{user.bio}</Text>}
      </View>

      {/* Edit / Logout */}
      {!editing ? (
        <View style={s.actionRow}>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditing(true)}>
            <Text style={s.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Text style={s.logoutBtnText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={s.editForm}>
          <Text style={s.formLabel}>Display Name</Text>
          <TextInput style={s.input} value={displayName} onChangeText={setDisplayName} />
          <Text style={s.formLabel}>Bio</Text>
          <TextInput style={[s.input, { height: 80 }]} value={bio} onChangeText={setBio} multiline />
          <Text style={s.formLabel}>Handicap</Text>
          <TextInput style={s.input} value={handicap} onChangeText={setHandicap} keyboardType="decimal-pad" />
          <View style={s.actionRow}>
            <TouchableOpacity style={s.editBtn} onPress={saveProfile}><Text style={s.editBtnText}>Save</Text></TouchableOpacity>
            <TouchableOpacity style={s.logoutBtn} onPress={() => setEditing(false)}><Text style={s.logoutBtnText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      )}

      {/* Playing Partners */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Playing Partners</Text>
          <TouchableOpacity onPress={() => setShowAddPartner(true)}>
            <Text style={s.addText}>+ Add</Text>
          </TouchableOpacity>
        </View>
        {partners.length === 0 ? (
          <Text style={s.emptyText}>No playing partners yet</Text>
        ) : (
          partners.map(p => {
            const other = p.user_id === user?.id ? p.target : p.user;
            return (
              <View key={p.id} style={s.partnerCard}>
                <Text style={s.partnerName}>{other?.display_name || other?.username || 'Unknown'}</Text>
                <Text style={s.partnerUsername}>@{other?.username}</Text>
              </View>
            );
          })
        )}
      </View>

      {/* Practice Plans */}
      {practicePlans.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Practice Plans</Text>
          {practicePlans.map(p => (
            <View key={p.id} style={s.planCard}>
              <Text style={s.planTitle}>{p.title}</Text>
              <Text style={s.planDesc}>{p.description}</Text>
              <View style={s.planBadge}><Text style={s.planBadgeText}>{p.status}</Text></View>
            </View>
          ))}
        </View>
      )}

      {/* Coach Notes */}
      {coachNotes.length > 0 && (
        <View style={s.section}>
          <Text style={s.sectionTitle}>Coach Notes</Text>
          {coachNotes.map(n => (
            <View key={n.id} style={s.noteCard}>
              <Text style={s.noteCategory}>{n.category}</Text>
              <Text style={s.noteText}>{n.note}</Text>
              <Text style={s.noteDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Add Partner Modal */}
      <Modal visible={showAddPartner} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Add Playing Partner</Text>
            <TextInput style={s.input} placeholder="Search by username..." placeholderTextColor={colors.gray} value={partnerSearch} onChangeText={searchUsers} />
            <FlatList
              data={searchResults}
              keyExtractor={i => i.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={s.searchResult} onPress={() => addRelationship(item.id, 'playing_partner')}>
                  <Text style={s.searchResultName}>{item.display_name}</Text>
                  <Text style={s.searchResultUser}>@{item.username}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={s.closeBtn} onPress={() => setShowAddPartner(false)}>
              <Text style={s.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.offWhite },
  profileHeader: { alignItems: 'center', paddingVertical: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '800', color: colors.gold },
  displayName: { fontSize: 22, fontWeight: '800', color: colors.primary },
  username: { fontSize: 14, color: colors.grayDark, marginTop: 2 },
  badges: { flexDirection: 'row', gap: 8, marginTop: 10 },
  badge: { backgroundColor: colors.primary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { color: colors.gold, fontWeight: '600', fontSize: 12, textTransform: 'capitalize' },
  bio: { fontSize: 14, color: colors.grayDark, textAlign: 'center', marginTop: 12, paddingHorizontal: 20 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 16 },
  editBtn: { backgroundColor: colors.gold, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  editBtnText: { color: colors.primaryDark, fontWeight: '700' },
  logoutBtn: { borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12, borderWidth: 1, borderColor: colors.red },
  logoutBtnText: { color: colors.red, fontWeight: '600' },
  editForm: { backgroundColor: colors.white, borderRadius: 12, padding: 16 },
  formLabel: { fontSize: 13, fontWeight: '600', color: colors.primary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: colors.offWhite, borderRadius: 8, padding: 12, fontSize: 15, borderWidth: 1, borderColor: colors.grayLight },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.primary },
  addText: { color: colors.gold, fontWeight: '700' },
  emptyText: { color: colors.gray, fontSize: 14 },
  partnerCard: { backgroundColor: colors.white, borderRadius: 10, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  partnerName: { fontSize: 15, fontWeight: '600', color: colors.primary },
  partnerUsername: { fontSize: 13, color: colors.grayDark },
  planCard: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8 },
  planTitle: { fontSize: 15, fontWeight: '700', color: colors.primary },
  planDesc: { fontSize: 13, color: colors.grayDark, marginTop: 4 },
  planBadge: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: colors.primaryLight, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  planBadgeText: { color: colors.white, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  noteCard: { backgroundColor: colors.white, borderRadius: 10, padding: 14, marginBottom: 8 },
  noteCategory: { fontSize: 11, fontWeight: '700', color: colors.gold, textTransform: 'uppercase' },
  noteText: { fontSize: 14, color: colors.black, marginTop: 4 },
  noteDate: { fontSize: 11, color: colors.gray, marginTop: 6 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: colors.white, borderRadius: 16, padding: 20, maxHeight: '70%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 12 },
  searchResult: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.grayLight, flexDirection: 'row', justifyContent: 'space-between' },
  searchResultName: { fontSize: 15, fontWeight: '600', color: colors.primary },
  searchResultUser: { fontSize: 13, color: colors.grayDark },
  closeBtn: { marginTop: 12, padding: 12, alignItems: 'center' },
  closeBtnText: { color: colors.red, fontWeight: '600' },
});
