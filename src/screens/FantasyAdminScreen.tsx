import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { useStore } from '../store';

export default function FantasyAdminScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const updateLeague = useStore(state => state.updateLeague);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';
    const currentUser = useStore((state) => state.currentUser);

    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);
    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const updateMatch = useStore(state => state.updateMatch);
    const updateFantasyTeam = useStore(state => state.updateFantasyTeam);
    const addPlayerBonus = useStore(state => state.addPlayerBonus);
    const updateFantasyLineup = useStore(state => state.updateFantasyLineup);
    const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const users = useStore(state => state.users);

    const [activeTab, setActiveTab] = useState<'matchdays' | 'calc' | 'bonus'>('matchdays');
    
    // Bonus Tab states
    const [selectedFantasyTeam, setSelectedFantasyTeam] = useState('');
    const [bonusPoints, setBonusPoints] = useState('');
    const [selPlayerId, setSelPlayerId] = useState('');
    const [pBonusDesc, setPBonusDesc] = useState('');
    const [pBonusVal, setPBonusVal] = useState('');
    
    // Search states
    const [searchTeamObj, setSearchTeamObj] = useState('');
    const [searchPlayerObj, setSearchPlayerObj] = useState('');

    // Scadenze form states
    const [tempDeadlineStr, setTempDeadlineStr] = useState('');
    const [tempMatchdayInput, setTempMatchdayInput] = useState('1');

    if (!league || !isAdmin) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
            </View>
        );
    }

    const isVariable = league.settings.rosterType === 'variable';

    const handleSaveDeadline = () => {
        if (!tempDeadlineStr.trim()) return Alert.alert('Errore', 'Inserisci una data in formato ISO (es. 2026-05-15T18:00:00)');
        
        try {
            const d = new Date(tempDeadlineStr);
            if (isNaN(d.getTime())) throw new Error();
        } catch(e) {
            return Alert.alert('Errore', 'Formato data non valido.');
        }

        const updatedSettings = { ...league.settings };
        if (isVariable) {
            const md = parseInt(tempMatchdayInput);
            if (!md) return Alert.alert('Errore', 'Inserisci il numero di giornata');
            updatedSettings.matchdayDeadlines = { ...(updatedSettings.matchdayDeadlines || {}), [md]: new Date(tempDeadlineStr).toISOString() };
        } else {
            updatedSettings.fantasyMarketDeadline = new Date(tempDeadlineStr).toISOString();
        }

        updateLeague({ ...league, settings: updatedSettings });
        Alert.alert('Scadenza Salvata', 'La scadenza per le formazioni è stata aggiornata con successo.');
        setTempDeadlineStr('');
    };

    const toggleMatchFantasyStatus = (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (match) {
            updateMatch({ ...match, isFantasyMatchday: !match.isFantasyMatchday });
        }
    };

    const handleApplyBonus = () => {
        if (!selectedFantasyTeam) return Alert.alert('Errore', 'Seleziona una squadra fantasy');
        const points = parseFloat(bonusPoints);
        if (isNaN(points)) return Alert.alert('Errore', 'Inserisci un valore numerico per i punti');

        const ft = fantasyTeams.find(f => f.id === selectedFantasyTeam);
        if (ft) {
            updateFantasyTeam({ ...ft, manualPointsAdjustment: (ft.manualPointsAdjustment || 0) + points });
        }
        Alert.alert('Successo', `Applicati ${points} punti.`);
        setBonusPoints('');
        setSelectedFantasyTeam('');
    };

    const handleApplyPlayerBonus = () => {
        if (!selPlayerId) return Alert.alert('Errore', 'Seleziona un calciatore');
        const points = parseFloat(pBonusVal);
        if (isNaN(points)) return Alert.alert('Errore', 'Inserisci un valore numerico');

        addPlayerBonus({
            id: Math.random().toString(36).substr(2, 9),
            leagueId,
            playerId: selPlayerId,
            value: points,
            description: pBonusDesc.trim() || 'Bonus manuale',
            type: 'extra'
        });

        Alert.alert('Successo', `Applicato bonus/malus di ${points} al calciatore.`);
        setSelPlayerId('');
        setPBonusDesc('');
        setPBonusVal('');
    };

    const calculateMatchday = () => {
        Alert.alert(
            "Conferma Calcolo",
            "Vuoi calcolare la giornata basandoti sui voti base (calcolati automaticamente o inseriti) e gli eventi?",
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
                                let baseVote = 6;
                                if (league?.settings.baseVoteType === 'manual') {
                                    baseVote = match.playerVotes?.[player.id] || 0;
                                } else {
                                    const isHome = player.realTeamId === match.homeTeamId;
                                    const diff = isHome ? (match.homeScore - match.awayScore) : (match.awayScore - match.homeScore);
                                    const bands = league?.settings.autoVoteBands || [];
                                    const matchedBand = bands.find(b => diff >= b.minDiff && diff <= b.maxDiff);
                                    if (matchedBand) baseVote = matchedBand.points;
                                }

                                if (baseVote > 0) {
                                    let totalPlayerPoints = baseVote;

                                    // Event bonus
                                    const playerEvents = match.events.filter(e => e.playerId === player.id);
                                    playerEvents.forEach(ev => {
                                        if (ev.type === 'goal') totalPlayerPoints += (league?.settings.customBonus?.goal ?? 3);
                                        if (ev.type === 'assist') totalPlayerPoints += (league?.settings.customBonus?.assist ?? 1);
                                        if (ev.type === 'yellow_card') totalPlayerPoints -= Math.abs(league?.settings.customBonus?.yellowCard ?? 0.5);
                                        if (ev.type === 'red_card') totalPlayerPoints -= Math.abs(league?.settings.customBonus?.redCard ?? 1);
                                        if (ev.type === 'own_goal') totalPlayerPoints -= Math.abs(league?.settings.customBonus?.ownGoal ?? 2);
                                        if (ev.type === 'mvp') totalPlayerPoints += (league?.settings.customBonus?.mvp ?? 1);
                                    });

                                    // Manual Player Bonus (es. Extra campo, sanzioni)
                                    const pBonuses = useStore.getState().playerBonuses.filter(b => b.playerId === player.id);
                                    const extraPoints = pBonuses.reduce((sum, b) => sum + b.value, 0);
                                    totalPlayerPoints += extraPoints;

                                    playerScores.set(player.id, totalPlayerPoints);
                                }
                            });
                        });

                        const currentMatchday = fantasyMatchdays[0].matchday;
                        const stateLineups = useStore.getState().fantasyLineups;

                        fantasyTeams.forEach(ft => {
                            const lineup = stateLineups.find(l => l.fantasyTeamId === ft.id && l.matchday === currentMatchday);
                            if (lineup) {
                                let teamMatchdayPoints = 0;
                                const playerPointsToSave: Record<string, number> = {};
                                let availableBench = [...(lineup.bench || [])];
                                
                                Object.values(lineup.starters).forEach(playerId => {
                                    let pts = 0;
                                    let scorerId: string | null = playerId;

                                    if (playerId && playerScores.has(playerId)) {
                                        pts = playerScores.get(playerId)!;
                                    } else if (playerId) {
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

                                updateFantasyLineup({
                                    ...lineup,
                                    points: teamMatchdayPoints,
                                    playerPoints: playerPointsToSave
                                });

                                updateFantasyTeam({
                                    ...ft,
                                    totalPoints: (ft.totalPoints || 0) + teamMatchdayPoints,
                                    matchdayPoints: { ...(ft.matchdayPoints || {}), [currentMatchday]: teamMatchdayPoints }
                                });
                            }
                        });

                        matches.filter(m => m.isFantasyMatchday).forEach(m => {
                            updateMatch({ ...m, isFantasyMatchday: false, played: true });
                        });

                        Alert.alert("Fantacalcio Completato", "Giornata calcolata con successo!");
                    }
                }
            ]
        );
    };

    const updateFixedRosterClassifica = () => {
        Alert.alert(
            "Aggiorna Classifica",
            "Ricalcola i punti totali cumulativi per tutte le fantasquadre con formazione fissa, usando le partite spuntate come valide. I bonus manuali verranno inclusi.",
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Aggiorna 🔄',
                    style: 'default',
                    onPress: () => {
                        const validMatches = matches.filter(m => m.isFantasyMatchday);
                        if (validMatches.length === 0) return Alert.alert("Errore", "Nessuna partita spuntata come valida.");

                        const playerScores = new Map<string, number>();
                        validMatches.forEach(match => {
                            const matchPlayers = useStore.getState().players.filter(p => p.realTeamId === match.homeTeamId || p.realTeamId === match.awayTeamId);
                            matchPlayers.forEach(player => {
                                let baseVote = 6;
                                if (league.settings.baseVoteType === 'manual') {
                                    baseVote = match.playerVotes?.[player.id] || 0;
                                } else {
                                    const isHome = player.realTeamId === match.homeTeamId;
                                    const diff = isHome ? (match.homeScore - match.awayScore) : (match.awayScore - match.homeScore);
                                    const bands = league.settings.autoVoteBands || [];
                                    const matchedBand = bands.find(b => diff >= b.minDiff && diff <= b.maxDiff);
                                    if (matchedBand) baseVote = matchedBand.points;
                                }
                                if (baseVote > 0) {
                                    let pts = baseVote;
                                    match.events.filter(e => e.playerId === player.id).forEach(ev => {
                                        if (ev.type === 'goal') pts += (league.settings.customBonus?.goal ?? 3);
                                        if (ev.type === 'assist') pts += (league.settings.customBonus?.assist ?? 1);
                                        if (ev.type === 'yellow_card') pts -= Math.abs(league.settings.customBonus?.yellowCard ?? 0.5);
                                        if (ev.type === 'red_card') pts -= Math.abs(league.settings.customBonus?.redCard ?? 1);
                                        if (ev.type === 'own_goal') pts -= Math.abs(league.settings.customBonus?.ownGoal ?? 2);
                                        if (ev.type === 'mvp') pts += (league.settings.customBonus?.mvp ?? 1);
                                    });
                                    const extraPts = useStore.getState().playerBonuses.filter(b => b.playerId === player.id).reduce((s, b) => s + b.value, 0);
                                    pts += extraPts;
                                    playerScores.set(player.id, (playerScores.get(player.id) || 0) + pts);
                                }
                            });
                        });

                        const stateLineups = useStore.getState().fantasyLineups;
                        const updatedTeams = fantasyTeams.map(ft => {
                            const lineup = stateLineups.find(l => l.fantasyTeamId === ft.id);
                            let total = ft.manualPointsAdjustment || 0;
                            if (lineup) {
                                let bench = [...(lineup.bench || [])];
                                Object.values(lineup.starters).forEach(playerId => {
                                    if (playerId && playerScores.has(playerId)) {
                                        total += playerScores.get(playerId)!;
                                    } else if (playerId) {
                                        const pos = useStore.getState().players.find(p => p.id === playerId)?.position;
                                        const subIdx = bench.findIndex(bid => playerScores.has(bid) && useStore.getState().players.find(p => p.id === bid)?.position === pos);
                                        if (subIdx !== -1) { total += playerScores.get(bench[subIdx])!; bench.splice(subIdx, 1); }
                                    }
                                });
                            }
                            return { ...ft, totalPoints: total };
                        });

                        fantasyTeams.forEach(async ft => {
                            const found = updatedTeams.find(x => x.id === ft.id);
                            if (found) {
                                await updateFantasyTeam({
                                    ...ft,
                                    totalPoints: found.totalPoints
                                });
                            }
                        });
                        Alert.alert("Classifica Aggiornata ✅", "I punti totali sono stati ricalcolati cumulativamente.");
                    }
                }
            ]
        );
    };

    const filteredTeams = fantasyTeams.filter(t => t.name.toLowerCase().includes(searchTeamObj.toLowerCase()) || users.find(u => u.id === t.userId)?.lastName?.toLowerCase().includes(searchTeamObj.toLowerCase()));
    const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchPlayerObj.toLowerCase()));

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                     <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Gestione Fantasy</Text>
            </View>

            <View style={styles.tabsContainer}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'matchdays' && styles.tabBtnActive]} onPress={() => setActiveTab('matchdays')}>
                    <Text style={[styles.tabText, activeTab === 'matchdays' && styles.tabTextActive]}>Giornate & Timer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'bonus' && styles.tabBtnActive]} onPress={() => setActiveTab('bonus')}>
                    <Text style={[styles.tabText, activeTab === 'bonus' && styles.tabTextActive]}>Bonus Extra</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'calc' && styles.tabBtnActive]} onPress={() => setActiveTab('calc')}>
                    <Text style={[styles.tabText, activeTab === 'calc' && styles.tabTextActive]}>Calcolo</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                
                {activeTab === 'matchdays' && (
                    <View>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Scadenza Formazioni / Mercato</Text>
                            <Text style={styles.helpText}>Imposta la data limite entro la quale gli utenti potranno inserire o modificare la formazione o comprare giocatori.</Text>
                            
                            {isVariable && (
                                <>
                                    <Text style={styles.label}>Giornata di Riferimento:</Text>
                                    <TextInput 
                                        style={styles.input}
                                        keyboardType="numeric"
                                        value={tempMatchdayInput}
                                        onChangeText={setTempMatchdayInput}
                                    />
                                </>
                            )}
                            <Text style={styles.label}>Data e Ora (Formato ISO):</Text>
                            <TextInput 
                                style={[styles.input, { marginBottom: 16 }]}
                                placeholder="Esempio: 2026-05-15T18:00:00"
                                placeholderTextColor="#64748b"
                                value={tempDeadlineStr}
                                onChangeText={setTempDeadlineStr}
                            />
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveDeadline}>
                                <Text style={styles.primaryBtnText}>Aggiorna Timer Scadenza</Text>
                            </TouchableOpacity>
                            
                            {isVariable ? (
                                <View style={{ marginTop: 24 }}>
                                    <Text style={styles.sectionTitle}>Seleziona Partite (Giornata Fantasy)</Text>
                                    <Text style={styles.helpText}>Spunta le partite reali che faranno parte di questa giornata. Una volta calcolata questa giornata, i risultati saranno archiviati.</Text>
                                    {matches.length === 0 && <Text style={styles.emptyText}>Nessuna partita schedulata.</Text>}
                                    {matches.filter(m => m.status !== 'finished' || m.isFantasyMatchday).map(m => {
                                        const ht = useStore.getState().realTeams.find(t => t.id === m.homeTeamId)?.name;
                                        const at = useStore.getState().realTeams.find(t => t.id === m.awayTeamId)?.name;
                                        return (
                                            <TouchableOpacity key={m.id} style={[styles.itemCard, m.isFantasyMatchday && styles.itemCardActive]} onPress={() => toggleMatchFantasyStatus(m.id)}>
                                                <View>
                                                    <Text style={styles.itemTitle}>{ht} - {at}</Text>
                                                    <Text style={styles.itemSub}>G{m.matchday} | {m.status}</Text>
                                                </View>
                                                <View style={[styles.checkbox, m.isFantasyMatchday && styles.checkboxActive]} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            ) : (
                                <View style={{ marginTop: 24 }}>
                                    <Text style={styles.sectionTitle}>Partite da calcolare</Text>
                                    <Text style={styles.helpText}>Nel formato a Rose Fisse (o Permanenti) non ci sono giornate staccate. Le partite continuano semplicemente ad accumulare punti man mano che vengono calcolate.</Text>
                                    {matches.filter(m => m.status !== 'finished' || m.isFantasyMatchday).map(m => {
                                        const ht = useStore.getState().realTeams.find(t => t.id === m.homeTeamId)?.name;
                                        const at = useStore.getState().realTeams.find(t => t.id === m.awayTeamId)?.name;
                                        return (
                                            <TouchableOpacity key={m.id} style={[styles.itemCard, m.isFantasyMatchday && styles.itemCardActive]} onPress={() => toggleMatchFantasyStatus(m.id)}>
                                                <View>
                                                    <Text style={styles.itemTitle}>{ht} - {at}</Text>
                                                    <Text style={styles.itemSub}>G{m.matchday} | {m.status}</Text>
                                                </View>
                                                <View style={[styles.checkbox, m.isFantasyMatchday && styles.checkboxActive]} />
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    </View>
                )}

                {activeTab === 'bonus' && (
                    <View>
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Punti Extra Manuali Squadra</Text>
                            <TextInput 
                                style={[styles.searchInput, { marginBottom: 12 }]} 
                                placeholder="Cerca squadra o username..." 
                                placeholderTextColor="#64748b"
                                value={searchTeamObj}
                                onChangeText={setSearchTeamObj} 
                            />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                {filteredTeams.map(f => (
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
                                <Text style={styles.primaryBtnText}>Modifica Punteggio Squadra</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Penalità e Bonus Calciatore (Extra Campo)</Text>
                            <Text style={styles.helpText}>Servono per ritardi agli allenamenti o premi, e varranno al primo calcolo giornata.</Text>
                            <TextInput 
                                style={[styles.searchInput, { marginBottom: 12 }]} 
                                placeholder="Cerca calciatore..." 
                                placeholderTextColor="#64748b"
                                value={searchPlayerObj}
                                onChangeText={setSearchPlayerObj} 
                            />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                                {filteredPlayers.map(p => (
                                    <TouchableOpacity
                                        key={p.id}
                                        style={[styles.miniChip, selPlayerId === p.id && styles.miniChipActive]}
                                        onPress={() => setSelPlayerId(p.id)}
                                    >
                                        <Text style={styles.miniChipText}>{p.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TextInput
                                style={[styles.input, { marginBottom: 8 }]}
                                placeholder="Motivazione (es. Ritardo Allenamento)"
                                placeholderTextColor="#94a3b8"
                                value={pBonusDesc}
                                onChangeText={setPBonusDesc}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Valore Reale Punti (es. -2 o 1)"
                                placeholderTextColor="#94a3b8"
                                keyboardType="numbers-and-punctuation"
                                value={pBonusVal}
                                onChangeText={setPBonusVal}
                            />
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#fbbf24' }]} onPress={handleApplyPlayerBonus}>
                                <Text style={[styles.primaryBtnText, { color: '#000' }]}>Applica Malus/Bonus Calciatore</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {activeTab === 'calc' && (
                    <View style={styles.cardCenter}>
                        <Text style={{ fontSize: 50, marginBottom: 16 }}>🏆</Text>
                        {isVariable ? (
                            <>
                                <Text style={styles.cardTitle}>Calcola Giornata Fantasy</Text>
                                <Text style={[styles.helpText, { textAlign: 'center', marginBottom: 24 }]}>
                                    Il sistema calcolerà i punteggi basandosi sulle formazioni schierate e sugli eventi delle partite spuntate come "Valide per Fantasy" e le archivierà come giornata.
                                </Text>
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#fbbf24', paddingHorizontal: 30 }]} onPress={calculateMatchday}>
                                    <Text style={[styles.primaryBtnText, { color: '#000', fontSize: 18 }]}>Calcola Giornata 🚀</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <Text style={styles.cardTitle}>Aggiorna Classifica</Text>
                                <Text style={[styles.helpText, { textAlign: 'center', marginBottom: 24 }]}>
                                    Rilegge tutte le partite "Valide per Fantasy" e ricalcola i punti totali cumulativi per ogni fantasquadra (formazione fissa). I bonus manuali assegnati vengono inclusi.
                                </Text>
                                <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#4ade80', paddingHorizontal: 30 }]} onPress={updateFixedRosterClassifica}>
                                    <Text style={[styles.primaryBtnText, { color: '#000', fontSize: 18 }]}>Aggiorna Classifica 🔄</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
    tabBtn: { paddingHorizontal: 12, paddingVertical: 8, marginHorizontal: 4, borderRadius: 20 },
    tabBtnActive: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: '#fbbf24' },
    tabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
    tabTextActive: { color: '#fbbf24' },
    content: { padding: 16, paddingBottom: 60 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginVertical: 8 },
    label: { fontSize: 14, color: '#f8fafc', marginBottom: 6, fontWeight: '600' },
    helpText: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardCenter: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 30, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fbbf24', marginBottom: 12 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
    searchInput: { backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, fontSize: 14 },
    primaryBtn: { backgroundColor: '#0ea5e9', padding: 14, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    miniChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    miniChipActive: { backgroundColor: 'rgba(251, 191, 36, 0.3)', borderColor: '#fbbf24' },
    miniChipText: { color: 'white', fontSize: 13, fontWeight: 'bold' },
    itemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
    itemCardActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.1)' },
    itemTitle: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    itemSub: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#94a3b8' },
    checkboxActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' }
});
