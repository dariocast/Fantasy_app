import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Calendar, Trophy, ChevronRight, Info, X, Clock, Award, List, GitCommit } from 'lucide-react-native';
import type { Match } from '../types';

const { width } = Dimensions.get('window');

export default function CalendarScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);
    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === leagueId);
    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);

    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
    const [viewType, setViewType] = useState<'list' | 'bracket'>('list');

    const groupedMatches = matches.reduce((acc, m) => {
        if (!acc[m.matchday]) acc[m.matchday] = [];
        acc[m.matchday].push(m);
        return acc;
    }, {} as Record<number, Match[]>);

    const descendingMatchdays = Object.keys(groupedMatches).map(Number).sort((a, b) => b - a);

    if (!league) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Devi prima navigare in una lega.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const renderTeamLogo = (team: any, size: number = 24) => {
        if (team?.logo) {
            return <Image source={{ uri: team.logo }} style={{ width: size, height: size, borderRadius: size / 2, marginRight: 8 }} />;
        }
        return (
            <View style={[styles.logoPlaceholder, { width: size, height: size, borderRadius: size / 2, marginRight: 8 }]}>
                <Text style={[styles.logoPlaceholderText, { fontSize: size * 0.5 }]}>{team?.name?.charAt(0) || '?'}</Text>
            </View>
        );
    };

    const renderMatchDetails = () => {
        if (!selectedMatch) return null;
        const home = realTeams.find(t => t.id === selectedMatch.homeTeamId);
        const away = realTeams.find(t => t.id === selectedMatch.awayTeamId);

        return (
            <Modal animationType="slide" transparent={true} visible={!!selectedMatch} onRequestClose={() => setSelectedMatch(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>Referto Partita</Text>
                                <Text style={styles.modalSubtitle}>
                                    {selectedMatch.matchType === 'campionato' ? `Giornata ${selectedMatch.matchday}` : selectedMatch.stage || 'Eliminazione'}
                                </Text>
                            </View>
                            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedMatch(null)}>
                                <X color="#f8fafc" size={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.scoreboard}>
                            <View style={styles.teamCol}>
                                {renderTeamLogo(home, 55)}
                                <Text style={styles.teamNameScore} numberOfLines={1}>{home?.name || 'TBD'}</Text>
                            </View>
                            <View style={styles.scoreResult}>
                                <Text style={styles.scoreText}>{selectedMatch.homeScore}</Text>
                                <Text style={styles.vsText}>-</Text>
                                <Text style={styles.scoreText}>{selectedMatch.awayScore}</Text>
                            </View>
                            <View style={styles.teamCol}>
                                {renderTeamLogo(away, 55)}
                                <Text style={styles.teamNameScore} numberOfLines={1}>{away?.name || 'TBD'}</Text>
                            </View>
                        </View>
                        
                        {selectedMatch.homePenalties !== undefined && (
                            <View style={styles.penaltiesBox}>
                                <Text style={styles.penaltiesText}>
                                    Vincitore d.c.r. ({selectedMatch.homePenalties} - {selectedMatch.awayPenalties})
                                </Text>
                            </View>
                        )}

                        <View style={styles.statusBadgeContainer}>
                            <View style={[styles.statusBadge, { backgroundColor: selectedMatch.status === 'finished' ? 'rgba(56, 189, 248, 0.1)' : 'rgba(251, 191, 36, 0.1)' }]}>
                                <Text style={[styles.statusBadgeText, { color: selectedMatch.status === 'finished' ? '#38bdf8' : '#fbbf24' }]}>
                                    {selectedMatch.status === 'finished' ? 'RISULTATO FINALE' : selectedMatch.status === 'in_progress' ? 'LIVE' : 'NON INIZIATA'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.eventsContainer}>
                            <View style={styles.eventsHeader}>
                                <Award size={18} color="#94a3b8" style={{ marginRight: 8 }} />
                                <Text style={styles.eventsTitle}>Eventi Partita</Text>
                            </View>
                            <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
                                {selectedMatch.events.length === 0 ? (
                                    <View style={styles.emptyEvents}>
                                        <Info size={32} color="rgba(255,255,255,0.05)" />
                                        <Text style={styles.emptyEventsText}>Nessun evento registrato per questa partita.</Text>
                                    </View>
                                ) : (
                                    selectedMatch.events.map((ev, idx) => {
                                        const isHomeEvent = ev.teamId === selectedMatch.homeTeamId;
                                        const p = players.find(x => x.id === ev.playerId);
                                        const iconMap: any = { goal: '⚽', assist: '👟', yellow_card: '🟨', red_card: '🟥', own_goal: '🤦‍♂️', mvp: '⭐' };
                                        return (
                                            <View key={idx} style={[styles.eventItem, isHomeEvent ? styles.eventHome : styles.eventAway]}>
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
                </View>
            </Modal>
        );
    };

    const renderBracketView = () => {
        const knockoutMatches = matches.filter(m => m.matchType === 'eliminazione' || m.matchType === 'playout');
        const groupedKnockout = knockoutMatches.reduce((acc, m) => {
            const key = m.stage || `Fase ${m.phaseNumber || '?'}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(m);
            return acc;
        }, {} as Record<string, Match[]>);

        if (knockoutMatches.length === 0) {
            return <Text style={styles.emptyText}>Nessuna partita ad eliminazione diretta programmata.</Text>;
        }

        return (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketScroll}>
                {Object.entries(groupedKnockout).map(([stage, phaseMatches]) => (
                    <View key={stage} style={styles.bracketColumn}>
                        <View style={styles.bracketColHeader}>
                            <Text style={styles.bracketColTitle}>{stage.toUpperCase()}</Text>
                        </View>
                        {phaseMatches.map(m => {
                            const home = realTeams.find(t => t.id === m.homeTeamId);
                            const away = realTeams.find(t => t.id === m.awayTeamId);
                            return (
                                <TouchableOpacity key={m.id} style={styles.bracketMatch} onPress={() => setSelectedMatch(m)}>
                                    <View style={styles.bracketMatchTeam}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            {renderTeamLogo(home, 20)}
                                            <Text style={[styles.bracketTeamName, m.status === 'finished' && m.homeScore > m.awayScore && styles.teamWinner]} numberOfLines={1}>{home?.name || 'TBD'}</Text>
                                        </View>
                                        <Text style={styles.bracketScore}>{m.homeScore}</Text>
                                    </View>
                                    <View style={styles.bracketDivider} />
                                    <View style={styles.bracketMatchTeam}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            {renderTeamLogo(away, 20)}
                                            <Text style={[styles.bracketTeamName, m.status === 'finished' && m.awayScore > m.homeScore && styles.teamWinner]} numberOfLines={1}>{away?.name || 'TBD'}</Text>
                                        </View>
                                        <Text style={styles.bracketScore}>{m.awayScore}</Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ))}
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Calendario</Text>
            </View>

            <View style={styles.tabsWrapper}>
                <TouchableOpacity style={[styles.tabBtn, viewType === 'list' && styles.tabBtnActive]} onPress={() => setViewType('list')}>
                    <Calendar size={18} color={viewType === 'list' ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 8 }} />
                    <Text style={[styles.tabText, viewType === 'list' && styles.tabTextActive]}>Campionato</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, viewType === 'bracket' && styles.tabBtnActive]} onPress={() => setViewType('bracket')}>
                    <Trophy size={18} color={viewType === 'bracket' ? '#fbbf24' : '#94a3b8'} style={{ marginRight: 8 }} />
                    <Text style={[styles.tabText, viewType === 'bracket' && styles.tabTextActive]}>Eliminazione</Text>
                </TouchableOpacity>
            </View>

            {viewType === 'list' ? (
                <ScrollView style={styles.scrollContainer} contentContainerStyle={{ padding: 16 }}>
                    {descendingMatchdays.map(day => {
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
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                    {renderTeamLogo(home)}
                                                    <Text style={[styles.teamName, m.status === 'finished' && m.homeScore > m.awayScore && styles.teamWinner]} numberOfLines={1}>{home?.name}</Text>
                                                </View>
                                                <Text style={styles.score}>{m.homeScore}</Text>
                                            </View>
                                            <View style={styles.teamRow}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                    {renderTeamLogo(away)}
                                                    <Text style={[styles.teamName, m.status === 'finished' && m.awayScore > m.homeScore && styles.teamWinner]} numberOfLines={1}>{away?.name}</Text>
                                                </View>
                                                <Text style={styles.score}>{m.awayScore}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        );
                    })}
                    {matches.filter(m => !m.matchType || m.matchType === 'campionato' || m.matchType === 'gironi').length === 0 && (
                        <Text style={styles.emptyText}>Nessuna partita di campionato programmata.</Text>
                    )}
                </ScrollView>
            ) : renderBracketView()}

            {renderMatchDetails()}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    emptyText: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 15 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    tabsWrapper: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabBtnActive: { borderBottomColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.05)' },
    tabText: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
    tabTextActive: { color: '#38bdf8' },
    scrollContainer: { flex: 1 },
    matchdayGroup: { marginBottom: 30 },
    matchdayTitle: { color: '#64748b', fontSize: 12, fontWeight: '900', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    matchCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    teamRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
    teamName: { color: '#94a3b8', fontSize: 15, flex: 1, fontWeight: '500' },
    teamWinner: { fontWeight: '900', color: '#f8fafc' },
    score: { color: '#38bdf8', fontWeight: '900', fontSize: 18, width: 35, textAlign: 'right' },
    logoPlaceholder: { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    logoPlaceholderText: { color: '#475569', fontWeight: 'bold' },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.8)' },
    modalContent: { backgroundColor: '#0f172a', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '92%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: '900', color: '#f8fafc' },
    modalSubtitle: { fontSize: 12, color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    modalCloseBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    scoreboard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 25, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    teamCol: { flex: 1, alignItems: 'center' },
    teamNameScore: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15, marginTop: 10, textAlign: 'center' },
    scoreResult: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    scoreText: { fontSize: 36, fontWeight: '900', color: '#38bdf8' },
    vsText: { color: '#475569', fontSize: 24, fontWeight: 'bold' },
    penaltiesBox: { backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12, alignSelf: 'center', marginBottom: 20 },
    penaltiesText: { color: '#fbbf24', fontWeight: 'bold', fontSize: 13 },
    statusBadgeContainer: { alignItems: 'center', marginBottom: 30 },
    statusBadge: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
    statusBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    eventsContainer: { flex: 1 },
    eventsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, paddingHorizontal: 4 },
    eventsTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
    eventsList: { flex: 1 },
    eventItem: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    eventHome: { borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
    eventAway: { borderRightWidth: 4, borderRightColor: '#38bdf8' },
    eventIcon: { fontSize: 20, marginHorizontal: 12 },
    eventDetails: { flex: 1 },
    eventPlayerName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15 },
    eventType: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginTop: 2 },
    emptyEvents: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
    emptyEventsText: { color: '#475569', fontSize: 14, textAlign: 'center', marginTop: 15, paddingHorizontal: 40 },
    bracketScroll: { padding: 16 },
    bracketColumn: { width: width * 0.75, marginRight: 20 },
    bracketColHeader: { alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    bracketColTitle: { color: '#fbbf24', fontWeight: '900', fontSize: 14 },
    bracketColSub: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
    bracketMatch: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 15, marginBottom: 15, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    bracketMatchTeam: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    bracketTeamName: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13, flex: 1, marginLeft: 8 },
    bracketScore: { color: '#fbbf24', fontWeight: '900', fontSize: 15, marginLeft: 10 },
    bracketDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 6 },
});
