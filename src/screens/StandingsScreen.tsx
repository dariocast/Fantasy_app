import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store';

export default function StandingsScreen() {
    const navigation = useNavigation<any>();
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === leagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId && m.status === 'finished');

    const standings = useMemo(() => {
        const stats = new Map<string, { id: string; name: string; logo?: string; played: number; won: number; drawn: number; lost: number; goalsFor: number; goalsAgainst: number; points: number }>();

        realTeams.forEach(t => {
            stats.set(t.id, {
                id: t.id,
                name: t.name,
                logo: t.logo,
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0
            });
        });

        matches.forEach(m => {
            if (!m.homeTeamId || !m.awayTeamId) return;
            if (m.matchType && m.matchType !== 'campionato' && m.matchType !== 'gironi') return;

            const home = stats.get(m.homeTeamId);
            const away = stats.get(m.awayTeamId);

            if (!home || !away) return;

            home.played += 1;
            away.played += 1;
            home.goalsFor += m.homeScore;
            home.goalsAgainst += m.awayScore;
            away.goalsFor += m.awayScore;
            away.goalsAgainst += m.homeScore;

            if (m.homeScore > m.awayScore) {
                home.points += 3;
                home.won += 1;
                away.lost += 1;
            } else if (m.homeScore < m.awayScore) {
                away.points += 3;
                away.won += 1;
                home.lost += 1;
            } else {
                home.points += 1;
                away.points += 1;
                home.drawn += 1;
                away.drawn += 1;
            }
        });

        return Array.from(stats.values()).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const drA = a.goalsFor - a.goalsAgainst;
            const drB = b.goalsFor - b.goalsAgainst;
            if (drB !== drA) return drB - drA;
            return b.goalsFor - a.goalsFor;
        });
    }, [realTeams, matches]);

    if (!league) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Nessun torneo selezionato.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Classifica Torneo Reale</Text>
                <Text style={styles.subtitle}>Basata sui risultati ufficiali.</Text>
            </View>

            <View style={styles.card}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <Text style={[styles.thText, { width: 30 }]}>#</Text>
                            <Text style={[styles.thText, { width: 140, textAlign: 'left' }]}>SQUADRA</Text>
                            <Text style={[styles.thText, { width: 40 }]}>PT</Text>
                            <Text style={[styles.thText, { width: 30 }]}>PG</Text>
                            <Text style={[styles.thText, { width: 30 }]}>V</Text>
                            <Text style={[styles.thText, { width: 30 }]}>N</Text>
                            <Text style={[styles.thText, { width: 30 }]}>P</Text>
                            <Text style={[styles.thText, { width: 40 }]}>GF</Text>
                            <Text style={[styles.thText, { width: 40 }]}>GS</Text>
                            <Text style={[styles.thText, { width: 40 }]}>DR</Text>
                        </View>

                        {/* Table Body */}
                        {standings.length === 0 ? (
                            <View style={{ padding: 20 }}>
                                <Text style={styles.emptyText}>Nessuna squadra iscritta.</Text>
                            </View>
                        ) : (
                            standings.map((team, idx) => {
                                const dr = team.goalsFor - team.goalsAgainst;
                                const isTop = idx === 0;

                                return (
                                    <TouchableOpacity key={team.id} style={styles.tableRow} onPress={() => navigation.navigate('TeamProfile', { teamId: team.id, leagueId })} activeOpacity={0.7}>
                                        <Text style={[styles.tdText, { width: 30 }, isTop && styles.textGold]}>{idx + 1}</Text>
                                        <Text style={[styles.tdText, { width: 140, textAlign: 'left', fontWeight: 'bold', color: '#38bdf8' }]} numberOfLines={1}>{team.name}</Text>
                                        <Text style={[styles.tdText, { width: 40, color: '#38bdf8', fontWeight: 'bold' }]}>{team.points}</Text>
                                        <Text style={[styles.tdText, { width: 30 }]}>{team.played}</Text>
                                        <Text style={[styles.tdText, { width: 30 }]}>{team.won}</Text>
                                        <Text style={[styles.tdText, { width: 30 }]}>{team.drawn}</Text>
                                        <Text style={[styles.tdText, { width: 30 }]}>{team.lost}</Text>
                                        <Text style={[styles.tdText, { width: 40 }]}>{team.goalsFor}</Text>
                                        <Text style={[styles.tdText, { width: 40 }]}>{team.goalsAgainst}</Text>
                                        <Text style={[
                                            styles.tdText, 
                                            { width: 40 },
                                            dr > 0 ? styles.textSuccess : (dr < 0 ? styles.textError : {})
                                        ]}>
                                            {dr > 0 ? `+${dr}` : dr}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })
                        )}
                    </View>
                </ScrollView>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
    },
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#38bdf8',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#94a3b8',
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginBottom: 40,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    thText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
        alignItems: 'center',
    },
    tdText: {
        color: '#f8fafc',
        fontSize: 14,
        textAlign: 'center',
    },
    textGold: {
        color: '#fbbf24',
        fontWeight: 'bold',
    },
    textSuccess: {
        color: '#22c55e',
    },
    textError: {
        color: '#ef4444',
    }
});
