import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Modal, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/AuthContext';
import { updateProfile } from '../../lib/auth';
import { colors } from '../../lib/theme';

const BAG_CATEGORIES: { key: string; label: string; clubs: string[] }[] = [
  { key: 'woods', label: '🪵 Woods', clubs: ['Driver', '2W', '3W', '4W', '5W', '7W', '9W', '11W'] },
  { key: 'hybrids', label: '🔄 Hybrids', clubs: ['2H', '3H', '4H', '5H', '6H', '7H'] },
  { key: 'irons', label: '⛳ Irons', clubs: ['1i', '2i', '3i', '4i', '5i', '6i', '7i', '8i', '9i'] },
  { key: 'wedges', label: '🎯 Wedges', clubs: ['PW', 'AW', 'GW', 'SW', 'LW', '46°', '48°', '50°', '52°', '54°', '56°', '58°', '60°', '62°', '64°'] },
  { key: 'putter', label: '🏌️ Putter', clubs: ['Putter'] },
];
const ALL_CLUBS_ORDERED = BAG_CATEGORIES.flatMap(c => c.clubs);
const MAX_BAG = 14;

interface FollowRow { id: string; user_id: string; target_id: string; }
interface UserInfo { id: string; display_name: string; username: string; }

export default function Profile() {
  const { user, logout, setUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [handicap, setHandicap] = useState(user?.handicap?.toString() || '');
  const [following, setFollowing] = useState<(FollowRow & { profile: UserInfo; mutual: boolean })[]>([]);
  const [followers, setFollowers] = useState<(FollowRow & { profile: UserInfo; mutual: boolean })[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserInfo[]>([]);
  const [coachNotes, setCoachNotes] = useState<any[]>([]);
  const [practicePlans, setPracticePlans] = useState<any[]>([]);
  const [bag, setBag] = useState<string[]>([]);
  const [expandedBagCat, setExpandedBagCat] = useState<string | null>(null);

  const bagKey = user ? `sandbagger_bag_${user.id}` : null;

  const loadBag = useCallback(async () => {
    if (!bagKey) return;
    try {
      const stored = await AsyncStorage.getItem(bagKey);
      if (stored) setBag(JSON.parse(stored));
    } catch {}
  }, [bagKey]);

  const saveBag = useCallback(async (newBag: string[]) => {
    setBag(newBag);
    if (bagKey) {
      try { await AsyncStorage.setItem(bagKey, JSON.stringify(newBag)); } catch {}
    }
  }, [bagKey]);

  const toggleClub = (club: string) => {
    if (bag.includes(club)) {
      saveBag(bag.filter(c => c !== club));
    } else if (bag.length < MAX_BAG) {
      saveBag([...bag, club]);
    }
  };

  useEffect(() => { loadData(); loadBag(); }, [user]);

  const loadData = async () => {
    if (!user) return;

    // Get all follows where I'm involved
    const { data: rels } = await supabase.from('sb_relationships')
      .select('id, user_id, target_id')
      .or(`user_id.eq.${user.id},target_id.eq.${user.id}`)
      .eq('type', 'follow')
      .eq('status', 'accepted');

    const allRels = rels || [];
    const myFollows = allRels.filter(r => r.user_id === user.id); // people I follow
    const myFollowers = allRels.filter(r => r.target_id === user.id); // people following me

    const followingIds = new Set(myFollows.map(r => r.target_id));
    const followerIds = new Set(myFollowers.map(r => r.user_id));

    // Fetch user profiles
    const allIds = [...new Set([...followingIds, ...followerIds])];
    let userMap = new Map<string, UserInfo>();
    if (allIds.length) {
      const { data: users } = await supabase.from('sb_users').select('id, display_name, username').in('id', allIds);
      userMap = new Map((users || []).map(u => [u.id, u]));
    }

    setFollowing(myFollows.map(r => ({
      ...r,
      profile: userMap.get(r.target_id) || { id: r.target_id, display_name: 'Unknown', username: 'unknown' },
      mutual: followerIds.has(r.target_id), // they also follow me back
    })));

    setFollowers(myFollowers.map(r => ({
      ...r,
      profile: userMap.get(r.user_id) || { id: r.user_id, display_name: 'Unknown', username: 'unknown' },
      mutual: followingIds.has(r.user_id), // I also follow them
    })));

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
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const { data } = await supabase.from('sb_users').select('id, display_name, username')
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq('id', user?.id || '')
      .limit(10);
    setSearchResults(data || []);
  };

  const followUser = async (targetId: string) => {
    if (!user) return;
    await supabase.from('sb_relationships').insert({ user_id: user.id, target_id: targetId, type: 'follow', status: 'accepted' });
    loadData();
  };

  const unfollowUser = async (targetId: string) => {
    if (!user) return;
    await supabase.from('sb_relationships').delete()
      .eq('user_id', user.id)
      .eq('target_id', targetId)
      .eq('type', 'follow');
    loadData();
  };

  const alreadyFollowing = new Set(following.map(f => f.target_id));

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
        <View style={s.statsRow}>
          <View style={s.statItem}><Text style={s.statNum}>{following.length}</Text><Text style={s.statLabel}>Following</Text></View>
          <View style={s.statItem}><Text style={s.statNum}>{followers.length}</Text><Text style={s.statLabel}>Followers</Text></View>
          <View style={s.statItem}><Text style={s.statNum}>{following.filter(f => f.mutual).length}</Text><Text style={s.statLabel}>Mutual</Text></View>
        </View>
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

      {/* My Bag */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>🏌️ My Bag ({bag.length}/{MAX_BAG})</Text>
          {bag.length === MAX_BAG && <Text style={{ color: colors.gold, fontWeight: '700', fontSize: 12 }}>Bag Full</Text>}
        </View>

        {bag.length > 0 ? (
          <View style={bagS.currentBag}>
            {ALL_CLUBS_ORDERED.filter(c => bag.includes(c)).map(club => (
              <TouchableOpacity key={club} style={bagS.bagClubPill} onPress={() => toggleClub(club)}>
                <Text style={bagS.bagClubText}>{club}</Text>
                <Text style={bagS.bagClubX}>✕</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={s.emptyText}>Tap clubs below to build your bag</Text>
        )}

        {BAG_CATEGORIES.map(cat => {
          const isOpen = expandedBagCat === cat.key;
          const catCount = cat.clubs.filter(c => bag.includes(c)).length;
          return (
            <View key={cat.key} style={bagS.catSection}>
              <TouchableOpacity style={bagS.catHeader} onPress={() => setExpandedBagCat(isOpen ? null : cat.key)}>
                <Text style={bagS.catTitle}>{cat.label}{catCount > 0 ? ` (${catCount})` : ''}</Text>
                <Text style={bagS.catArrow}>{isOpen ? '▾' : '▸'}</Text>
              </TouchableOpacity>
              {isOpen && (
                <View style={bagS.catBody}>
                  {cat.clubs.map(club => {
                    const inBag = bag.includes(club);
                    const disabled = !inBag && bag.length >= MAX_BAG;
                    return (
                      <TouchableOpacity key={club}
                        style={[bagS.clubPill, inBag && bagS.clubPillActive, disabled && bagS.clubPillDisabled]}
                        onPress={() => !disabled && toggleClub(club)} disabled={disabled}>
                        <Text style={[bagS.clubPillText, inBag && bagS.clubPillTextActive, disabled && { color: colors.grayLight }]}>{club}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Following */}
      <View style={s.section}>
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Following</Text>
          <TouchableOpacity onPress={() => setShowSearch(true)}>
            <Text style={s.addText}>+ Follow</Text>
          </TouchableOpacity>
        </View>
        {following.length === 0 ? (
          <Text style={s.emptyText}>Not following anyone yet</Text>
        ) : (
          following.map(f => (
            <View key={f.id} style={s.partnerCard}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={s.partnerName}>{f.profile.display_name || f.profile.username}</Text>
                  {f.mutual && <Text style={s.mutualBadge}>🤝 Mutual</Text>}
                </View>
                <Text style={s.partnerUsername}>@{f.profile.username}</Text>
              </View>
              <TouchableOpacity style={s.unfollowBtn} onPress={() => unfollowUser(f.target_id)}>
                <Text style={s.unfollowBtnText}>Unfollow</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* Followers */}
      <View style={s.section}>
        <Text style={[s.sectionTitle, { marginBottom: 12 }]}>Followers</Text>
        {followers.length === 0 ? (
          <Text style={s.emptyText}>No followers yet</Text>
        ) : (
          followers.map(f => (
            <View key={f.id} style={s.partnerCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.partnerName}>{f.profile.display_name || f.profile.username}</Text>
                <Text style={s.partnerUsername}>@{f.profile.username}</Text>
              </View>
              {f.mutual ? (
                <Text style={s.mutualBadge}>🤝 Mutual</Text>
              ) : (
                <TouchableOpacity style={s.followBackBtn} onPress={() => followUser(f.user_id)}>
                  <Text style={s.followBackBtnText}>Follow Back</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
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

      {/* Search & Follow Modal */}
      <Modal visible={showSearch} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modal}>
            <Text style={s.modalTitle}>Search & Follow</Text>
            <TextInput style={s.input} placeholder="Search by username..." placeholderTextColor={colors.gray} value={searchQuery} onChangeText={searchUsers} />
            <FlatList
              data={searchResults}
              keyExtractor={i => i.id}
              style={{ maxHeight: 300 }}
              renderItem={({ item }) => (
                <View style={s.searchResult}>
                  <View>
                    <Text style={s.searchResultName}>{item.display_name}</Text>
                    <Text style={s.searchResultUser}>@{item.username}</Text>
                  </View>
                  {alreadyFollowing.has(item.id) ? (
                    <Text style={s.mutualBadge}>Following ✓</Text>
                  ) : (
                    <TouchableOpacity style={s.followBackBtn} onPress={() => { followUser(item.id); setSearchResults(prev => prev.filter(r => r.id !== item.id)); }}>
                      <Text style={s.followBackBtnText}>Follow</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
            <TouchableOpacity style={s.closeBtn} onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
              <Text style={s.closeBtnText}>Close</Text>
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
  statsRow: { flexDirection: 'row', gap: 24, marginTop: 16 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '800', color: colors.primary },
  statLabel: { fontSize: 11, color: colors.grayDark, marginTop: 2 },
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
  mutualBadge: { fontSize: 12, fontWeight: '600', color: colors.primaryLight },
  unfollowBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: colors.red },
  unfollowBtnText: { color: colors.red, fontSize: 12, fontWeight: '600' },
  followBackBtn: { backgroundColor: colors.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  followBackBtnText: { color: colors.primaryDark, fontSize: 12, fontWeight: '700' },
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
  searchResult: { padding: 12, borderBottomWidth: 1, borderBottomColor: colors.grayLight, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchResultName: { fontSize: 15, fontWeight: '600', color: colors.primary },
  searchResultUser: { fontSize: 13, color: colors.grayDark },
  closeBtn: { marginTop: 12, padding: 12, alignItems: 'center' },
  closeBtnText: { color: colors.red, fontWeight: '600' },
});

const bagS = StyleSheet.create({
  currentBag: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  bagClubPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  bagClubText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  bagClubX: { color: colors.gold, fontSize: 11, opacity: 0.7 },
  catSection: { backgroundColor: colors.white, borderRadius: 10, marginTop: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.grayLight },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: colors.primaryDark },
  catTitle: { fontSize: 14, fontWeight: '700', color: colors.gold },
  catArrow: { fontSize: 14, color: colors.gold },
  catBody: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 12 },
  clubPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, backgroundColor: colors.offWhite, borderWidth: 1, borderColor: colors.grayLight },
  clubPillActive: { backgroundColor: colors.primary, borderColor: colors.gold },
  clubPillDisabled: { opacity: 0.4 },
  clubPillText: { fontSize: 13, fontWeight: '600', color: colors.grayDark },
  clubPillTextActive: { color: colors.gold },
});
