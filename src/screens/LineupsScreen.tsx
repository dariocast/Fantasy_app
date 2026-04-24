import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Player } from '../types';
import { Shield, Users, Award, ChevronRight, Info, Calendar } from 'lucide-react-native';

export default function LineupsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const activeLeagueId = useStore(state => state.activeLeagueId);
    const league = leagues.find(l => l.id === activeLeagueId);
    const leagueId = league?.id || '';

    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const fantasyLineups = useStore(state => state.fantasyLineups).filter(fl => fantasyTeams.some(ft => ft.id === fl.fantasyTeamId));
    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);

    const matchdays = Array.from(new Set(fantasyLineups.map(l => l.matchday))).sort((a, b) => b - a);
    const [selectedMatchday, setSelectedMatchday] = useState<number | null>(matchdays[0] || null);
    const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);
    const [activeLineupForDetail, setActiveLineupForDetail] = useState<any>(null);

    if (!league || !league.settings.hasFantasy) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Torneo non impostato o Fantacalcio disabilitato.</Text>
                </View>
            </SafeAreaView>
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
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Tutte le Formazioni</Text>
            </View>

            {matchdays.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Info size={40} color="rgba(255,255,255,0.05)" />
                    <Text style={styles.emptyText}>Nessuna formazione schierata per questo torneo.</Text>
                </View>
            ) : (
                <>
                    {league.settings.rosterType === 'variable' && (
                        <View style={styles.matchdayTabsContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
                                {matchdays.map(m => (
                                    <TouchableOpacity
                                        key={m}
                                        style={[styles.matchdayTab, selectedMatchday === m && styles.matchdayTabActive]}
                                        onPress={() => setSelectedMatchday(m)}
                                    >
                                        <Calendar size={14} color={selectedMatchday === m ? '#38bdf8' : '#64748b'} style={{ marginRight: 8 }} />
                                        <Text style={[styles.matchdayTabText, selectedMatchday === m && styles.matchdayTabTextActive]}>G{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

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
                                            <TouchableOpacity 
                                                key={idx} 
                                                style={styles.playerRow}
                                                onPress={() => {
                                                    if (p) {
                                                        setDetailPlayer(p);
                                                        setActiveLineupForDetail(lineup);
                                                    }
                                                }}
                                            >
                                                {p ? (
                                                    <>
                                                        <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position}</Text>
                                                        <Text style={styles.playerName}>{p.name}</Text>
                                                        <Text style={styles.playerScore}>
                                                            {lineup.playerPoints && lineup.playerPoints[p.id] !== undefined ? lineup.playerPoints[p.id] : (lineup.points !== undefined ? '0' : '-')}
                                                        </Text>
                                                    </>
                                                ) : <Text style={styles.emptySlotText}>Slot Vuoto</Text>}
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    <Text style={styles.sectionLabel}>Panchina</Text>
                                    <View style={styles.playersList}>
                                        {benchPlayers.map((p, idx) => p && (
                                            <TouchableOpacity 
                                                key={idx} 
                                                style={styles.playerRow}
                                                onPress={() => {
                                                    setDetailPlayer(p);
                                                    setActiveLineupForDetail(lineup);
                                                }}
                                            >
                                                <Text style={styles.posText}>{idx + 1}.</Text>
                                                <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position}</Text>
                                                <Text style={styles.playerName}>{p.name}</Text>
                                                {lineup.playerPoints && lineup.playerPoints[p.id] !== undefined && (
                                                    <Text style={styles.playerScore}>{lineup.playerPoints[p.id]}</Text>
                                                )}
                                            </TouchableOpacity>
                                        ))}
                                        {benchPlayers.length === 0 && <Text style={styles.emptySlotText}>Nessuno</Text>}
                                    </View>
                                </View>
                            );
                        })}
                    </ScrollView>
                </>
            )}

            {detailPlayer && (
                <View style={styles.modalOverlay}>
                    <View style={styles.detailCard}>
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailTitle}>{detailPlayer.name}</Text>
                            <TouchableOpacity onPress={() => { setDetailPlayer(null); setActiveLineupForDetail(null); }}>
                                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>CHIUDI</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ maxHeight: 400 }}>
                            {activeLineupForDetail?.playerPointsDetails?.[detailPlayer.id] ? (
                                <View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Voto Base</Text>
                                        <Text style={styles.detailValue}>{(activeLineupForDetail.playerPointsDetails[detailPlayer.id].baseVote || 0).toFixed(1)}</Text>
                                    </View>
                                    
                                    {(activeLineupForDetail.playerPointsDetails[detailPlayer.id].events || []).length > 0 && (
                                        <View style={{ marginTop: 15 }}>
                                            <Text style={styles.detailSub}>Eventi in Campo</Text>
                                            {activeLineupForDetail.playerPointsDetails[detailPlayer.id].events.map((ev: any, i: number) => (
                                                <View key={i} style={styles.detailRow}>
                                                    <Text style={styles.detailEventText}>{(ev.type === 'yellow_card' ? 'Giallo' : ev.type === 'red_card' ? 'Rosso' : ev.type.toUpperCase())}</Text>
                                                    <Text style={[styles.detailValue, { color: ev.value > 0 ? '#4ade80' : '#ef4444' }]}>{ev.value > 0 ? '+' : ''}{ev.value.toFixed(1)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {(activeLineupForDetail.playerPointsDetails[detailPlayer.id].manualBonuses || []).length > 0 && (
                                        <View style={{ marginTop: 15 }}>
                                            <Text style={styles.detailSub}>Bonus Manuali</Text>
                                            {activeLineupForDetail.playerPointsDetails[detailPlayer.id].manualBonuses.map((mb: any, i: number) => (
                                                <View key={i} style={styles.detailRow}>
                                                    <Text style={styles.detailEventText}>{mb.description}</Text>
                                                    <Text style={[styles.detailValue, { color: mb.value > 0 ? '#4ade80' : '#ef4444' }]}>{mb.value > 0 ? '+' : ''}{mb.value.toFixed(1)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={[styles.detailRow, { marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 }]}>
                                        <Text style={[styles.detailLabel, { fontSize: 18 }]}>TOTALE</Text>
                                        <Text style={[styles.detailValue, { fontSize: 22, color: '#fbbf24' }]}>{(activeLineupForDetail.playerPointsDetails[detailPlayer.id].total || 0).toFixed(1)}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>Nessun dettaglio disponibile per questa giornata.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    emptyText: { color: '#475569', fontSize: 16, textAlign: 'center', marginTop: 20 },
    matchdayTabsContainer: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabsContent: { paddingHorizontal: 16, paddingVertical: 12 },
    matchdayTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', marginRight: 10, borderWidth: 1, borderColor: 'transparent' },
    matchdayTabActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    matchdayTabText: { color: '#64748b', fontWeight: 'bold', fontSize: 13 },
    matchdayTabTextActive: { color: '#38bdf8' },
    content: { padding: 16, paddingBottom: 60 },
    teamCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    teamCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    teamName: { fontSize: 20, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
    teamPoints: { color: '#fbbf24', fontWeight: '900', fontSize: 18 },
    sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12, marginTop: 10 },
    playersList: { marginBottom: 15 },
    playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    posText: { width: 40, fontSize: 12, color: '#64748b', fontWeight: '900' },
    playerName: { color: '#94a3b8', flex: 1, fontSize: 14, fontWeight: '500' },
    playerScore: { color: '#38bdf8', fontWeight: '900', fontSize: 15, width: 40, textAlign: 'right' },
    emptySlotText: { color: '#475569', fontSize: 13, fontStyle: 'italic', paddingVertical: 4 },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 1000 },
    detailCard: { backgroundColor: '#1e293b', borderRadius: 24, width: '100%', padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    detailLabel: { color: '#94a3b8', fontSize: 14 },
    detailValue: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
    detailSub: { color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    detailEventText: { color: '#cbd5e1', fontSize: 14 }
});
