import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';

export default function FantasyStandingsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const users = useStore(state => state.users);
    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const allPlayers = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId && m.status === 'finished' && m.isFantasyMatchday);

    const [mainTab, setMainTab] = useState<'squadre' | 'giocatori'>('squadre');
    const [viewMode, setViewMode] = useState<'totale' | number>('totale');
    const [playerRoleFilter, setPlayerRoleFilter] = useState<string>('TUTTI');

    if (!league || !league.settings.hasFantasy) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Torneo non impostato o Fantacalcio disabilitato.</Text>
            </View>
        );
    }

    // Identify all played matchdays that have points
    const playedMatchdaysSet = new Set<number>();
    fantasyTeams.forEach(ft => {
        if (ft.matchdayPoints) {
            Object.keys(ft.matchdayPoints).forEach(d => playedMatchdaysSet.add(Number(d)));
        }
    });
    const matchdays = Array.from(playedMatchdaysSet).sort((a, b) => b - a);

    // Calculate team leaderboard
    const teamLeaderboard = [...fantasyTeams].sort((a, b) => {
        if (viewMode === 'totale') {
            const ptsA = (a as any).totalPoints || 0;
            const ptsB = (b as any).totalPoints || 0;
            return ptsB - ptsA;
        } else {
            const ptsA = a.matchdayPoints?.[viewMode] || 0;
            const ptsB = b.matchdayPoints?.[viewMode] || 0;
            return ptsB - ptsA;
        }
    });

    // Calculate player total fantasy points
    const playerFantasyLeaderboard = useMemo(() => {
        const customBonus = league.settings.customBonus || { goal: 3, assist: 1, yellowCard: -0.5, redCard: -1, ownGoal: -2, mvp: 1 };
        const pStats = new Map<string, number>();

        allPlayers.forEach(p => pStats.set(p.id, 0));

        matches.forEach(m => {
            m.events?.forEach(ev => {
                const currentPts = pStats.get(ev.playerId) || 0;
                if (ev.type === 'goal') pStats.set(ev.playerId, currentPts + customBonus.goal);
                if (ev.type === 'assist') pStats.set(ev.playerId, currentPts + customBonus.assist);
                if (ev.type === 'yellow_card') pStats.set(ev.playerId, currentPts + customBonus.yellowCard);
                if (ev.type === 'red_card') pStats.set(ev.playerId, currentPts + customBonus.redCard);
                if (ev.type === 'own_goal') pStats.set(ev.playerId, currentPts + customBonus.ownGoal);
                if (ev.type === 'mvp') pStats.set(ev.playerId, currentPts + customBonus.mvp);
            });
            if (m.playerVotes) {
                Object.entries(m.playerVotes).forEach(([playerId, vote]) => {
                    if (vote > 0) {
                        const currentPts = pStats.get(playerId) || 0;
                        pStats.set(playerId, currentPts + vote);
                    }
                });
            }
        });

        const sorted = allPlayers.map(p => ({
            ...p,
            fantasyPoints: pStats.get(p.id) || 0
        })).sort((a, b) => b.fantasyPoints - a.fantasyPoints);

        if (playerRoleFilter === 'TUTTI') return sorted;
        return sorted.filter(p => p.position === playerRoleFilter);
    }, [matches, allPlayers, league.settings.customBonus, playerRoleFilter]);

    const roleOptions = ['TUTTI', ...(league.settings.useCustomRoles ? (league.settings.customRoles?.map(r=>r.name) || []) : ['POR', 'DIF', 'CEN', 'ATT'])];

    const getPosColor = (pos: string) => {
        if (league.settings.useCustomRoles && league.settings.customRoles) {
            const customRole = league.settings.customRoles.find(r => r.name === pos);
            if (customRole && customRole.color) return customRole.color;
        }
        if (pos.startsWith('P')) return '#fbbf24';
        if (pos.startsWith('D')) return '#4ade80';
        if (pos.startsWith('C')) return '#38bdf8';
        if (pos.startsWith('A')) return '#ef4444';
        return '#94a3b8';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Classifica Fantasy</Text>
            </View>

            <View style={styles.mainTabs}>
                <TouchableOpacity 
                    style={[styles.mainTabBtn, mainTab === 'squadre' && styles.mainTabBtnActive]} 
                    onPress={() => setMainTab('squadre')}
                >
                    <Text style={[styles.mainTabText, mainTab === 'squadre' && styles.mainTabTextActive]}>Squadre</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.mainTabBtn, mainTab === 'giocatori' && styles.mainTabBtnActive]} 
                    onPress={() => setMainTab('giocatori')}
                >
                    <Text style={[styles.mainTabText, mainTab === 'giocatori' && styles.mainTabTextActive]}>Giocatori</Text>
                </TouchableOpacity>
            </View>

            {mainTab === 'squadre' && (
                <View style={styles.tabsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <TouchableOpacity 
                            style={[styles.tabBtn, viewMode === 'totale' && styles.tabBtnActive]}
                            onPress={() => setViewMode('totale')}
                        >
                            <Text style={[styles.tabText, viewMode === 'totale' && styles.tabTextActive]}>Generale</Text>
                        </TouchableOpacity>
                        {matchdays.map(m => (
                            <TouchableOpacity 
                                key={m}
                                style={[styles.tabBtn, viewMode === m && styles.tabBtnActive]}
                                onPress={() => setViewMode(m)}
                            >
                                <Text style={[styles.tabText, viewMode === m && styles.tabTextActive]}>Giornata {m}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {mainTab === 'giocatori' && (
                <View style={styles.filterMenu}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {roleOptions.map(pos => (
                            <TouchableOpacity 
                                key={pos} 
                                style={[styles.filterChip, playerRoleFilter === pos && styles.filterChipActive]}
                                onPress={() => setPlayerRoleFilter(pos)}
                            >
                                <Text style={[styles.filterChipText, playerRoleFilter === pos && styles.filterChipTextActive]}>{pos}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {mainTab === 'squadre' ? (
                        <>
                            <Text style={styles.helpText}>
                                {viewMode === 'totale' ? 'Punteggi totali accumulati da tutte le giornate.' : `Punteggi della Giornata ${viewMode}.`}
                            </Text>

                            <View style={styles.tableHeader}>
                                <Text style={[styles.colPos, styles.headerText]}>#</Text>
                                <Text style={[styles.colName, styles.headerText]}>SQUADRA / UTENTE</Text>
                                <Text style={[styles.colPoints, styles.headerText]}>PUNTI</Text>
                            </View>

                            {fantasyTeams.length === 0 ? (
                                <Text style={styles.emptyTableText}>Nessuna fantasquadra creata.</Text>
                            ) : (
                                teamLeaderboard.map((team, idx) => {
                                    const isTop = idx === 0;
                                    let points = viewMode === 'totale' ? ((team as any).totalPoints || 0) : (team.matchdayPoints?.[viewMode] || 0);
                                    const user = users.find(u => u.id === team.userId);
                                    
                                    return (
                                        <View key={team.id} style={styles.tableRow}>
                                            <Text style={[styles.colPos, isTop && styles.textGold]}>{idx + 1}</Text>
                                            <View style={styles.colName}>
                                                <Text style={styles.teamNameText} numberOfLines={1}>{team.name}</Text>
                                                {user && <Text style={styles.userNameText} numberOfLines={1}>👤 {user.firstName} {user.lastName}</Text>}
                                            </View>
                                            <View style={styles.pointsContainer}>
                                                <Text style={styles.pointsValue}>{points.toFixed(1)}</Text>
                                                <Text style={styles.pointsUnit}>pt</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </>
                    ) : (
                        <>
                            <Text style={styles.helpText}>Elenco dei giocatori ordinati per Punteggio Fantasy Totale (include voti e bonus applicati).</Text>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.colPos, styles.headerText]}>#</Text>
                                <Text style={[styles.colName, styles.headerText]}>CALCIATORE</Text>
                                <Text style={[styles.colPoints, styles.headerText]}>PUNTI TOT.</Text>
                            </View>
                            
                            {playerFantasyLeaderboard.length === 0 ? (
                                <Text style={styles.emptyTableText}>Nessun giocatore trovato.</Text>
                            ) : (
                                playerFantasyLeaderboard.map((player, idx) => {
                                    return (
                                        <View key={player.id} style={styles.tableRow}>
                                            <Text style={[styles.colPos]}>{idx + 1}</Text>
                                            <View style={[styles.colName, { flexDirection: 'row', alignItems: 'center' }]}>
                                                <View style={[styles.roleBadge, { backgroundColor: getPosColor(player.position) }]}>
                                                    <Text style={styles.roleBadgeText}>{player.position.slice(0,3)}</Text>
                                                </View>
                                                <Text style={styles.teamNameText} numberOfLines={1}>{player.name}</Text>
                                            </View>
                                            <View style={styles.pointsContainer}>
                                                <Text style={[styles.pointsValue, { color: '#4ade80' }]}>{player.fantasyPoints.toFixed(1)}</Text>
                                                <Text style={styles.pointsUnit}>pt</Text>
                                            </View>
                                        </View>
                                    );
                                })
                            )}
                        </>
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtnText: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    mainTabs: { flexDirection: 'row', backgroundColor: '#1e293b' },
    mainTabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    mainTabBtnActive: { borderBottomColor: '#38bdf8' },
    mainTabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 15 },
    mainTabTextActive: { color: '#38bdf8' },
    tabsContainer: { paddingVertical: 12, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    filterMenu: { paddingVertical: 12, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 8, borderRadius: 20 },
    tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderWidth: 1, borderColor: '#38bdf8' },
    tabText: { color: '#94a3b8', fontWeight: 'bold' },
    tabTextActive: { color: '#38bdf8' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    filterChipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    filterChipText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
    filterChipTextActive: { color: '#38bdf8' },
    content: { padding: 16 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    helpText: { color: '#94a3b8', fontSize: 13, marginBottom: 20, lineHeight: 20 },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 10, marginBottom: 10 },
    headerText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    colPos: { width: 30, fontWeight: 'bold', color: '#94a3b8', fontSize: 16 },
    textGold: { color: '#fbbf24' },
    colName: { flex: 1, paddingRight: 10, justifyContent: 'center' },
    teamNameText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 4 },
    userNameText: { color: '#94a3b8', fontSize: 11 },
    colPoints: { width: 80, textAlign: 'right' },
    pointsContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', width: 80 },
    pointsValue: { color: '#38bdf8', fontWeight: 'bold', fontSize: 18 },
    pointsUnit: { color: '#94a3b8', fontSize: 12, marginLeft: 4 },
    emptyTableText: { color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', paddingVertical: 20 },
    roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
    roleBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' }
});
