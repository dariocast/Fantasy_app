import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import type { Match, MatchEvent, Player } from '../types';

interface Props {
    match: Match;
    visible: boolean;
    onClose: () => void;
}

export default function MatchCenterModal({ match, visible, onClose }: Props) {
    const realTeams = useStore(s => s.realTeams);
    const players = useStore(s => s.players);
    const leagues = useStore(s => s.leagues);
    const league = leagues.find(l => l.id === match.leagueId);

    const [activeTab, setActiveTab] = useState<'events' | 'votes'>('events');
    const [eventTeam, setEventTeam] = useState('');
    const [eventPlayer, setEventPlayer] = useState('');
    const [eventType, setEventType] = useState<MatchEvent['type']>('goal');

    const homeTeam = realTeams.find(t => t.id === match.homeTeamId);
    const awayTeam = realTeams.find(t => t.id === match.awayTeamId);
    const homePlayers = players.filter(p => p.realTeamId === match.homeTeamId);
    const awayPlayers = players.filter(p => p.realTeamId === match.awayTeamId);
    const teamPlayers = eventTeam ? players.filter(p => p.realTeamId === eventTeam) : [];

    const liveMatch = useStore(s => s.matches).find(m => m.id === match.id) || match;

    const updateMatch = (updated: Match) => {
        useStore.getState().updateMatch(updated);
    };

    const handleScore = (team: 'home' | 'away', delta: number) => {
        updateMatch({
            ...liveMatch,
            homeScore: team === 'home' ? Math.max(0, liveMatch.homeScore + delta) : liveMatch.homeScore,
            awayScore: team === 'away' ? Math.max(0, liveMatch.awayScore + delta) : liveMatch.awayScore,
        });
    };

    const handlePenalty = (team: 'home' | 'away', val: string) => {
        const v = val === '' ? undefined : parseInt(val);
        updateMatch({
            ...liveMatch,
            homePenalties: team === 'home' ? v : liveMatch.homePenalties,
            awayPenalties: team === 'away' ? v : liveMatch.awayPenalties,
        });
    };

    const handleAddEvent = () => {
        if (!eventPlayer || !eventTeam) return Alert.alert('Errore', 'Seleziona squadra e giocatore.');
        let hs = liveMatch.homeScore, as2 = liveMatch.awayScore;
        if (eventType === 'goal') {
            if (eventTeam === liveMatch.homeTeamId) hs++; else as2++;
        } else if (eventType === 'own_goal') {
            if (eventTeam === liveMatch.homeTeamId) as2++; else hs++;
        }
        const ev: MatchEvent = { id: uuidv4(), playerId: eventPlayer, teamId: eventTeam, type: eventType };
        updateMatch({ ...liveMatch, events: [...(liveMatch.events || []), ev], homeScore: hs, awayScore: as2 });
        setEventPlayer('');
        setEventType('goal');
    };

    const handleRemoveEvent = (idx: number) => {
        const ev = (liveMatch.events || [])[idx];
        if (!ev) return;
        let hs = liveMatch.homeScore, as2 = liveMatch.awayScore;
        if (ev.type === 'goal') {
            if (ev.teamId === liveMatch.homeTeamId) hs = Math.max(0, hs - 1); else as2 = Math.max(0, as2 - 1);
        } else if (ev.type === 'own_goal') {
            if (ev.teamId === liveMatch.homeTeamId) as2 = Math.max(0, as2 - 1); else hs = Math.max(0, hs - 1);
        }
        updateMatch({ ...liveMatch, events: (liveMatch.events || []).filter((_, i) => i !== idx), homeScore: hs, awayScore: as2 });
    };

    const handleSetVote = (playerId: string, vote: number) => {
        updateMatch({ ...liveMatch, playerVotes: { ...(liveMatch.playerVotes || {}), [playerId]: vote } });
    };

    const eventIcons: Record<string, string> = {
        goal: '⚽', assist: '👟', yellow_card: '🟨', red_card: '🟥',
        own_goal: '🤦', mvp: '⭐', foul: '❌', extra: '✨'
    };
    const eventLabels: Record<string, string> = {
        goal: 'Gol', assist: 'Assist', yellow_card: 'Giallo', red_card: 'Rosso',
        own_goal: 'Autogol', mvp: 'MVP', foul: 'Fallo', extra: 'Extra'
    };
    const eventTypes: MatchEvent['type'][] = ['goal', 'assist', 'yellow_card', 'red_card', 'own_goal', 'mvp'];

    const isPlayoff = liveMatch.matchType === 'playoff' || liveMatch.matchType === 'playout';
    const isManualVotes = league?.settings.baseVoteType === 'manual';

    return (
        <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
            <View style={s.container}>
                {/* Header */}
                <View style={s.header}>
                    <TouchableOpacity onPress={onClose} style={s.closeBtn}>
                        <Text style={s.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                    <Text style={s.headerSub}>
                        G{liveMatch.matchday} {liveMatch.matchType !== 'campionato' ? `· ${liveMatch.matchType?.toUpperCase()}` : ''} {liveMatch.stage ? `· ${liveMatch.stage}` : ''}
                    </Text>
                </View>

                {/* Scoreboard */}
                <View style={s.scoreboard}>
                    <View style={s.teamCol}>
                        <View style={s.avatar}><Text style={s.avatarText}>{homeTeam?.name?.charAt(0) || '?'}</Text></View>
                        <Text style={s.teamName} numberOfLines={1}>{homeTeam?.name}</Text>
                        <View style={s.scoreRow}>
                            <TouchableOpacity style={s.sBtn} onPress={() => handleScore('home', -1)}><Text style={s.sBtnT}>−</Text></TouchableOpacity>
                            <Text style={s.scoreNum}>{liveMatch.homeScore}</Text>
                            <TouchableOpacity style={s.sBtn} onPress={() => handleScore('home', 1)}><Text style={[s.sBtnT, { color: '#4ade80' }]}>+</Text></TouchableOpacity>
                        </View>
                    </View>
                    <Text style={s.vs}>VS</Text>
                    <View style={s.teamCol}>
                        <View style={s.avatar}><Text style={s.avatarText}>{awayTeam?.name?.charAt(0) || '?'}</Text></View>
                        <Text style={s.teamName} numberOfLines={1}>{awayTeam?.name}</Text>
                        <View style={s.scoreRow}>
                            <TouchableOpacity style={s.sBtn} onPress={() => handleScore('away', -1)}><Text style={s.sBtnT}>−</Text></TouchableOpacity>
                            <Text style={s.scoreNum}>{liveMatch.awayScore}</Text>
                            <TouchableOpacity style={s.sBtn} onPress={() => handleScore('away', 1)}><Text style={[s.sBtnT, { color: '#4ade80' }]}>+</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Penalties (playoff only) */}
                {isPlayoff && (
                    <View style={s.penaltyRow}>
                        <Text style={s.penaltyLabel}>Rigori:</Text>
                        <TextInput style={s.penaltyInput} keyboardType="numeric" value={liveMatch.homePenalties?.toString() ?? ''} onChangeText={v => handlePenalty('home', v)} placeholder="0" placeholderTextColor="#64748b" />
                        <Text style={s.penaltyColon}>:</Text>
                        <TextInput style={s.penaltyInput} keyboardType="numeric" value={liveMatch.awayPenalties?.toString() ?? ''} onChangeText={v => handlePenalty('away', v)} placeholder="0" placeholderTextColor="#64748b" />
                    </View>
                )}

                {/* Tabs */}
                <View style={s.tabs}>
                    <TouchableOpacity style={[s.tab, activeTab === 'events' && s.tabActive]} onPress={() => setActiveTab('events')}>
                        <Text style={[s.tabText, activeTab === 'events' && s.tabTextActive]}>Cronaca Eventi</Text>
                    </TouchableOpacity>
                    {isManualVotes && (
                        <TouchableOpacity style={[s.tab, activeTab === 'votes' && s.tabActive]} onPress={() => setActiveTab('votes')}>
                            <Text style={[s.tabText, activeTab === 'votes' && s.tabTextActive]}>Pagelle</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                    {activeTab === 'events' && (
                        <View>
                            {/* Add Event Form */}
                            <View style={s.card}>
                                <Text style={s.cardTitle}>Registra Evento</Text>
                                {/* Team selector */}
                                <View style={s.chipRow}>
                                    <TouchableOpacity style={[s.chip, eventTeam === match.homeTeamId && s.chipHome]} onPress={() => { setEventTeam(match.homeTeamId); setEventPlayer(''); }}>
                                        <Text style={s.chipText}>{homeTeam?.name}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[s.chip, eventTeam === match.awayTeamId && s.chipAway]} onPress={() => { setEventTeam(match.awayTeamId); setEventPlayer(''); }}>
                                        <Text style={s.chipText}>{awayTeam?.name}</Text>
                                    </TouchableOpacity>
                                </View>
                                {/* Player selector */}
                                {eventTeam !== '' && (
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                                        {teamPlayers.map(p => (
                                            <TouchableOpacity key={p.id} style={[s.playerChip, eventPlayer === p.id && s.playerChipActive]} onPress={() => setEventPlayer(p.id)}>
                                                <Text style={s.playerChipText}>{p.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                )}
                                {/* Event Type */}
                                <View style={[s.chipRow, { flexWrap: 'wrap', marginTop: 8 }]}>
                                    {eventTypes.map(et => (
                                        <TouchableOpacity key={et} style={[s.evChip, eventType === et && s.evChipActive]} onPress={() => setEventType(et)}>
                                            <Text style={s.evChipText}>{eventIcons[et]} {eventLabels[et]}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <TouchableOpacity style={s.addBtn} onPress={handleAddEvent} disabled={!eventPlayer}>
                                    <Text style={s.addBtnText}>Inserisci Evento 📝</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Timeline */}
                            <Text style={s.sectionTitle}>Timeline ({(liveMatch.events || []).length})</Text>
                            {(liveMatch.events || []).length === 0 && <Text style={s.emptyText}>Nessun evento registrato.</Text>}
                            {(liveMatch.events || []).map((ev, idx) => {
                                const p = players.find(x => x.id === ev.playerId);
                                const isHome = ev.teamId === liveMatch.homeTeamId;
                                return (
                                    <View key={idx} style={[s.evRow, { borderLeftColor: isHome ? '#38bdf8' : '#ef4444' }]}>
                                        <Text style={s.evIcon}>{eventIcons[ev.type] || '•'}</Text>
                                        <View style={{ flex: 1 }}>
                                            <Text style={s.evName}>{p?.name || '?'}</Text>
                                            <Text style={s.evType}>{eventLabels[ev.type] || ev.type}</Text>
                                        </View>
                                        <TouchableOpacity onPress={() => handleRemoveEvent(idx)}>
                                            <Text style={{ color: '#ef4444', fontSize: 16 }}>✕</Text>
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {activeTab === 'votes' && (
                        <View>
                            <Text style={s.helpText}>Inserisci il voto base per ogni giocatore. Lascia 0 per chi non ha giocato.</Text>
                            <Text style={[s.sectionTitle, { marginTop: 0 }]}>{homeTeam?.name}</Text>
                            {homePlayers.map(p => <VoteRow key={p.id} player={p} vote={liveMatch.playerVotes?.[p.id] || 0} onVote={v => handleSetVote(p.id, v)} />)}
                            <Text style={s.sectionTitle}>{awayTeam?.name}</Text>
                            {awayPlayers.map(p => <VoteRow key={p.id} player={p} vote={liveMatch.playerVotes?.[p.id] || 0} onVote={v => handleSetVote(p.id, v)} />)}
                        </View>
                    )}
                </ScrollView>
            </View>
        </Modal>
    );
}

function VoteRow({ player, vote, onVote }: { player: Player; vote: number; onVote: (v: number) => void }) {
    const bg = vote > 5.5 ? 'rgba(74,222,128,0.15)' : vote > 0 && vote < 6 ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.05)';
    return (
        <View style={[s.voteRow, { backgroundColor: bg }]}>
            <View style={{ flex: 1 }}>
                <Text style={s.voteName}>{player.name}</Text>
                <Text style={s.votePos}>{player.position}</Text>
            </View>
            <TextInput
                style={s.voteInput}
                keyboardType="decimal-pad"
                value={vote ? vote.toString() : ''}
                onChangeText={v => onVote(parseFloat(v) || 0)}
                placeholder="0"
                placeholderTextColor="#64748b"
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingTop: 55, paddingBottom: 12, paddingHorizontal: 20, backgroundColor: '#1e293b', alignItems: 'center' },
    closeBtn: { position: 'absolute', top: 55, left: 20 },
    closeBtnText: { color: '#94a3b8', fontSize: 22 },
    headerSub: { color: '#94a3b8', fontSize: 13, letterSpacing: 2, textTransform: 'uppercase' },
    scoreboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingVertical: 20, paddingHorizontal: 10, backgroundColor: '#1e293b', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    teamCol: { alignItems: 'center', flex: 1 },
    avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 2, borderColor: '#fbbf24' },
    avatarText: { color: '#fbbf24', fontSize: 22, fontWeight: 'bold' },
    teamName: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
    scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    sBtnT: { color: '#ef4444', fontSize: 18, fontWeight: 'bold' },
    scoreNum: { color: '#fbbf24', fontSize: 32, fontWeight: '900', width: 40, textAlign: 'center' },
    vs: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
    penaltyRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, backgroundColor: 'rgba(251,191,36,0.05)', gap: 8, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    penaltyLabel: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    penaltyInput: { width: 44, height: 36, backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.3)', borderRadius: 8, color: '#fbbf24', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
    penaltyColon: { color: '#fbbf24', fontSize: 20, fontWeight: 'bold' },
    tabs: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: '#0f172a' },
    tab: { flex: 1, paddingVertical: 8, borderRadius: 20, alignItems: 'center' },
    tabActive: { backgroundColor: 'rgba(251,191,36,0.1)', borderWidth: 1, borderColor: '#fbbf24' },
    tabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
    tabTextActive: { color: '#fbbf24' },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { color: '#fbbf24', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    chipRow: { flexDirection: 'row', gap: 8 },
    chip: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)' },
    chipHome: { backgroundColor: 'rgba(56,189,248,0.2)', borderWidth: 1, borderColor: '#38bdf8' },
    chipAway: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: '#ef4444' },
    chipText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 13 },
    playerChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 6 },
    playerChipActive: { backgroundColor: 'rgba(251,191,36,0.25)', borderWidth: 1, borderColor: '#fbbf24' },
    playerChipText: { color: '#f8fafc', fontSize: 12, fontWeight: 'bold' },
    evChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)', marginRight: 6, marginBottom: 6 },
    evChipActive: { backgroundColor: 'rgba(251,191,36,0.2)', borderWidth: 1, borderColor: '#fbbf24' },
    evChipText: { color: '#f8fafc', fontSize: 12 },
    addBtn: { backgroundColor: '#fbbf24', padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
    addBtnText: { color: '#000', fontWeight: 'bold', fontSize: 15 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc', marginTop: 20, marginBottom: 10 },
    emptyText: { color: '#64748b', fontSize: 14, fontStyle: 'italic' },
    evRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 6, borderLeftWidth: 3 },
    evIcon: { fontSize: 18, width: 26, textAlign: 'center' },
    evName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
    evType: { color: '#94a3b8', fontSize: 11, marginTop: 1 },
    helpText: { color: '#94a3b8', fontSize: 13, marginBottom: 16, textAlign: 'center' },
    voteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginBottom: 4 },
    voteName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
    votePos: { color: '#94a3b8', fontSize: 11 },
    voteInput: { width: 60, height: 38, backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, color: '#fbbf24', textAlign: 'center', fontSize: 16, fontWeight: 'bold' },
});
