import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { BarChart2, Star, Award, ShieldAlert, ChevronRight, Info, CircleStar, Footprints, RectangleVertical } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import type { Player } from '../types';

const SportShoe = ({ size = 24, color = '#000', style }: { size?: number; color?: string; style?: any }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="m15 10.42 4.8-5.07" />
        <Path d="M19 18h3" />
        <Path d="M9.5 22 21.414 9.415A2 2 0 0 0 21.2 6.4l-5.61-4.208A1 1 0 0 0 14 3v2a2 2 0 0 1-1.394 1.906L8.677 8.053A1 1 0 0 0 8 9c-.155 6.393-2.082 9-4 9a2 2 0 0 0 0 4h14" />
    </Svg>
);

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
        players.forEach(p => {
            statsMap.set(p.id, { goals: 0, assists: 0, yellowCards: 0, redCards: 0, mvps: 0, voteSum: 0, voteCount: 0 });
        });
        matches.forEach(m => {
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

    const getTopScorers = () => players.filter(p => aggregatedStats.get(p.id)?.goals! > 0).sort((a, b) => aggregatedStats.get(b.id)!.goals - aggregatedStats.get(a.id)!.goals);
    const getTopAssists = () => players.filter(p => aggregatedStats.get(p.id)?.assists! > 0).sort((a, b) => aggregatedStats.get(b.id)!.assists - aggregatedStats.get(a.id)!.assists);
    const getTopBadBoys = () => players.filter(p => aggregatedStats.get(p.id)!.redCards > 0 || aggregatedStats.get(p.id)!.yellowCards > 0).sort((a, b) => {
        const sA = aggregatedStats.get(a.id)!; const sB = aggregatedStats.get(b.id)!;
        return (sB.redCards * 3 + sB.yellowCards) - (sA.redCards * 3 + sA.yellowCards);
    });
    const getTopVotes = () => players.filter(p => aggregatedStats.get(p.id)!.voteCount > 0).sort((a, b) => {
        const sA = aggregatedStats.get(a.id)!; const sB = aggregatedStats.get(b.id)!;
        return (sB.voteSum / sB.voteCount) - (sA.voteSum / sA.voteCount);
    });

    const renderPlayerPhoto = (player: Player) => {
        if (player.photo) {
            return <Image source={{ uri: player.photo }} style={styles.playerPhoto} />;
        }
        return (
            <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{player.name.charAt(0)}</Text>
            </View>
        );
    };

    const renderTable = (list: Player[], type: string) => {
        if (list.length === 0) return <Text style={styles.emptyText}>Nessun dato disponibile.</Text>;
        return (
            <View style={styles.table}>
                {list.slice(0, 50).map((player, idx) => {
                    const stats = aggregatedStats.get(player.id)!;
                    const team = realTeams.find(t => t.id === player.realTeamId);
                    let mainValue = type === 'votes' ? (stats.voteSum / stats.voteCount).toFixed(2) : (type === 'goals' ? stats.goals.toString() : stats.assists.toString());
                    return (
                        <View key={player.id} style={styles.row}>
                            <Text style={styles.colPos}>{idx + 1}</Text>
                            {renderPlayerPhoto(player)}
                            <View style={styles.colInfo}>
                                <Text style={styles.playerName}>{player.name}</Text>
                                <Text style={styles.playerTeam}>{team?.name}  •  {player.position}</Text>
                            </View>
                            {type === 'cards' ? (
                                <View style={styles.cardsCol}>
                                    <View style={styles.cardBox}><Text style={styles.cardTxtCol}>{stats.yellowCards}</Text><View style={[styles.cardSquare, { backgroundColor: '#fbbf24' }]} /></View>
                                    <View style={styles.cardBox}><Text style={styles.cardTxtCol}>{stats.redCards}</Text><View style={[styles.cardSquare, { backgroundColor: '#ef4444' }]} /></View>
                                </View>
                            ) : <Text style={styles.colValue}>{mainValue}</Text>}
                        </View>
                    );
                })}
            </View>
        );
    };

    let title = activeTab === 'assists' ? "Assist-Man" : (activeTab === 'cards' ? "Peggior Fair-Play" : (activeTab === 'votes' ? "Miglior Media Voto" : "Capocannonieri"));
    let listDesc = activeTab === 'assists' ? "Migliori assist-man." : (activeTab === 'cards' ? "Giocatori più sanzionati (Rosso=3pt, Giallo=1pt)" : (activeTab === 'votes' ? "Migliori per media voto." : "Migliori marcatori."));
    let activeList = activeTab === 'assists' ? getTopAssists() : (activeTab === 'cards' ? getTopBadBoys() : (activeTab === 'votes' ? getTopVotes() : getTopScorers()));

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Statistiche</Text>
            </View>

            <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
                    <TouchableOpacity style={[styles.tabBtn, activeTab === 'goals' && styles.tabBtnActive]} onPress={() => setActiveTab('goals')}>
                        <CircleStar size={16} color={activeTab === 'goals' ? '#fbbf24' : '#94a3b8'} style={{ marginRight: 8 }} />
                        <Text style={[styles.tabText, activeTab === 'goals' && styles.tabTextActive]}>Gol</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, activeTab === 'assists' && styles.tabBtnActive]} onPress={() => setActiveTab('assists')}>
                        <SportShoe size={16} color={activeTab === 'assists' ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 10 }} />
                        <Text style={[styles.tabText, activeTab === 'assists' && styles.tabTextActive]}>Assist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, activeTab === 'cards' && styles.tabBtnActive]} onPress={() => setActiveTab('cards')}>
                        <RectangleVertical size={16} color={activeTab === 'cards' ? '#ef4444' : '#94a3b8'} style={{ marginRight: 8 }} />
                        <Text style={[styles.tabText, activeTab === 'cards' && styles.tabTextActive]}>Cartellini</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, activeTab === 'votes' && styles.tabBtnActive]} onPress={() => setActiveTab('votes')}>
                        <BarChart2 size={16} color={activeTab === 'votes' ? '#4ade80' : '#94a3b8'} style={{ marginRight: 8 }} />
                        <Text style={[styles.tabText, activeTab === 'votes' && styles.tabTextActive]}>Media Voto</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>{title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Info size={12} color="#64748b" style={{ marginRight: 6 }} />
                    <Text style={styles.listDesc}>{listDesc}</Text>
                </View>
            </View>
            <ScrollView contentContainerStyle={styles.content}>{renderTable(activeList, activeTab)}</ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    tabsWrapper: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabsContent: { paddingHorizontal: 16, paddingVertical: 12 },
    tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
    tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    tabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
    tabTextActive: { color: '#38bdf8' },
    listHeader: { padding: 20, backgroundColor: 'rgba(255, 255, 255, 0.02)', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.05)' },
    listTitle: { color: '#f8fafc', fontSize: 22, fontWeight: '900', letterSpacing: -0.5 },
    listDesc: { color: '#64748b', fontSize: 13, fontWeight: '500' },
    content: { paddingHorizontal: 16, paddingVertical: 15, paddingBottom: 60 },
    emptyText: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 15 },
    table: { marginTop: 5 },
    row: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    colPos: { width: 35, color: '#475569', fontWeight: '900', fontSize: 16 },
    colInfo: { flex: 1, marginLeft: 12 },
    playerName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    playerTeam: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
    colValue: { color: '#38bdf8', fontSize: 22, fontWeight: '900', width: 70, textAlign: 'right' },
    cardsCol: { flexDirection: 'row', gap: 10 },
    cardBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    cardTxtCol: { color: '#f8fafc', fontSize: 15, fontWeight: '900' },
    cardSquare: { width: 12, height: 16, borderRadius: 3 },
    playerPhoto: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)' },
    photoPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    photoPlaceholderText: { color: '#475569', fontWeight: 'bold', fontSize: 18 }
});
