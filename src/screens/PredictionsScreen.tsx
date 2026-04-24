import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Target, Trophy, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronLeft, Calendar } from 'lucide-react-native';
import { handleError, showSuccess } from '../lib/error-handler';

export default function PredictionsScreen() {
    const leagues = useStore(state => state.leagues);
    const activeLeagueId = useStore(state => state.activeLeagueId);
    const league = leagues.find(l => l.id === activeLeagueId);
    const currentUser = useStore(state => state.currentUser);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === activeLeagueId);
    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === activeLeagueId);
    const realTeams = useStore(state => state.realTeams).filter(rt => rt.leagueId === activeLeagueId);
    const predictions = useStore(state => state.predictions);
    const upsertPrediction = useStore(state => state.upsertPrediction);
    const fetchPredictions = useStore(state => state.fetchPredictions);

    const userFantasyTeam = fantasyTeams.find(ft => ft.userId === currentUser?.id);
    const [loading, setLoading] = useState(false);
    const [viewType, setViewType] = useState<'list' | 'bracket'>('list');
    const [activeMatchday, setActiveMatchday] = useState(1);
    const [localPreds, setLocalPreds] = useState<Record<string, { home: string, away: string }>>({});
    const initialMatchdaySet = useRef(false);

    const getTeamData = (teamId: string) => {
        return realTeams.find(rt => rt.id === teamId);
    };

    useEffect(() => {
        if (activeLeagueId) {
            fetchPredictions(activeLeagueId);
        }
    }, [activeLeagueId]);

    // Group matches by matchday (only for league/groups)
    const leagueMatches = matches.filter(m => !m.matchType || m.matchType === 'campionato' || m.matchType === 'gironi');
    const knockoutMatches = matches.filter(m => m.matchType === 'eliminazione' || m.matchType === 'playout');
    
    const matchdays = Array.from(new Set(leagueMatches.map(m => m.matchday))).sort((a, b) => a - b);
    
    useEffect(() => {
        if (matchdays.length > 0 && !initialMatchdaySet.current) {
            // Find first matchday with at least one scheduled match
            const upcoming = matchdays.find(md => leagueMatches.filter(m => m.matchday === md).some(m => m.status === 'scheduled'));
            if (upcoming) setActiveMatchday(upcoming);
            else setActiveMatchday(matchdays[matchdays.length - 1]);
            initialMatchdaySet.current = true;
        }
    }, [matchdays, leagueMatches]);

    useEffect(() => {
        const initial: Record<string, { home: string, away: string }> = {};
        predictions.forEach(p => {
            initial[p.matchId] = { home: p.homeScore.toString(), away: p.awayScore.toString() };
        });
        setLocalPreds(initial);
    }, [predictions]);

    const handleSavePrediction = async (matchId: string) => {
        if (!userFantasyTeam) return;
        const pred = localPreds[matchId];
        if (!pred || pred.home === '' || pred.away === '') return;

        try {
            setLoading(true);
            await upsertPrediction({
                tournamentId: activeLeagueId!,
                fantasyTeamId: userFantasyTeam.id,
                matchId: matchId,
                homeScore: parseInt(pred.home),
                awayScore: parseInt(pred.away)
            });
            showSuccess('Pronostico salvato!');
        } catch (err) {
            handleError(err, 'Salvataggio Pronostico');
        } finally {
            setLoading(false);
        }
    };

    if (!league || !userFantasyTeam) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Devi far parte di una squadra fantasy per inserire i pronostici.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const currentMatches = viewType === 'list' 
        ? leagueMatches.filter(m => m.matchday === activeMatchday)
        : knockoutMatches;

    const groupedKnockout = knockoutMatches.reduce((acc, m) => {
        const key = m.stage || `Fase ${m.phaseNumber || '?'}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(m);
        return acc;
    }, {} as Record<string, typeof knockoutMatches>);


    const renderMatchCard = (match: any) => {
        const isLocked = match.status !== 'scheduled' || (match.startTime && new Date() >= new Date(match.startTime));
        const prediction = predictions.find(p => p.matchId === match.id && p.fantasyTeamId === userFantasyTeam.id);
        const isSaved = !!prediction;
        
        let pointsEarned = 0;
        if (match.status === 'finished' && prediction) {
            const actualHome = match.homeScore;
            const actualAway = match.awayScore;
            const predHome = prediction.homeScore;
            const predAway = prediction.awayScore;

            if (actualHome === predHome && actualAway === predAway) {
                pointsEarned = league.settings.predictionPointsExact || 0;
            } else {
                const actualDiff = actualHome - actualAway;
                const predDiff = predHome - predAway;
                if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
                    pointsEarned = league.settings.predictionPointsOutcome || 0;
                }
            }
        }

        // Hide finished matches where prediction was lost (0 points)
        if (match.status === 'finished' && pointsEarned === 0) {
            return null;
        }

        return (
            <View key={match.id} style={[styles.matchCard, isLocked && styles.matchCardLocked]}>
                <View style={styles.matchHeader}>
                    <Clock size={14} color="#64748b" />
                    <Text style={styles.matchTime}>
                        {match.scheduledDate ? new Date(match.scheduledDate).toLocaleDateString('it-IT') : 'Data TBD'} - {match.scheduledTime || '--:--'}
                    </Text>
                    {isLocked && <View style={styles.lockedBadge}><Text style={styles.lockedText}>CHIUSO</Text></View>}
                </View>

                <View style={styles.teamsRow}>
                    <View style={styles.teamInfo}>
                        {getTeamData(match.homeTeamId)?.logo && (
                            <Image source={{ uri: getTeamData(match.homeTeamId)?.logo }} style={styles.teamLogo} />
                        )}
                        <Text style={styles.teamName} numberOfLines={1}>{getTeamData(match.homeTeamId)?.name || match.homeTeamId}</Text>
                    </View>
                    <View style={styles.scoreInputGroup}>
                        <TextInput
                            style={[styles.scoreInput, isLocked && styles.scoreInputLocked]}
                            keyboardType="numeric"
                            maxLength={2}
                            editable={!isLocked}
                            value={localPreds[match.id]?.home || ''}
                            onChangeText={(val) => setLocalPreds(prev => ({ ...prev, [match.id]: { ...(prev[match.id] || { away: '' }), home: val.replace(/[^0-9]/g, '') } }))}
                        />
                        <Text style={styles.vsText}>-</Text>
                        <TextInput
                            style={[styles.scoreInput, isLocked && styles.scoreInputLocked]}
                            keyboardType="numeric"
                            maxLength={2}
                            editable={!isLocked}
                            value={localPreds[match.id]?.away || ''}
                            onChangeText={(val) => setLocalPreds(prev => ({ ...prev, [match.id]: { ...(prev[match.id] || { home: '' }), away: val.replace(/[^0-9]/g, '') } }))}
                        />
                    </View>
                    <View style={[styles.teamInfo, { alignItems: 'flex-end' }]}>
                        {getTeamData(match.awayTeamId)?.logo && (
                            <Image source={{ uri: getTeamData(match.awayTeamId)?.logo }} style={styles.teamLogo} />
                        )}
                        <Text style={styles.teamName} numberOfLines={1}>{getTeamData(match.awayTeamId)?.name || match.awayTeamId}</Text>
                    </View>
                </View>

                {match.status === 'finished' && (
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Risultato Finale: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{match.homeScore} - {match.awayScore}</Text></Text>
                        {pointsEarned > 0 ? (
                            <View style={styles.pointsBadge}><Text style={styles.pointsText}>+{pointsEarned} pt</Text></View>
                        ) : isSaved ? (
                            <Text style={styles.missedText}>Nessun punto</Text>
                        ) : null}
                    </View>
                )}

                {!isLocked && (
                    <TouchableOpacity 
                        style={[styles.saveBtn, loading && { opacity: 0.7 }]} 
                        onPress={() => handleSavePrediction(match.id)}
                        disabled={loading}
                    >
                        {isSaved ? <CheckCircle2 size={16} color="#4ade80" /> : <Target size={16} color="#fbbf24" />}
                        <Text style={[styles.saveBtnText, isSaved && { color: '#4ade80' }]}>
                            {isSaved ? 'Modifica Pronostico' : 'Salva Pronostico'}
                        </Text>
                    </TouchableOpacity>
                )}

                {isLocked && isSaved && match.status !== 'finished' && (
                    <View style={styles.statusRow}>
                        <CheckCircle2 size={14} color="#64748b" />
                        <Text style={styles.statusText}>Pronostico inviato correttamente</Text>
                    </View>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Target color="#fbbf24" size={28} />
                    <Text style={styles.title}>Pronostici</Text>
                </View>
                <Text style={styles.subtitle}>Indovina il risultato e scala la classifica!</Text>
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

            {viewType === 'list' && (
                <View style={styles.matchdaySelector}>
                    <TouchableOpacity 
                        onPress={() => setActiveMatchday(prev => Math.max(matchdays[0] || 1, prev - 1))}
                        disabled={activeMatchday <= (matchdays[0] || 1)}
                    >
                        <ChevronLeft color={activeMatchday <= (matchdays[0] || 1) ? '#475569' : '#fbbf24'} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.matchdayLabel}>GIORNATA {activeMatchday}</Text>
                    <TouchableOpacity 
                        onPress={() => setActiveMatchday(prev => Math.min(matchdays[matchdays.length - 1], prev + 1))}
                        disabled={matchdays.length === 0 || activeMatchday >= matchdays[matchdays.length - 1]}
                    >
                        <ChevronRight color={matchdays.length === 0 || activeMatchday >= matchdays[matchdays.length - 1] ? '#475569' : '#fbbf24'} size={24} />
                    </TouchableOpacity>
                </View>
            )}

            <KeyboardAvoidingView 
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.infoCard}>
                        <Trophy size={20} color="#fbbf24" />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.infoTitle}>Regolamento Punti</Text>
                            <Text style={styles.infoText}>
                                • Risultato Esatto: <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>+{league.settings.predictionPointsExact || 0}pt</Text>{"\n"}
                                • Solo Esito (1X2): <Text style={{ color: '#38bdf8', fontWeight: 'bold' }}>+{league.settings.predictionPointsOutcome || 0}pt</Text>
                            </Text>
                        </View>
                    </View>

                    {viewType === 'list' && currentMatches.length === 0 && (
                        <Text style={styles.emptyText}>Nessuna partita in questa giornata.</Text>
                    )}

                    {viewType === 'bracket' && knockoutMatches.length === 0 && (
                        <Text style={styles.emptyText}>Nessuna partita ad eliminazione diretta programmata.</Text>
                    )}

                    {viewType === 'list' ? currentMatches.map(match => {
                        const card = renderMatchCard(match);
                        if (!card) return null;
                        return card;
                    }) : (
                        Object.entries(groupedKnockout)
                            .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
                            .map(([stage, phaseMatches]) => {
                                const renderedMatches = phaseMatches.map(m => renderMatchCard(m)).filter(Boolean);
                                if (renderedMatches.length === 0) return null;
                                return (
                                    <View key={stage} style={{ marginBottom: 20 }}>
                                        <Text style={styles.stageTitle}>{stage.toUpperCase()}</Text>
                                        {renderedMatches}
                                    </View>
                                );
                            })
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fbbf24', marginLeft: 10 },
    subtitle: { color: '#94a3b8', fontSize: 14 },
    matchdaySelector: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    tabsWrapper: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    tabBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 10,
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    tabBtnActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
    },
    tabText: {
        color: '#94a3b8',
        fontSize: 13,
        fontWeight: 'bold',
    },
    tabTextActive: {
        color: '#38bdf8',
    },
    stageTitle: {
        color: '#f8fafc',
        fontSize: 14,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginLeft: 4,
    },
    matchdayLabel: { color: '#f8fafc', fontWeight: '900', fontSize: 16, letterSpacing: 1 },
    content: { padding: 16, paddingBottom: 40 },
    infoCard: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(251, 191, 36, 0.05)', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.1)'
    },
    infoTitle: { color: '#fbbf24', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
    infoText: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
    matchCard: { 
        backgroundColor: 'rgba(255,255,255,0.04)', 
        borderRadius: 16, 
        padding: 16, 
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)'
    },
    matchCardLocked: { opacity: 0.9, backgroundColor: 'rgba(255,255,255,0.02)' },
    matchHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    matchTime: { color: '#64748b', fontSize: 12, marginLeft: 6, flex: 1 },
    lockedBadge: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    lockedText: { color: '#ef4444', fontSize: 10, fontWeight: '900' },
    teamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
    teamInfo: { flex: 1, alignItems: 'center' },
    teamLogo: { width: 30, height: 30, borderRadius: 15, marginBottom: 5 },
    teamName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
    scoreInputGroup: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 10 },
    scoreInput: { 
        width: 40, 
        height: 40, 
        backgroundColor: 'rgba(15, 23, 42, 0.8)', 
        borderRadius: 8, 
        textAlign: 'center', 
        color: '#fbbf24', 
        fontSize: 18, 
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    scoreInputLocked: { backgroundColor: 'transparent', borderColor: 'transparent', color: '#94a3b8' },
    vsText: { color: '#475569', marginHorizontal: 8, fontWeight: 'bold' },
    saveBtn: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'rgba(251, 191, 36, 0.1)', 
        paddingVertical: 10, 
        borderRadius: 10,
        marginTop: 5,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)'
    },
    saveBtnText: { color: '#fbbf24', fontWeight: 'bold', fontSize: 13, marginLeft: 8 },
    statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    statusText: { color: '#64748b', fontSize: 12, marginLeft: 6 },
    resultRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        padding: 10, 
        borderRadius: 8, 
        marginBottom: 10 
    },
    resultLabel: { color: '#94a3b8', fontSize: 12 },
    pointsBadge: { backgroundColor: '#10b981', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    pointsText: { color: '#fff', fontWeight: 'bold', fontSize: 11 },
    missedText: { color: '#ef4444', fontSize: 11, fontWeight: 'bold' }
});
