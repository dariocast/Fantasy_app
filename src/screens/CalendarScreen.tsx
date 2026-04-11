import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal } from 'react-native';
import { useStore } from '../store';
import type { Match } from '../types';

export default function CalendarScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);
    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === leagueId);
    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);

    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [viewType, setViewType] = useState<'list' | 'bracket'>('list');

    // Group matches by matchday
    const groupedMatches = matches.reduce((acc, m) => {
        if (!acc[m.matchday]) acc[m.matchday] = [];
        acc[m.matchday].push(m);
        return acc;
    }, {} as Record<number, Match[]>);

    const descendingMatchdays = Object.keys(groupedMatches).map(Number).sort((a, b) => b - a);

    if (!league) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Devi prima navigare in una lega.</Text>
            </View>
        );
    }

    const renderMatchDetails = () => {
        if (!selectedMatch) return null;

        const home = realTeams.find(t => t.id === selectedMatch.homeTeamId);
        const away = realTeams.find(t => t.id === selectedMatch.awayTeamId);

        return (
            <Modal animationType="slide" transparent={true} visible={!!selectedMatch} onRequestClose={() => setSelectedMatch(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedMatch(null)}>
                            <Text style={styles.closeBtnText}>Chiudi</Text>
                        </TouchableOpacity>
                        
                        <Text style={styles.modalTitle}>Referto Partita</Text>
                        <Text style={styles.modalSubtitle}>
                            {selectedMatch.matchType === 'campionato' ? `Giornata ${selectedMatch.matchday}` : selectedMatch.stage || 'Playoff'}
                        </Text>

                        {/* Scoreboard */}
                        <View style={styles.scoreboard}>
                            <View style={styles.teamCol}>
                                <Text style={styles.teamNameScore} numberOfLines={1}>{home?.name || 'TBD'}</Text>
                                <Text style={styles.scoreText}>{selectedMatch.homeScore}</Text>
                            </View>
                            <Text style={styles.vsText}>-</Text>
                            <View style={styles.teamCol}>
                                <Text style={styles.teamNameScore} numberOfLines={1}>{away?.name || 'TBD'}</Text>
                                <Text style={styles.scoreText}>{selectedMatch.awayScore}</Text>
                            </View>
                        </View>
                        {selectedMatch.homePenalties !== undefined && (
                            <Text style={styles.penaltiesText}>
                                d.c.r. ({selectedMatch.homePenalties} - {selectedMatch.awayPenalties})
                            </Text>
                        )}

                        <Text style={styles.statusText}>
                            {selectedMatch.status === 'finished' ? 'RISULTATO FINALE' : selectedMatch.status === 'in_progress' ? 'LIVE' : 'NON INIZIATA'}
                        </Text>

                        <ScrollView style={styles.eventsList}>
                            <Text style={styles.eventsTitle}>Eventi Salienti</Text>
                            {selectedMatch.events.length === 0 ? (
                                <Text style={styles.emptyText}>Nessun evento registrato nella partita.</Text>
                            ) : (
                                selectedMatch.events.map((ev, idx) => {
                                    const isHomeEvent = ev.teamId === selectedMatch.homeTeamId;
                                    const p = players.find(x => x.id === ev.playerId);
                                    
                                    const iconMap: any = {
                                        goal: '⚽', assist: '👟', yellow_card: '🟨', red_card: '🟥', own_goal: '🤦‍♂️', mvp: '⭐', foul: '❌', extra: '✨'
                                    };

                                    return (
                                        <View key={idx} style={[
                                            styles.eventItem,
                                            isHomeEvent ? styles.eventHome : styles.eventAway
                                        ]}>
                                            {isHomeEvent && <Text style={styles.eventIcon}>{iconMap[ev.type]}</Text>}
                                            <View style={[styles.eventDetails, isHomeEvent ? { alignItems: 'flex-start' } : { alignItems: 'flex-end' }]}>
                                                <Text style={styles.eventPlayerName}>{p?.name}</Text>
                                                <Text style={styles.eventType}>{ev.type.replace('_', ' ').toUpperCase()}</Text>
                                            </View>
                                            {!isHomeEvent && <Text style={styles.eventIcon}>{iconMap[ev.type]}</Text>}
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Calendario</Text>
                <View style={styles.tabs}>
                    <TouchableOpacity style={[styles.tabBtn, viewType === 'list' && styles.tabBtnActive]} onPress={() => setViewType('list')}>
                        <Text style={[styles.tabText, viewType === 'list' && styles.tabTextActive]}>Campionato</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, viewType === 'bracket' && styles.tabBtnActive]} onPress={() => setViewType('bracket')}>
                        <Text style={[styles.tabText, viewType === 'bracket' && styles.tabTextActive]}>Playoff</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollContainer} contentContainerStyle={{ padding: 16 }}>
                {viewType === 'list' ? (
                    descendingMatchdays.map(day => {
                        const dayMatches = groupedMatches[day].filter(m => !m.matchType || m.matchType === 'campionato' || m.matchType === 'gironi');
                        if (dayMatches.length === 0) return null;
                        return (
                            <View key={day} style={styles.matchdayGroup}>
                                <Text style={styles.matchdayTitle}>Giornata {day}</Text>
                                {dayMatches.map(m => {
                                    const home = realTeams.find(t => t.id === m.homeTeamId);
                                    const away = realTeams.find(t => t.id === m.awayTeamId);
                                    return (
                                        <TouchableOpacity key={m.id} style={styles.matchCard} onPress={() => setSelectedMatch(m)}>
                                            <View style={styles.teamRow}>
                                                <Text style={[styles.teamName, m.homeScore > m.awayScore && styles.teamWinner]} numberOfLines={1}>{home?.name}</Text>
                                                <Text style={styles.score}>{m.homeScore}</Text>
                                            </View>
                                            <View style={styles.teamRow}>
                                                <Text style={[styles.teamName, m.awayScore > m.homeScore && styles.teamWinner]} numberOfLines={1}>{away?.name}</Text>
                                                <Text style={styles.score}>{m.awayScore}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        );
                    })
                ) : (
                    <View>
                        {Array.from(new Set(matches.filter(m => m.matchType === 'playoff' || m.matchType === 'playout').map(m => m.stage || 'Playoff'))).reverse().map(stage => {
                            const stageMatches = matches.filter(m => (m.matchType === 'playoff' || m.matchType === 'playout') && (m.stage || 'Playoff') === stage);
                            return (
                                <View key={stage} style={styles.matchdayGroup}>
                                    <Text style={styles.stageTitle}>{stage}</Text>
                                    {stageMatches.map(m => {
                                        const home = realTeams.find(t => t.id === m.homeTeamId);
                                        const away = realTeams.find(t => t.id === m.awayTeamId);
                                        return (
                                            <TouchableOpacity key={m.id} style={styles.matchCard} onPress={() => setSelectedMatch(m)}>
                                                <View style={styles.teamRow}>
                                                    <Text style={[styles.teamName, m.homeScore > m.awayScore && styles.teamWinner]} numberOfLines={1}>{home?.name || 'TBD'}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        {m.homePenalties !== undefined && <Text style={styles.penalties}>({m.homePenalties}) </Text>}
                                                        <Text style={styles.score}>{m.homeScore}</Text>
                                                    </View>
                                                </View>
                                                <View style={styles.teamRow}>
                                                    <Text style={[styles.teamName, m.awayScore > m.homeScore && styles.teamWinner]} numberOfLines={1}>{away?.name || 'TBD'}</Text>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                        {m.awayPenalties !== undefined && <Text style={styles.penalties}>({m.awayPenalties}) </Text>}
                                                        <Text style={styles.score}>{m.awayScore}</Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            );
                        })}
                    </View>
                )}
                {matches.length === 0 && <Text style={styles.emptyText}>Ancora nessuna partita programmata.</Text>}
            </ScrollView>

            {renderMatchDetails()}
        </View>
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
        textAlign: 'center',
        marginTop: 20,
    },
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 0,
        backgroundColor: '#1e293b',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#38bdf8',
        marginBottom: 16,
    },
    tabs: {
        flexDirection: 'row',
    },
    tabBtn: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginRight: 16,
    },
    tabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#38bdf8',
    },
    tabText: {
        color: '#94a3b8',
        fontSize: 14,
        fontWeight: 'bold',
    },
    tabTextActive: {
        color: '#38bdf8',
    },
    scrollContainer: {
        flexGrow: 1,
    },
    matchdayGroup: {
        marginBottom: 24,
    },
    matchdayTitle: {
        color: '#f8fafc',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
        paddingBottom: 4,
    },
    stageTitle: {
        color: '#fbbf24',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(251, 191, 36, 0.2)',
        paddingBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    matchCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    teamRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginVertical: 4,
    },
    teamName: {
        color: '#f8fafc',
        fontSize: 14,
        flex: 1,
        paddingRight: 10,
    },
    teamWinner: {
        fontWeight: 'bold',
        color: '#fff',
    },
    score: {
        color: '#38bdf8',
        fontWeight: 'bold',
        fontSize: 16,
        width: 30,
        textAlign: 'right',
    },
    penalties: {
        color: '#fbbf24',
        fontSize: 12,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        maxHeight: '90%',
    },
    closeBtn: {
        alignSelf: 'flex-end',
        padding: 8,
    },
    closeBtnText: {
        color: '#38bdf8',
        fontWeight: 'bold',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#f8fafc',
        textAlign: 'center',
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    scoreboard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 20,
        borderRadius: 16,
        marginBottom: 10,
    },
    teamCol: {
        flex: 1,
        alignItems: 'center',
    },
    teamNameScore: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    scoreText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#38bdf8',
    },
    vsText: {
        color: '#94a3b8',
        fontSize: 20,
        marginHorizontal: 16,
    },
    penaltiesText: {
        textAlign: 'center',
        color: '#fbbf24',
        fontWeight: 'bold',
        marginBottom: 10,
    },
    statusText: {
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 24,
    },
    eventsList: {
        maxHeight: 250,
    },
    eventsTitle: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 16,
        marginBottom: 12,
    },
    eventItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 8,
        marginBottom: 8,
    },
    eventHome: {
        borderLeftWidth: 4,
        borderLeftColor: '#0ea5e9',
        justifyContent: 'flex-start',
    },
    eventAway: {
        borderRightWidth: 4,
        borderRightColor: '#0ea5e9',
        justifyContent: 'flex-end',
    },
    eventIcon: {
        fontSize: 18,
        marginHorizontal: 12,
    },
    eventDetails: {},
    eventPlayerName: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 14,
    },
    eventType: {
        color: '#94a3b8',
        fontSize: 10,
    }
});
