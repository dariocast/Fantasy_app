import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useStore } from '../store';

export default function FantasyAdminScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';
    const currentUser = useStore((state) => state.currentUser);

    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);
    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

    const [activeTab, setActiveTab] = useState<'matchdays' | 'calc'>('matchdays');
    const [selectedFantasyTeam, setSelectedFantasyTeam] = useState('');
    const [bonusPoints, setBonusPoints] = useState('');

    if (!league || !isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
            </View>
        );
    }

    const toggleMatchFantasyStatus = (matchId: string) => {
        useStore.setState(state => ({
            matches: state.matches.map(m => m.id === matchId ? { ...m, isFantasyMatchday: !m.isFantasyMatchday } : m)
        }));
    };

    const handleApplyBonus = () => {
        if (!selectedFantasyTeam) return Alert.alert('Errore', 'Seleziona una squadra fantasy');
        const points = parseFloat(bonusPoints);
        if (isNaN(points)) return Alert.alert('Errore', 'Inserisci un valore numerico per i punti');

        useStore.setState(state => ({
            fantasyTeams: state.fantasyTeams.map(f => {
                if (f.id === selectedFantasyTeam) {
                    return { ...f, manualPointsAdjustment: (f.manualPointsAdjustment || 0) + points };
                }
                return f;
            })
        }));
        Alert.alert('Successo', `Applicati ${points} punti.`);
        setBonusPoints('');
        setSelectedFantasyTeam('');
    };

    const calculateMatchday = () => {
        Alert.alert(
            "Conferma Calcolo", 
            "Vuoi calcolare la giornata basandoti sui voti base (calcolati automaticamente dallo scarto gol dei match reali se non inseriti) e gli eventi?",
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Calcola 🚀',
                    style: 'default',
                    onPress: () => {
                        const fantasyMatchdays = matches.filter(m => m.isFantasyMatchday);
                        if (fantasyMatchdays.length === 0) return Alert.alert("Errore", "Nessuna partita spuntata come valida per il Fantasy.");

                        const playerScores = new Map<string, number>();

                        fantasyMatchdays.forEach(match => {
                            const matchPlayers = useStore.getState().players.filter(p => p.realTeamId === match.homeTeamId || p.realTeamId === match.awayTeamId);

                            matchPlayers.forEach(player => {
                                let baseVote = 6; // simplified automatic vote calculation for mobile testing
                                const isHome = player.realTeamId === match.homeTeamId;
                                const teamScore = isHome ? match.homeScore : match.awayScore;
                                const opponentScore = isHome ? match.awayScore : match.homeScore;
                                const diff = teamScore - opponentScore;
                                if (diff > 0) baseVote += (diff * 0.5);
                                else if (diff < 0) baseVote += (diff * 0.5);

                                if (baseVote > 0) {
                                    let totalPlayerPoints = baseVote;
                                    const playerEvents = match.events.filter(e => e.playerId === player.id);
                                    playerEvents.forEach(ev => {
                                        if (ev.type === 'goal') totalPlayerPoints += 3;
                                        if (ev.type === 'assist') totalPlayerPoints += 1;
                                        if (ev.type === 'yellow_card') totalPlayerPoints -= 0.5;
                                        if (ev.type === 'red_card') totalPlayerPoints -= 1;
                                        if (ev.type === 'own_goal') totalPlayerPoints -= 2;
                                    });
                                    playerScores.set(player.id, totalPlayerPoints);
                                }
                            });
                        });

                        const currentMatchday = fantasyMatchdays[0].matchday;
                        const stateLineups = useStore.getState().fantasyLineups;
                        const updatedLineups = [...stateLineups];

                        const finalFantasyTeams = fantasyTeams.map(ft => {
                            const lineupIndex = updatedLineups.findIndex(l => l.fantasyTeamId === ft.id && l.matchday === currentMatchday);
                            const lineup = lineupIndex >= 0 ? updatedLineups[lineupIndex] : null;

                            let teamMatchdayPoints = 0;
                            const playerPointsToSave: Record<string, number> = {};

                            if (lineup) {
                                let availableBench = [...(lineup.bench || [])];
                                Object.values(lineup.starters).forEach(playerId => {
                                    let pts = 0;
                                    let scorerId: string | null = playerId;

                                    if (playerId && playerScores.has(playerId)) {
                                        pts = playerScores.get(playerId)!;
                                    } else if (playerId) { // Try sub
                                        const starterPos = useStore.getState().players.find(p => p.id === playerId)?.position;
                                        const subIndex = availableBench.findIndex(benchId => playerScores.has(benchId) && useStore.getState().players.find(p => p.id === benchId)?.position === starterPos);
                                        if (subIndex !== -1) {
                                            scorerId = availableBench[subIndex];
                                            pts = playerScores.get(scorerId)!;
                                            availableBench.splice(subIndex, 1);
                                        }
                                    }

                                    if (scorerId && pts > 0) {
                                        teamMatchdayPoints += pts;
                                        playerPointsToSave[scorerId] = pts;
                                    }
                                });

                                updatedLineups[lineupIndex] = {
                                    ...lineup,
                                    points: teamMatchdayPoints,
                                    playerPoints: playerPointsToSave
                                };
                            }

                            const currentTotal = (ft as any).totalPoints || 0;
                            const currentMatchdayHistory = ft.matchdayPoints || {};
                            return {
                                ...ft,
                                totalPoints: currentTotal + teamMatchdayPoints,
                                matchdayPoints: { ...currentMatchdayHistory, [currentMatchday]: teamMatchdayPoints }
                            };
                        });

                        useStore.setState(state => ({
                            fantasyTeams: state.fantasyTeams.map(ft => {
                                const found = finalFantasyTeams.find(x => x.id === ft.id);
                                return found ? { ...ft, ...found } : ft;
                            }),
                            matches: state.matches.map(m => m.isFantasyMatchday ? { ...m, isFantasyMatchday: false, played: true } : m),
                            fantasyLineups: updatedLineups
                        }));

                        Alert.alert("Fantacalcio Completato", "Giornata calcolata con successo!");
                    }
                }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Gestione Fantasy</Text>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'matchdays' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('matchdays')}
                >
                    <Text style={[styles.tabText, activeTab === 'matchdays' && styles.tabTextActive]}>Bonus & Validità</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'calc' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('calc')}
                >
                    <Text style={[styles.tabText, activeTab === 'calc' && styles.tabTextActive]}>Calcolo Punti</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {activeTab === 'matchdays' && (
                    <View>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Punti Extra Manuali</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom: 10}}>
                                {fantasyTeams.map(f => (
                                    <TouchableOpacity 
                                        key={f.id} 
                                        style={[styles.miniChip, selectedFantasyTeam === f.id && styles.miniChipActive]}
                                        onPress={() => setSelectedFantasyTeam(f.id)}
                                    >
                                        <Text style={styles.miniChipText}>{f.name} ({f.manualPointsAdjustment || 0}pt)</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TextInput 
                                style={styles.input} 
                                placeholder="Valore (es. -2.5 o 3)" 
                                placeholderTextColor="#94a3b8" 
                                keyboardType="numbers-and-punctuation"
                                value={bonusPoints} 
                                onChangeText={setBonusPoints} 
                            />
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleApplyBonus}>
                                <Text style={styles.primaryBtnText}>Applica</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Seleziona Partite Valide per il Fantasy</Text>
                        <Text style={styles.helpText}>Spunta le partite che vuoi vengano calcolate alla prossima esecuzione per generare la classifica di giornata fantasy.</Text>
                        {matches.length === 0 && <Text style={styles.emptyText}>Nessuna partita schedulata.</Text>}
                        {matches.filter(m => m.status !== 'finished' || m.isFantasyMatchday).map(m => {
                            const ht = useStore.getState().realTeams.find(t => t.id === m.homeTeamId)?.name;
                            const at = useStore.getState().realTeams.find(t => t.id === m.awayTeamId)?.name;
                            return (
                                <TouchableOpacity 
                                    key={m.id} 
                                    style={[styles.itemCard, m.isFantasyMatchday && styles.itemCardActive]}
                                    onPress={() => toggleMatchFantasyStatus(m.id)}
                                >
                                    <View>
                                        <Text style={styles.itemTitle}>{ht} - {at}</Text>
                                        <Text style={styles.itemSub}>Giornata {m.matchday} | {m.status}</Text>
                                    </View>
                                    <View style={[styles.checkbox, m.isFantasyMatchday && styles.checkboxActive]} />
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                )}

                {activeTab === 'calc' && (
                    <View style={styles.cardCenter}>
                        <Text style={{ fontSize: 50, marginBottom: 16 }}>🏆</Text>
                        <Text style={styles.cardTitle}>Calcola Giornata Fantasy</Text>
                        <Text style={[styles.helpText, { textAlign: 'center', marginBottom: 24 }]}>
                            Il sistema calcolerà i punteggi di tutte le fantasquadre basandosi sulle formazioni schierate e sugli eventi (gol, assist, cartellini) delle partite che hai impostato come "Valide per Fantasy".
                        </Text>
                        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#fbbf24', paddingHorizontal: 30 }]} onPress={calculateMatchday}>
                            <Text style={[styles.primaryBtnText, { color: '#000', fontSize: 18 }]}>Avvia Calcolo 🚀</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtnText: { color: '#fbbf24', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    tabsContainer: { flexDirection: 'row', paddingVertical: 12, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', justifyContent: 'center' },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, borderRadius: 20 },
    tabBtnActive: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: '#fbbf24' },
    tabText: { color: '#94a3b8', fontWeight: 'bold' },
    tabTextActive: { color: '#fbbf24' },
    content: { padding: 16 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginVertical: 8 },
    helpText: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardCenter: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 30, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#fbbf24', marginBottom: 12 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
    primaryBtn: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    miniChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8 },
    miniChipActive: { backgroundColor: 'rgba(251, 191, 36, 0.3)', borderColor: '#fbbf24', borderWidth: 1 },
    miniChipText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
    itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
    itemCardActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    itemTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    itemSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#94a3b8' },
    checkboxActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' }
});
