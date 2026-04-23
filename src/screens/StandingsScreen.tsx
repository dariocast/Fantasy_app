import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Trophy, ChevronRight } from 'lucide-react-native';

export default function StandingsScreen() {
    const activeLeagueId = useStore(state => state.activeLeagueId);
    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === activeLeagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === activeLeagueId && m.status === 'finished');

    const calculateStandings = () => {
        const standings = realTeams.map(team => {
            const teamMatches = matches.filter(m => m.homeTeamId === team.id || m.awayTeamId === team.id);

            let pts = 0, wins = 0, draws = 0, losses = 0, gf = 0, gs = 0;

            teamMatches.forEach(m => {
                const isHome = m.homeTeamId === team.id;
                const teamScore = isHome ? m.homeScore : m.awayScore;
                const opponentScore = isHome ? m.awayScore : m.homeScore;

                gf += teamScore;
                gs += opponentScore;

                if (teamScore > opponentScore) { pts += 3; wins++; }
                else if (teamScore === opponentScore) { pts += 1; draws++; }
                else { losses++; }
            });

            return {
                id: team.id,
                name: team.name,
                logo: team.logo,
                played: teamMatches.length,
                wins, draws, losses, gf, gs,
                gd: gf - gs,
                pts
            };
        });

        return standings.sort((a, b) => {
            if (b.pts !== a.pts) return b.pts - a.pts;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.gf - a.gf;
        });
    };

    const standings = calculateStandings();

    // Costanti per le larghezze delle colonne
    const FIXED_COL_WIDTH = 150; // Pos + Team
    const STAT_COL_WIDTH = 50;  // PG, Pt, V, P, S, ecc.

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Trophy color="#fbbf24" size={24} style={{ marginRight: 12 }} />
                <Text style={styles.headerTitle}>Classifica</Text>
            </View>

            <ScrollView bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={styles.tableContainer}>
                    {/* PARTE FISSA: Header e Colonne Posizione/Squadra */}
                    <View style={[styles.fixedColumn, { width: FIXED_COL_WIDTH }]}>
                        {/* Header Fisso */}
                        <View style={[styles.row, styles.headerRow]}>
                            <Text style={[styles.headerText, { width: 35, textAlign: 'center' }]}>#</Text>
                            <Text style={[styles.headerText, { flex: 1, textAlign: 'left', marginLeft: 10 }]}>Squadra</Text>
                        </View>
                        {/* Righe Fisse */}
                        {standings.map((item, index) => (
                            <View key={item.id} style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                                <View style={[styles.rankBadge, index < 3 && styles.rankBadgeTop]}>
                                    <Text style={[styles.rankText, index < 3 && { color: '#000' }]}>{index + 1}</Text>
                                </View>
                                <View style={styles.teamInfo}>
                                    <Image source={{ uri: item.logo }} style={styles.miniLogo} />
                                    <Text style={styles.teamName} numberOfLines={1}>{item.name}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    {/* PARTE SCORREVOLE: Header e Colonne Statistiche */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} bounces={false}>
                        <View>
                            {/* Header Scorrevole */}
                            <View style={[styles.row, styles.headerRow]}>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>PG</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH, color: '#fbbf24' }]}>Pt</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>V</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>P</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>S</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>GF</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>GS</Text>
                                <Text style={[styles.headerText, { width: STAT_COL_WIDTH }]}>DR</Text>
                            </View>
                            {/* Righe Scorrevoli */}
                            {standings.map((item, index) => (
                                <View key={item.id} style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH }]}>{item.played}</Text>
                                    <Text style={[styles.ptsText, { width: STAT_COL_WIDTH }]}>{item.pts}</Text>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH }]}>{item.wins}</Text>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH }]}>{item.draws}</Text>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH }]}>{item.losses}</Text>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH }]}>{item.gf}</Text>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH }]}>{item.gs}</Text>
                                    <Text style={[styles.statText, { width: STAT_COL_WIDTH, color: item.gd >= 0 ? '#4ade80' : '#f87171' }]}>
                                        {item.gd > 0 ? `+${item.gd}` : item.gd}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    tableContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 20 },
    fixedColumn: { zIndex: 1, backgroundColor: '#0f172a' },
    row: { flexDirection: 'row', height: 55, alignItems: 'center' },
    headerRow: { backgroundColor: 'rgba(255,255,255,0.03)', height: 45, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
    headerText: { color: '#64748b', fontSize: 11, fontWeight: '900', textAlign: 'center', textTransform: 'uppercase', letterSpacing: 1 },
    evenRow: { backgroundColor: 'rgba(255, 255, 255, 0.02)' },
    oddRow: { backgroundColor: 'transparent' },
    rankBadge: { width: 30, height: 30, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginLeft: 5 },
    rankBadgeTop: { backgroundColor: '#fbbf24' },
    rankText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
    teamInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 12 },
    miniLogo: { width: 32, height: 32, borderRadius: 8, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
    teamName: { color: '#f8fafc', fontSize: 15, fontWeight: '700', flexShrink: 1 },
    statText: { color: '#94a3b8', fontSize: 14, textAlign: 'center', fontWeight: '500' },
    ptsText: { color: '#fbbf24', fontSize: 17, fontWeight: '900', textAlign: 'center' },
});
