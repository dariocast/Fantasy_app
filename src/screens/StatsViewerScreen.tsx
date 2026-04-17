import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import type { Player } from '../types';

interface PlayerStats {
    goals: number;
    assists: number;
    yellowCards: number;
    redCards: number;
    mvps: number;
    voteSum: number;
    voteCount: number;
}

export default function StatsViewerScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId && m.status === 'finished');
    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === leagueId);

    const [activeTab, setActiveTab] = useState<'goals' | 'assists' | 'cards' | 'votes'>('goals');

    const aggregatedStats = useMemo(() => {
        const statsMap = new Map<string, PlayerStats>();

        // Init stats
        players.forEach(p => {
            statsMap.set(p.id, {
                goals: 0,
                assists: 0,
                yellowCards: 0,
                redCards: 0,
                mvps: 0,
                voteSum: 0,
                voteCount: 0
            });
        });

        // Process matches
        matches.forEach(m => {
            // Events
            m.events?.forEach(ev => {
                const s = statsMap.get(ev.playerId);
                if (s) {
                    if (ev.type === 'goal') s.goals++;
                    if (ev.type === 'assist') s.assists++;
                    if (ev.type === 'yellow_card') s.yellowCards++;
                    if (ev.type === 'red_card') s.redCards++;
                    if (ev.type === 'mvp') s.mvps++;
                }
            });

            // Votes
            if (m.playerVotes) {
                Object.entries(m.playerVotes).forEach(([playerId, vote]) => {
                    const s = statsMap.get(playerId);
                    if (s && vote > 0) {
                        s.voteSum += vote;
                        s.voteCount++;
                    }
                });
            }
        });

        return statsMap;
    }, [matches, players]);

    const getTopScorers = () => {
        return players
            .filter(p => aggregatedStats.get(p.id)?.goals! > 0)
            .sort((a, b) => aggregatedStats.get(b.id)!.goals - aggregatedStats.get(a.id)!.goals);
    };

    const getTopAssists = () => {
        return players
            .filter(p => aggregatedStats.get(p.id)?.assists! > 0)
            .sort((a, b) => aggregatedStats.get(b.id)!.assists - aggregatedStats.get(a.id)!.assists);
    };

    const getTopBadBoys = () => {
        return players
            .filter(p => aggregatedStats.get(p.id)!.redCards > 0 || aggregatedStats.get(p.id)!.yellowCards > 0)
            .sort((a, b) => {
                const sA = aggregatedStats.get(a.id)!;
                const sB = aggregatedStats.get(b.id)!;
                const pA = sA.redCards * 3 + sA.yellowCards;
                const pB = sB.redCards * 3 + sB.yellowCards;
                return pB - pA;
            });
    };

    const getTopVotes = () => {
        return players
            .filter(p => aggregatedStats.get(p.id)!.voteCount > 0)
            .sort((a, b) => {
                const sA = aggregatedStats.get(a.id)!;
                const sB = aggregatedStats.get(b.id)!;
                const avgA = sA.voteSum / sA.voteCount;
                const avgB = sB.voteSum / sB.voteCount;
                return avgB - avgA;
            });
    };

    const renderTable = (list: Player[], type: string) => {
        if (list.length === 0) return <Text style={styles.emptyText}>Nessun dato disponibile.</Text>;
        return (
            <View style={styles.table}>
                {list.slice(0, 50).map((player, idx) => {
                    const stats = aggregatedStats.get(player.id)!;
                    const team = realTeams.find(t => t.id === player.realTeamId);

                    let mainValue = '';
                    if (type === 'goals') mainValue = stats.goals.toString();
                    if (type === 'assists') mainValue = stats.assists.toString();
                    if (type === 'votes') mainValue = (stats.voteSum / stats.voteCount).toFixed(2);

                    return (
                        <View key={player.id} style={styles.row}>
                            <Text style={styles.colPos}>{idx + 1}</Text>
                            <View style={styles.colInfo}>
                                <Text style={styles.playerName}>{player.name}</Text>
                                <Text style={styles.playerTeam}>{team?.name}  •  {player.position}</Text>
                            </View>

                            {type === 'cards' ? (
                                <View style={styles.cardsCol}>
                                    <View style={styles.cardBox}>
                                        <Text style={styles.cardTxtCol}>{stats.yellowCards}</Text>
                                        <View style={[styles.cardSquare, { backgroundColor: '#fbbf24' }]} />
                                    </View>
                                    <View style={styles.cardBox}>
                                        <Text style={styles.cardTxtCol}>{stats.redCards}</Text>
                                        <View style={[styles.cardSquare, { backgroundColor: '#ef4444' }]} />
                                    </View>
                                </View>
                            ) : (
                                <Text style={styles.colValue}>{mainValue}</Text>
                            )}
                        </View>
                    );
                })}
            </View>
        );
    };

    let title = "Capocannonieri";
    let listDesc = "Classifica dei migliori marcatori del torneo.";
    let activeList = getTopScorers();

    if (activeTab === 'assists') {
        title = "Assist-Man";
        listDesc = "Classifica dei migliori assist-man.";
        activeList = getTopAssists();
    } else if (activeTab === 'cards') {
        title = "Peggior Fair-Play";
        listDesc = "Giocatori più sanzionati (Rosso = 3pti, Giallo = 1pt)";
        activeList = getTopBadBoys();
    } else if (activeTab === 'votes') {
        title = "Miglior Media Voto";
        listDesc = "I migliori giocatori per media voto.";
        activeList = getTopVotes();
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Statistiche Calciatori</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsWrapper} contentContainerStyle={styles.tabsContent}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'goals' && styles.tabBtnActive]} onPress={() => setActiveTab('goals')}>
                    <Text style={[styles.tabText, activeTab === 'goals' && styles.tabTextActive]}>⚽ Gol</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'assists' && styles.tabBtnActive]} onPress={() => setActiveTab('assists')}>
                    <Text style={[styles.tabText, activeTab === 'assists' && styles.tabTextActive]}>👟 Assist</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'cards' && styles.tabBtnActive]} onPress={() => setActiveTab('cards')}>
                    <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>🟨 Cartellini</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === 'votes' && styles.tabBtnActive]} onPress={() => setActiveTab('votes')}>
                    <Text style={[styles.tabText, activeTab === 'votes' && styles.tabTextActive]}>⭐ Media Voto</Text>
                </TouchableOpacity>
            </ScrollView>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{title}</Text>
                <Text style={styles.listDesc}>{listDesc}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {renderTable(activeList, activeTab)}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtnText: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },

    tabsWrapper: { maxHeight: 60, minHeight: 60, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabsContent: { paddingHorizontal: 16, alignItems: 'center' },
    tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 10 },
    tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)' },
    tabText: { color: '#94a3b8', fontWeight: 'bold' },
    tabTextActive: { color: '#38bdf8' },

    listHeader: { padding: 20, backgroundColor: 'rgba(56, 189, 248, 0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(56, 189, 248, 0.2)' },
    listTitle: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    listDesc: { color: '#94a3b8', fontSize: 13 },

    content: { paddingHorizontal: 16, paddingBottom: 60 },
    emptyText: { color: '#94a3b8', textAlign: 'center', marginTop: 30, fontSize: 16 },

    table: { marginTop: 10 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    colPos: { width: 30, color: '#64748b', fontWeight: 'bold', fontSize: 16 },
    colInfo: { flex: 1 },
    playerName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    playerTeam: { color: '#94a3b8', fontSize: 12 },
    colValue: { color: '#38bdf8', fontSize: 20, fontWeight: 'bold', width: 50, textAlign: 'right' },

    cardsCol: { flexDirection: 'row', gap: 12 },
    cardBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    cardTxtCol: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    cardSquare: { width: 12, height: 16, borderRadius: 2 }
});
