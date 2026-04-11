import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';

export default function FantasyStandingsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);

    // Identify all played matchdays that have points
    const playedMatchdays = new Set<number>();
    fantasyTeams.forEach(ft => {
        if (ft.matchdayPoints) {
            Object.keys(ft.matchdayPoints).forEach(d => playedMatchdays.add(Number(d)));
        }
    });
    const matchdays = Array.from(playedMatchdays).sort((a, b) => b - a);

    const [viewMode, setViewMode] = useState<'totale' | number>('totale');

    if (!league || !league.settings.hasFantasy) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Torneo non impostato o Fantacalcio disabilitato.</Text>
            </View>
        );
    }

    // Calculate leaderboard
    const leaderboard = [...fantasyTeams].sort((a, b) => {
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

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt; Indietro</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Classifica Fantasy</Text>
            </View>

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

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.helpText}>
                        {viewMode === 'totale' ? 'Punteggi totali del Fantacalcio accumulati in tutte le giornate.' : `Punteggi realizzati nella Giornata ${viewMode}.`}
                    </Text>

                    <View style={styles.tableHeader}>
                        <Text style={[styles.colPos, styles.headerText]}>#</Text>
                        <Text style={[styles.colName, styles.headerText]}>SQUADRA FANTASY</Text>
                        <Text style={[styles.colPoints, styles.headerText]}>PUNTI</Text>
                    </View>

                    {fantasyTeams.length === 0 ? (
                        <Text style={styles.emptyTableText}>Nessuna fantasquadra creata.</Text>
                    ) : (
                        leaderboard.map((team, idx) => {
                            const isTop = idx === 0;
                            let points = viewMode === 'totale' ? ((team as any).totalPoints || 0) : (team.matchdayPoints?.[viewMode] || 0);

                            return (
                                <View key={team.id} style={styles.tableRow}>
                                    <Text style={[styles.colPos, isTop && styles.textGold]}>{idx + 1}</Text>
                                    <Text style={styles.colName} numberOfLines={1}>{team.name}</Text>
                                    <View style={styles.pointsContainer}>
                                        <Text style={styles.pointsValue}>{points}</Text>
                                        <Text style={styles.pointsUnit}>pt</Text>
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
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
    tabsContainer: {
        paddingVertical: 12,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    tabBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginHorizontal: 8,
        borderRadius: 20,
    },
    tabBtnActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 1,
        borderColor: '#38bdf8',
    },
    tabText: {
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    tabTextActive: {
        color: '#38bdf8',
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    helpText: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 10,
        marginBottom: 10,
    },
    headerText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    colPos: {
        width: 30,
        fontWeight: 'bold',
        color: '#94a3b8',
    },
    textGold: {
        color: '#fbbf24',
    },
    colName: {
        flex: 1,
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 10,
    },
    colPoints: {
        width: 80,
        textAlign: 'right',
    },
    pointsContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'flex-end',
        width: 80,
    },
    pointsValue: {
        color: '#38bdf8',
        fontWeight: 'bold',
        fontSize: 18,
    },
    pointsUnit: {
        color: '#94a3b8',
        fontSize: 12,
        marginLeft: 4,
    },
    emptyTableText: {
        color: '#94a3b8',
        fontStyle: 'italic',
        textAlign: 'center',
        paddingVertical: 20,
    }
});
