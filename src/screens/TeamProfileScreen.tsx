import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Shield, Users, Calendar, ChevronLeft, Award, TrendingUp, Info, Activity } from 'lucide-react-native';

export default function TeamProfileScreen({ route, navigation }: any) {
    const { teamId } = route.params;
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const realTeams = useStore(s => s.realTeams);
    const players = useStore(s => s.players).filter(p => p.leagueId === leagueId);
    const matches = useStore(s => s.matches).filter(m => m.leagueId === leagueId);

    const team = realTeams.find(t => t.id === teamId);


    const teamPlayers = players.filter(p => p.realTeamId === teamId);
    const teamMatches = matches.filter(m => m.homeTeamId === teamId || m.awayTeamId === teamId);

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
        const cr = league?.settings?.customRoles?.find(r => r.name === cat);
        return cr?.color || catColors[cat] || '#9E9E9E';
    };

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

    if (!team || !league) return (
        <SafeAreaView style={st.container} edges={['bottom', 'left', 'right']}>
            <View style={st.center}><Text style={st.empty}>Squadra non trovata.</Text></View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={st.container} edges={['bottom', 'left', 'right']}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <ChevronLeft color="#f8fafc" size={24} />
                </TouchableOpacity>
                <Text style={st.headerTitle}>Dettaglio Squadra</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
                <View style={st.hero}>
                    <View style={st.logoWrapper}>
                        {team.logo ? (
                            <Image source={{ uri: team.logo }} style={st.heroLogo} />
                        ) : (
                            <View style={st.avatar}>
                                <Shield color="#fbbf24" size={40} />
                            </View>
                        )}
                    </View>
                    <Text style={st.heroName}>{team.name}</Text>
                    <View style={st.heroSubRow}>
                        <View style={st.heroSubBadge}>
                            <Users size={12} color="#64748b" style={{ marginRight: 6 }} />
                            <Text style={st.heroSubText}>{teamPlayers.length} Giocatori</Text>
                        </View>
                        <View style={st.heroSubBadge}>
                            <Activity size={12} color="#64748b" style={{ marginRight: 6 }} />
                            <Text style={st.heroSubText}>{teamMatches.length} Partite</Text>
                        </View>
                    </View>
                </View>

                <View style={st.statsRow}>
                    <StatBox label="PT" value={stats.pts} color="#fbbf24" />
                    <StatBox label="V" value={stats.won} color="#4ade80" />
                    <StatBox label="N" value={stats.drawn} color="#94a3b8" />
                    <StatBox label="P" value={stats.lost} color="#ef4444" />
                    <StatBox label="DR" value={stats.dr} color={stats.dr >= 0 ? '#4ade80' : '#ef4444'} />
                </View>

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
        </SafeAreaView>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
    headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    empty: { color: '#475569', fontSize: 14, textAlign: 'center', marginTop: 20, fontWeight: 'bold' },
    content: { padding: 16, paddingBottom: 60 },
    hero: { alignItems: 'center', marginBottom: 30 },
    logoWrapper: { marginBottom: 15, padding: 15, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    heroLogo: { width: 90, height: 90, resizeMode: 'contain' },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(251,191,36,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(251,191,36,0.2)' },
    heroName: { color: '#f8fafc', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 10 },
    heroSubRow: { flexDirection: 'row', gap: 10 },
    heroSubBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    heroSubText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 35, backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statBox: { alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '900' },
    statLabel: { color: '#475569', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginTop: 4 },
    sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    catHeader: { borderLeftWidth: 4, paddingLeft: 12, marginBottom: 10, marginTop: 5 },
    catName: { fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    playerRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, marginBottom: 8, borderLeftWidth: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    playerPhotoImg: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
    playerAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    playerAvatarText: { fontSize: 15, fontWeight: '900' },
    playerName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 15, marginBottom: 2 },
    playerInfo: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
    playerPrice: { color: '#fbbf24', fontWeight: '900', fontSize: 14 },
    matchRow: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, marginBottom: 10, borderLeftWidth: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.02)' },
    matchDay: { color: '#475569', fontSize: 11, fontWeight: '900', width: 55, textTransform: 'uppercase' },
    matchTeam: { flex: 1, color: '#f8fafc', fontSize: 14 },
    matchScore: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, minWidth: 45, alignItems: 'center' },
    matchScoreText: { color: '#38bdf8', fontWeight: '900', fontSize: 14 },
    resultBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
    resultText: { fontSize: 12, fontWeight: '900' },
});
