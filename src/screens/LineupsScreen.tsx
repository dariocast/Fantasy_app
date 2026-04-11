import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';

export default function LineupsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const fantasyLineups = useStore(state => state.fantasyLineups).filter(fl => fantasyTeams.some(ft => ft.id === fl.fantasyTeamId));
    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);

    // Group lineups by matchday
    const matchdays = Array.from(new Set(fantasyLineups.map(l => l.matchday))).sort((a, b) => b - a);
    const [selectedMatchday, setSelectedMatchday] = useState<number | null>(matchdays[0] || null);

    if (!league || !league.settings.hasFantasy) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Torneo non impostato o Fantacalcio disabilitato.</Text>
            </View>
        );
    }

    const currentLineups = fantasyLineups.filter(fl => fl.matchday === selectedMatchday);

    const getPosColor = (pos: string) => {
        if (pos === 'POR') return '#ffa500';
        if (pos === 'DIF') return '#00e600';
        if (pos === 'CEN') return '#6666ff';
        if (pos === 'ATT') return '#ff4d4d';
        return '#94a3b8';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt; Indietro</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Formazioni Schierate</Text>
            </View>

            {matchdays.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Nessuna Formazione Schierata.</Text>
                </View>
            ) : (
                <>
                    <View style={styles.matchdayTabsContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {matchdays.map(m => (
                                <TouchableOpacity 
                                    key={m} 
                                    style={[styles.matchdayTab, selectedMatchday === m && styles.matchdayTabActive]}
                                    onPress={() => setSelectedMatchday(m)}
                                >
                                    <Text style={[styles.matchdayTabText, selectedMatchday === m && styles.matchdayTabTextActive]}>Giornata {m}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <ScrollView contentContainerStyle={styles.content}>
                        {currentLineups.map(lineup => {
                            const team = fantasyTeams.find(ft => ft.id === lineup.fantasyTeamId);
                            if (!team) return null;

                            const starterPlayers = Object.values(lineup.starters).map(pid => players.find(p => p.id === pid));
                            const benchPlayers = lineup.bench.map(pid => players.find(p => p.id === pid));

                            return (
                                <View key={lineup.id} style={styles.teamCard}>
                                    <View style={styles.teamCardHeader}>
                                        <Text style={styles.teamName}>{team.name}</Text>
                                        {lineup.points !== undefined && (
                                            <Text style={styles.teamPoints}>{lineup.points} pt</Text>
                                        )}
                                    </View>

                                    <Text style={styles.sectionLabel}>Titolari</Text>
                                    <View style={styles.playersList}>
                                        {starterPlayers.map((p, idx) => (
                                            <View key={idx} style={styles.playerRow}>
                                                {p ? (
                                                    <>
                                                        <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position}</Text>
                                                        <Text style={styles.playerName}>{p.name}</Text>
                                                        <Text style={styles.playerScore}>
                                                            {lineup.playerPoints && lineup.playerPoints[p.id] !== undefined ? lineup.playerPoints[p.id] : (lineup.points !== undefined ? '0' : '-')}
                                                        </Text>
                                                    </>
                                                ) : (
                                                    <Text style={styles.emptySlotText}>Slot Vuoto</Text>
                                                )}
                                            </View>
                                        ))}
                                    </View>

                                    <Text style={styles.sectionLabel}>Panchina</Text>
                                    {benchPlayers.length === 0 && <Text style={styles.emptySlotText}>Nessuno</Text>}
                                    <View style={styles.playersList}>
                                        {benchPlayers.map((p, idx) => p && (
                                            <View key={idx} style={styles.playerRow}>
                                                <Text style={styles.posText}>{idx + 1}.</Text>
                                                <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position}</Text>
                                                <Text style={styles.playerName}>{p.name}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center',
    },
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    backBtnText: {
        color: '#38bdf8',
        fontSize: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
    },
    matchdayTabsContainer: {
        paddingVertical: 12,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    matchdayTab: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
        borderRadius: 20,
    },
    matchdayTabActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 1,
        borderColor: '#38bdf8',
    },
    matchdayTabText: {
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    matchdayTabTextActive: {
        color: '#38bdf8',
    },
    content: {
        padding: 16,
    },
    teamCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    teamCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 12,
        marginBottom: 12,
    },
    teamName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#38bdf8',
    },
    teamPoints: {
        color: '#fbbf24',
        fontWeight: 'bold',
        fontSize: 16,
    },
    sectionLabel: {
        color: '#94a3b8',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 8,
        marginTop: 8,
    },
    playersList: {
        marginBottom: 8,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    posText: {
        width: 35,
        fontSize: 12,
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    playerName: {
        color: '#f8fafc',
        flex: 1,
        fontSize: 14,
    },
    playerScore: {
        color: '#fbbf24',
        fontWeight: 'bold',
        fontSize: 14,
    },
    emptySlotText: {
        color: '#ef4444',
        fontSize: 14,
        fontStyle: 'italic',
    }
});
