import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useStore } from '../store';

export default function TeamProfileScreen({ route, navigation }: any) {
    const { teamId } = route.params;
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const realTeams = useStore(s => s.realTeams);
    const players = useStore(s => s.players).filter(p => p.leagueId === leagueId);
    const matches = useStore(s => s.matches).filter(m => m.leagueId === leagueId);

    const team = realTeams.find(t => t.id === teamId);
    if (!team || !league) return <View style={st.center}><Text style={st.empty}>Squadra non trovata.</Text></View>;

    const teamPlayers = players.filter(p => p.realTeamId === teamId);
    const teamMatches = matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);

    // Group players by position
    const grouped = useMemo(() => {
        const g: Record<string, typeof teamPlayers> = {};
        teamPlayers.forEach(p => {
            const cat = p.position || 'Altro';
            if (!g[cat]) g[cat] = [];
            g[cat].push(p);
        });
        return g;
    }, [teamPlayers]);

    const catColors: Record<string, string> = { POR: '#FF9800', DIF: '#2196F3', CEN: '#4CAF50', ATT: '#F44336' };
    const getCatColor = (cat: string) => {
        const cr = league.settings.customRoles?.find(r => r.name === cat);
        return cr?.color || catColors[cat] || '#9E9E9E';
    };

    // Team stats
    const stats = useMemo(() => {
        let played = 0, won = 0, drawn = 0, lost = 0, gf = 0, gs = 0;
        teamMatches.filter(m => m.status === 'finished').forEach(m => {
            if (m.matchType && m.matchType !== 'campionato' && m.matchType !== 'gironi') return;
            played++;
            const isHome = m.homeTeamId === teamId;
            const scored = isHome ? m.homeScore : m.awayScore;
            const conceded = isHome ? m.awayScore : m.homeScore;
            gf += scored; gs += conceded;
            if (scored > conceded) won++;
            else if (scored < conceded) lost++;
            else drawn++;
        });
        return { played, won, drawn, lost, gf, gs, pts: won * 3 + drawn, dr: gf - gs };
    }, [teamMatches, teamId]);

    return (
        <View style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={st.backBtn}>&lt;</Text>
                </TouchableOpacity>
                <Text style={st.title} numberOfLines={1}>{team.name}</Text>
            </View>

            <ScrollView contentContainerStyle={st.content}>
                {/* Hero */}
                <View style={st.hero}>
                    {team.logo ? (
                        <Image source={{ uri: team.logo }} style={st.heroLogo} />
                    ) : (
                        <View style={st.avatar}><Text style={st.avatarText}>{team.name.charAt(0)}</Text></View>
                    )}
                    <Text style={st.heroName}>{team.name}</Text>
                    <Text style={st.heroSub}>{teamPlayers.length} Giocatori · {teamMatches.length} Partite</Text>
                </View>

                {/* Quick Stats */}
                <View style={st.statsRow}>
                    <StatBox label="PT" value={stats.pts} color="#fbbf24" />
                    <StatBox label="V" value={stats.won} color="#4ade80" />
                    <StatBox label="N" value={stats.drawn} color="#94a3b8" />
                    <StatBox label="P" value={stats.lost} color="#ef4444" />
                    <StatBox label="DR" value={stats.dr} color={stats.dr >= 0 ? '#4ade80' : '#ef4444'} />
                </View>

                {/* Rosa */}
                <Text style={st.sectionTitle}>Rosa</Text>
                {Object.keys(grouped).length === 0 && <Text style={st.empty}>Nessun giocatore in rosa.</Text>}
                {Object.entries(grouped).map(([cat, pls]) => {
                    const color = getCatColor(cat);
                    return (
                        <View key={cat} style={{ marginBottom: 16 }}>
                            <View style={[st.catHeader, { borderLeftColor: color }]}>
                                <Text style={[st.catName, { color }]}>{cat} ({pls.length})</Text>
                            </View>
                            {pls.map(p => (
                                <TouchableOpacity key={p.id} style={[st.playerRow, { borderLeftColor: color }]} onPress={() => navigation.navigate('PlayerProfile', { playerId: p.id })}>
                                    {p.photo ? (
                                        <Image source={{ uri: p.photo }} style={st.playerPhotoImg} />
                                    ) : (
                                        <View style={[st.playerAvatar, { backgroundColor: color + '22' }]}>
                                            <Text style={[st.playerAvatarText, { color }]}>{p.name.charAt(0)}</Text>
                                        </View>
                                    )}
                                    <View style={{ flex: 1 }}>
                                        <Text style={st.playerName}>{p.name}</Text>
                                        <Text style={st.playerInfo}>{p.realPosition || '?'} · {p.age}a</Text>
                                    </View>
                                    {league.settings.hasFantasy && p.price && (
                                        <Text style={st.playerPrice}>{p.price}M</Text>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    );
                })}

                {/* Calendario */}
                <Text style={st.sectionTitle}>Calendario</Text>
                {teamMatches.length === 0 && <Text style={st.empty}>Nessuna partita programmata.</Text>}
                {[...teamMatches].sort((a, b) => a.matchday - b.matchday).map(m => {
                    const homeT = realTeams.find(t => t.id === m.homeTeamId);
                    const awayT = realTeams.find(t => t.id === m.awayTeamId);
                    const isHome = m.homeTeamId === teamId;
                    const fin = m.status === 'finished';
                    let won = false, drew = false;
                    if (fin) {
                        if (m.homeScore !== m.awayScore) won = isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
                        else drew = true;
                    }
                    const rc = !fin ? '#64748b' : won ? '#4ade80' : drew ? '#94a3b8' : '#ef4444';
                    const rl = !fin ? (m.status === 'in_progress' ? 'LIVE' : '—') : won ? 'V' : drew ? 'N' : 'P';

                    return (
                        <View key={m.id} style={[st.matchRow, { borderLeftColor: rc }]}>
                            <Text style={st.matchDay}>{m.scheduledDate ? new Date(m.scheduledDate).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' }) : `G${m.matchday}`}</Text>
                            <Text style={[st.matchTeam, { fontWeight: isHome ? '900' : '400' }]} numberOfLines={1}>{homeT?.name}</Text>
                            <View style={st.matchScore}>
                                <Text style={st.matchScoreText}>{fin || m.status === 'in_progress' ? `${m.homeScore}-${m.awayScore}` : 'vs'}</Text>
                            </View>
                            <Text style={[st.matchTeam, { fontWeight: !isHome ? '900' : '400', textAlign: 'right' }]} numberOfLines={1}>{awayT?.name}</Text>
                            <View style={[st.resultBadge, { backgroundColor: rc + '22' }]}>
                                <Text style={[st.resultText, { color: rc }]}>{rl}</Text>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

function StatBox({ label, value, color = '#f8fafc' }: { label: string; value: number; color?: string }) {
    return (
        <View style={st.statBox}>
            <Text style={[st.statValue, { color }]}>{value > 0 && label !== 'PT' ? `+${value}` : value}</Text>
            <Text style={st.statLabel}>{label}</Text>
        </View>
    );
}

const st = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    empty: { color: '#64748b', fontSize: 14, textAlign: 'center', fontStyle: 'italic' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    hero: { alignItems: 'center', marginBottom: 20, paddingBottom: 20, borderBottomWidth: 1, borderColor: 'rgba(251,191,36,0.2)' },
    avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fbbf24', marginBottom: 10 },
    avatarText: { color: '#fbbf24', fontSize: 30, fontWeight: 'bold' },
    heroLogo: { width: 80, height: 80, borderRadius: 40, marginBottom: 10, resizeMode: 'contain' },
    playerPhotoImg: { width: 32, height: 32, borderRadius: 16, marginRight: 10, resizeMode: 'cover' },
    heroName: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
    heroSub: { color: '#94a3b8', fontSize: 14 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    statBox: { alignItems: 'center' },
    statValue: { fontSize: 22, fontWeight: '900' },
    statLabel: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },
    sectionTitle: { color: '#f8fafc', fontSize: 17, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },
    catHeader: { borderLeftWidth: 4, paddingLeft: 10, marginBottom: 6 },
    catName: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    playerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 4, borderLeftWidth: 3 },
    playerAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    playerAvatarText: { fontSize: 13, fontWeight: 'bold' },
    playerName: { color: '#f8fafc', fontWeight: '600', fontSize: 14 },
    playerInfo: { color: '#94a3b8', fontSize: 11 },
    playerPrice: { color: '#fbbf24', fontWeight: 'bold', fontSize: 13 },
    matchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, marginBottom: 6, borderLeftWidth: 3, gap: 6 },
    matchDay: { color: '#64748b', fontSize: 11, width: 50 },
    matchTeam: { flex: 1, color: '#f8fafc', fontSize: 13 },
    matchScore: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    matchScoreText: { color: '#f8fafc', fontWeight: '900', fontSize: 13 },
    resultBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, minWidth: 26, alignItems: 'center' },
    resultText: { fontSize: 11, fontWeight: 'bold' },
});
