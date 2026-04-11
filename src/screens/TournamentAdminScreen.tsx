import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Modal } from 'react-native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import type { RealTeam, Player, Match } from '../types';
import MatchCenterModal from '../components/MatchCenterModal';

export default function TournamentAdminScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';
    const currentUser = useStore((state) => state.currentUser);

    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === leagueId);
    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);

    const [activeTab, setActiveTab] = useState<'teams' | 'matches'>('teams');

    // Team state
    const [teamName, setTeamName] = useState('');
    const [teamLogo, setTeamLogo] = useState('');
    const [selectedTeam, setSelectedTeam] = useState<RealTeam | null>(null);
    const [editingTeam, setEditingTeam] = useState<RealTeam | null>(null);
    const [editTeamName, setEditTeamName] = useState('');
    const [editTeamLogo, setEditTeamLogo] = useState('');

    // Player state
    const [playerName, setPlayerName] = useState('');
    const [playerPos, setPlayerPos] = useState('POR');
    const [playerRealPos, setPlayerRealPos] = useState('');
    const [playerAge, setPlayerAge] = useState('25');
    const [playerPrice, setPlayerPrice] = useState('1');
    const [isPlayerModalVisible, setPlayerModalVisible] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    // Match state
    const [matchday, setMatchday] = useState('1');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [matchType, setMatchType] = useState<'campionato' | 'gironi' | 'playoff' | 'playout'>('campionato');
    const [matchStage, setMatchStage] = useState('');
    const [matchDate, setMatchDate] = useState('');
    const [matchTime, setMatchTime] = useState('');

    // Match Center
    const [matchCenterMatch, setMatchCenterMatch] = useState<Match | null>(null);

    const isAdmin = league && currentUser && league.roles[currentUser.id] === 'admin';

    if (!league || !isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
            </View>
        );
    }

    // ---- TEAM HANDLERS ----
    const handleCreateTeam = () => {
        if (!teamName) return Alert.alert('Errore', 'Nome squadra richiesto.');
        const t: RealTeam = {
            id: uuidv4(), leagueId, name: teamName,
            logo: teamLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random`
        };
        useStore.setState(state => ({ realTeams: [...state.realTeams, t] }));
        setTeamName(''); setTeamLogo('');
        Alert.alert('Successo', 'Squadra creata!');
    };

    const handleDeleteTeam = (id: string) => {
        Alert.alert('Conferma', 'Eliminare questa squadra e i suoi giocatori?', [
            { text: 'Annulla', style: 'cancel' },
            { text: 'Elimina', style: 'destructive', onPress: () => { useStore.getState().deleteTeam(id); if (selectedTeam?.id === id) setSelectedTeam(null); } }
        ]);
    };

    const handleSaveTeamEdit = () => {
        if (!editingTeam) return;
        useStore.getState().updateTeam({ ...editingTeam, name: editTeamName, logo: editTeamLogo });
        setEditingTeam(null);
    };

    // ---- PLAYER HANDLERS ----
    const openPlayerModal = (player?: Player) => {
        if (player) {
            setEditingPlayer(player);
            setPlayerName(player.name);
            setPlayerPos(player.position);
            setPlayerRealPos(player.realPosition || '');
            setPlayerAge(player.age.toString());
            setPlayerPrice((player.price || 1).toString());
        } else {
            setEditingPlayer(null);
            setPlayerName(''); setPlayerRealPos(''); setPlayerAge('25'); setPlayerPrice('1');
        }
        setPlayerModalVisible(true);
    };

    const handleSavePlayer = () => {
        if (!playerName || !selectedTeam) return;
        if (editingPlayer) {
            useStore.setState(state => ({
                players: state.players.map(p => p.id === editingPlayer.id ? {
                    ...p, name: playerName, position: playerPos, realPosition: playerRealPos,
                    age: parseInt(playerAge) || 25, price: parseInt(playerPrice) || 1
                } : p)
            }));
        } else {
            const newP: Player = {
                id: uuidv4(), leagueId, name: playerName, position: playerPos,
                realPosition: playerRealPos || 'Sconosciuto', age: parseInt(playerAge) || 25,
                price: parseInt(playerPrice) || 1, realTeamId: selectedTeam.id, careerId: uuidv4()
            };
            useStore.setState(state => ({ players: [...state.players, newP] }));
        }
        setPlayerName(''); setPlayerModalVisible(false); setEditingPlayer(null);
    };

    const handleDeletePlayer = (id: string) => {
        useStore.setState(state => ({ players: state.players.filter(p => p.id !== id) }));
    };

    // ---- MATCH HANDLERS ----
    const handleCreateMatch = () => {
        if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) return Alert.alert('Errore', 'Seleziona due squadre diverse.');
        const newMatch: Match = {
            id: uuidv4(), leagueId, matchday: parseInt(matchday) || 1,
            homeTeamId, awayTeamId, homeScore: 0, awayScore: 0,
            events: [], playerVotes: {}, status: 'scheduled', isFantasyMatchday: false,
            matchType, stage: matchStage || undefined,
            scheduledDate: matchDate || undefined, scheduledTime: matchTime || undefined
        };
        useStore.setState(state => ({ matches: [...state.matches, newMatch] }));
        Alert.alert('Successo', 'Partita creata!');
    };

    const handleDeleteMatch = (id: string) => { useStore.getState().deleteMatch(id); };

    const handleChangeMatchStatus = (match: Match) => {
        const statuses: Match['status'][] = ['scheduled', 'in_progress', 'finished'];
        const nextIdx = (statuses.indexOf(match.status) + 1) % statuses.length;
        useStore.getState().updateMatch({ ...match, status: statuses[nextIdx] });
    };

    const statusColors: Record<string, string> = { scheduled: '#94a3b8', in_progress: '#f59e0b', finished: '#4ade80' };
    const statusLabels: Record<string, string> = { scheduled: 'PROGR.', in_progress: 'LIVE', finished: 'FINITA' };
    const matchTypeOptions: { value: string; label: string }[] = [
        { value: 'campionato', label: 'Camp.' }, { value: 'gironi', label: 'Gironi' },
        { value: 'playoff', label: 'Playoff' }, { value: 'playout', label: 'Playout' }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Admin Torneo Reale</Text>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'teams' && styles.tabBtnActive]} onPress={() => { setActiveTab('teams'); setSelectedTeam(null); }}>
                    <Text style={[styles.tabText, activeTab === 'teams' && styles.tabTextActive]}>Sq. e Giocatori</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'matches' && styles.tabBtnActive]} onPress={() => setActiveTab('matches')}>
                    <Text style={[styles.tabText, activeTab === 'matches' && styles.tabTextActive]}>Calendario Reale</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* ======= TEAMS LIST ======= */}
                {activeTab === 'teams' && !selectedTeam && (
                    <View>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Crea Nuova Squadra</Text>
                            <TextInput style={styles.input} placeholder="Nome Squadra" placeholderTextColor="#94a3b8" value={teamName} onChangeText={setTeamName} />
                            <TextInput style={styles.input} placeholder="URL Logo (opzionale)" placeholderTextColor="#94a3b8" value={teamLogo} onChangeText={setTeamLogo} />
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTeam}>
                                <Text style={styles.primaryBtnText}>Salva Squadra</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.sectionTitle}>Elenco Squadre ({realTeams.length})</Text>
                        {realTeams.length === 0 && <Text style={styles.emptyText}>Nessuna squadra.</Text>}
                        {realTeams.map(t => (
                            <TouchableOpacity key={t.id} style={styles.itemCard} onPress={() => setSelectedTeam(t)}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemTitle}>{t.name}</Text>
                                    <Text style={styles.itemSub}>{players.filter(p => p.realTeamId === t.id).length} giocatori</Text>
                                </View>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingTeam(t); setEditTeamName(t.name); setEditTeamLogo(t.logo); }}>
                                    <Text style={{ fontSize: 16 }}>✏️</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeleteTeam(t.id)}>
                                    <Text style={{ fontSize: 16 }}>🗑️</Text>
                                </TouchableOpacity>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* ======= TEAM DETAIL ======= */}
                {activeTab === 'teams' && selectedTeam && (() => {
                    const teamPlayers = players.filter(p => p.realTeamId === selectedTeam.id);
                    return (
                        <View>
                            <View style={[styles.card, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                                <View>
                                    <Text style={styles.cardTitle}>{selectedTeam.name}</Text>
                                    <Text style={styles.itemSub}>{teamPlayers.length} giocatori</Text>
                                </View>
                                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setSelectedTeam(null)}>
                                    <Text style={styles.secondaryBtnText}>Indietro</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity style={[styles.primaryBtn, { marginBottom: 20 }]} onPress={() => openPlayerModal()}>
                                <Text style={styles.primaryBtnText}>+ Aggiungi Giocatore</Text>
                            </TouchableOpacity>
                            {teamPlayers.map(p => (
                                <View key={p.id} style={styles.itemCard}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle}>{p.name}</Text>
                                        <Text style={styles.itemSub}>{p.position} | {p.realPosition || '?'} | {p.age}a | {p.price}CR</Text>
                                    </View>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => openPlayerModal(p)}>
                                        <Text style={{ fontSize: 16 }}>✏️</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => handleDeletePlayer(p.id)}>
                                        <Text style={{ fontSize: 16 }}>🗑️</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    );
                })()}

                {/* ======= MATCHES ======= */}
                {activeTab === 'matches' && (
                    <View>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Aggiungi Partita</Text>
                            {/* Match Type */}
                            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
                                {matchTypeOptions.map(mt => (
                                    <TouchableOpacity key={mt.value} style={[styles.mtChip, matchType === mt.value && styles.mtChipActive]} onPress={() => setMatchType(mt.value as any)}>
                                        <Text style={[styles.mtChipText, matchType === mt.value && { color: '#fbbf24' }]}>{mt.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Giornata" placeholderTextColor="#94a3b8" keyboardType="numeric" value={matchday} onChangeText={setMatchday} />
                                {(matchType === 'playoff' || matchType === 'playout') && (
                                    <TextInput style={[styles.input, { flex: 2 }]} placeholder="Fase (es. Quarti)" placeholderTextColor="#94a3b8" value={matchStage} onChangeText={setMatchStage} />
                                )}
                            </View>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Data (AAAA-MM-GG)" placeholderTextColor="#94a3b8" value={matchDate} onChangeText={setMatchDate} />
                                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Ora (HH:MM)" placeholderTextColor="#94a3b8" value={matchTime} onChangeText={setMatchTime} />
                            </View>
                            {/* Team selector chips */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                {realTeams.map(t => (
                                    <TouchableOpacity key={t.id}
                                        style={[styles.miniChip, homeTeamId === t.id ? styles.miniChipActiveHome : (awayTeamId === t.id ? styles.miniChipActiveAway : null)]}
                                        onPress={() => {
                                            if (homeTeamId === t.id) setHomeTeamId('');
                                            else if (awayTeamId === t.id) setAwayTeamId('');
                                            else if (!homeTeamId) setHomeTeamId(t.id);
                                            else if (!awayTeamId) setAwayTeamId(t.id);
                                        }}>
                                        <Text style={styles.miniChipText}>{t.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <Text style={styles.itemSub}>🏠 {realTeams.find(t => t.id === homeTeamId)?.name || '?'}  ·  ✈️ {realTeams.find(t => t.id === awayTeamId)?.name || '?'}</Text>
                            <TouchableOpacity style={[styles.primaryBtn, { marginTop: 12 }]} onPress={handleCreateMatch}>
                                <Text style={styles.primaryBtnText}>Crea Partita</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Calendario ({matches.length})</Text>
                        {matches.length === 0 && <Text style={styles.emptyText}>Nessuna partita programmata.</Text>}
                        {matches.sort((a, b) => b.matchday - a.matchday).map(m => {
                            const ht = realTeams.find(t => t.id === m.homeTeamId);
                            const at = realTeams.find(t => t.id === m.awayTeamId);
                            return (
                                <TouchableOpacity key={m.id} style={styles.matchCard} onPress={() => setMatchCenterMatch(m)}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.itemSub}>G{m.matchday}</Text>
                                            {m.matchType && m.matchType !== 'campionato' && (
                                                <View style={{ backgroundColor: 'rgba(251,191,36,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                                                    <Text style={{ color: '#fbbf24', fontSize: 10, fontWeight: 'bold' }}>{m.matchType.toUpperCase()}</Text>
                                                </View>
                                            )}
                                            {m.stage && <Text style={{ color: '#94a3b8', fontSize: 11 }}>{m.stage}</Text>}
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity onPress={() => handleChangeMatchStatus(m)}>
                                                <Text style={{ color: statusColors[m.status], fontSize: 11, fontWeight: 'bold', backgroundColor: statusColors[m.status] + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                                                    {statusLabels[m.status]}
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => handleDeleteMatch(m.id)}><Text>🗑️</Text></TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.itemTitle, { flex: 1 }]} numberOfLines={1}>{ht?.name}</Text>
                                        <View style={{ backgroundColor: 'rgba(15,23,42,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' }}>
                                            <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900' }}>{m.homeScore} - {m.awayScore}</Text>
                                        </View>
                                        <Text style={[styles.itemTitle, { flex: 1, textAlign: 'right' }]} numberOfLines={1}>{at?.name}</Text>
                                    </View>
                                    {m.events?.length > 0 && (
                                        <Text style={{ color: '#64748b', fontSize: 11, marginTop: 6 }}>📝 {m.events?.length} eventi registrati</Text>
                                    )}
                                    {m.scheduledDate && (
                                        <Text style={{ color: '#64748b', fontSize: 11, marginTop: 2 }}>📅 {m.scheduledDate}{m.scheduledTime ? ` ⏰ ${m.scheduledTime}` : ''}</Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}
            </ScrollView>

            {/* ======= PLAYER MODAL ======= */}
            <Modal visible={isPlayerModalVisible} transparent animationType="slide" onRequestClose={() => setPlayerModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.cardTitle}>{editingPlayer ? `Modifica ${editingPlayer.name}` : `Nuovo Giocatore in ${selectedTeam?.name}`}</Text>
                        <TextInput style={styles.input} placeholder="Nome Cognome" placeholderTextColor="#94a3b8" value={playerName} onChangeText={setPlayerName} />
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Cat. Fantasy (POR/DIF/CEN/ATT)" placeholderTextColor="#94a3b8" value={playerPos} onChangeText={setPlayerPos} />
                        </View>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Ruolo Reale" placeholderTextColor="#94a3b8" value={playerRealPos} onChangeText={setPlayerRealPos} />
                            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Età" keyboardType="numeric" placeholderTextColor="#94a3b8" value={playerAge} onChangeText={setPlayerAge} />
                        </View>
                        <TextInput style={styles.input} placeholder="Quotazione" keyboardType="numeric" placeholderTextColor="#94a3b8" value={playerPrice} onChangeText={setPlayerPrice} />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => { setPlayerModalVisible(false); setEditingPlayer(null); }}>
                                <Text style={styles.secondaryBtnText}>Annulla</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleSavePlayer}>
                                <Text style={styles.primaryBtnText}>{editingPlayer ? 'Aggiorna' : 'Aggiungi'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ======= EDIT TEAM MODAL ======= */}
            <Modal visible={!!editingTeam} transparent animationType="fade" onRequestClose={() => setEditingTeam(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.cardTitle}>Modifica Squadra</Text>
                        <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#94a3b8" value={editTeamName} onChangeText={setEditTeamName} />
                        <TextInput style={styles.input} placeholder="URL Logo" placeholderTextColor="#94a3b8" value={editTeamLogo} onChangeText={setEditTeamLogo} />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity style={[styles.secondaryBtn, { flex: 1 }]} onPress={() => setEditingTeam(null)}>
                                <Text style={styles.secondaryBtnText}>Annulla</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, { flex: 1 }]} onPress={handleSaveTeamEdit}>
                                <Text style={styles.primaryBtnText}>Salva</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ======= MATCH CENTER MODAL ======= */}
            {matchCenterMatch && (
                <MatchCenterModal match={matchCenterMatch} visible={!!matchCenterMatch} onClose={() => setMatchCenterMatch(null)} />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtnText: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    tabsContainer: { flexDirection: 'row', paddingVertical: 12, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', justifyContent: 'center' },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, borderRadius: 20 },
    tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: '#38bdf8' },
    tabText: { color: '#94a3b8', fontWeight: 'bold' },
    tabTextActive: { color: '#38bdf8' },
    content: { padding: 16, paddingBottom: 40 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginVertical: 12 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#38bdf8', marginBottom: 12 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 10 },
    primaryBtn: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
    secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#38bdf8', padding: 10, borderRadius: 12, alignItems: 'center' },
    secondaryBtnText: { color: '#38bdf8', fontWeight: 'bold' },
    itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, marginBottom: 8 },
    matchCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    itemTitle: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
    itemSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    iconBtn: { padding: 6, marginLeft: 4 },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 20 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 20, padding: 24 },
    miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8 },
    miniChipActiveHome: { backgroundColor: 'rgba(56, 189, 248, 0.3)', borderColor: '#38bdf8', borderWidth: 1 },
    miniChipActiveAway: { backgroundColor: 'rgba(239, 68, 68, 0.3)', borderColor: '#ef4444', borderWidth: 1 },
    miniChipText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
    mtChip: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
    mtChipActive: { backgroundColor: 'rgba(251,191,36,0.15)', borderWidth: 1, borderColor: '#fbbf24' },
    mtChipText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
});
