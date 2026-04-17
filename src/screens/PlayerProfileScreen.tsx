import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { useStore } from '../store';

export default function PlayerProfileScreen({ route, navigation }: any) {
    const { playerId } = route.params;
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const allPlayers = useStore(s => s.players);
    const matches = useStore(s => s.matches);
    const realTeams = useStore(s => s.realTeams);

    const player = allPlayers.find(p => p.id === playerId);
    if (!player || !league) return <View style={st.center}><Text style={st.empty}>Giocatore non trovato.</Text></View>;

    const team = realTeams.find(t => t.id === player.realTeamId);
    const careerPlayers = player.careerId ? allPlayers.filter(p => p.careerId === player.careerId) : [player];
    const currentMatches = matches.filter(m => m.leagueId === leagueId && m.status === 'finished');

    const calcStats = (targetPlayers: typeof allPlayers, targetMatches: typeof matches) => {
        const ids = targetPlayers.map(p => p.id);
        let played = 0, goals = 0, assists = 0, yellows = 0, reds = 0, mvp = 0;
        targetMatches.forEach(m => {
            const pEvents = (m.events || []).filter(e => ids.includes(e.playerId));
            const hasVote = ids.some(id => m.playerVotes && typeof m.playerVotes[id] === 'number' && m.playerVotes[id] > 0);
            if (pEvents.length > 0 || hasVote) played++;
            pEvents.forEach(e => {
                if (e.type === 'goal') goals++;
                if (e.type === 'assist') assists++;
                if (e.type === 'yellow_card') yellows++;
                if (e.type === 'red_card') reds++;
                if (e.type === 'mvp') mvp++;
            });
        });
        return { played, goals, assists, yellows, reds, mvp };
    };

    const currentStats = useMemo(() => calcStats([player], currentMatches), [player, currentMatches]);
    const careerStats = useMemo(() => calcStats(careerPlayers, matches.filter(m => m.status === 'finished')), [careerPlayers, matches]);

    const catColors: Record<string, string> = { POR: '#FF9800', DIF: '#2196F3', CEN: '#4CAF50', ATT: '#F44336' };
    const posColor = league.settings.customRoles?.find(r => r.name === player.position)?.color || catColors[player.position] || '#94a3b8';

    return (
        <View style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={st.backBtn}>&lt;</Text>
                </TouchableOpacity>
                <Text style={st.title} numberOfLines={1}>{player.name}</Text>
            </View>

            <ScrollView contentContainerStyle={st.content}>
                {/* Hero */}
                <View style={[st.hero, { borderBottomColor: posColor + '44' }]}>
                    {player.photo ? (
                        <Image source={{ uri: player.photo }} style={[st.avatar, { borderColor: posColor }]} />
                    ) : (
                        <View style={[st.avatar, { borderColor: posColor }]}>
                            <Text style={[st.avatarText, { color: posColor }]}>{player.name.charAt(0)}</Text>
                        </View>
                    )}
                    <Text style={st.heroName}>{player.name}</Text>
                    <View style={st.badgeRow}>
                        <View style={st.badge}><Text style={st.badgeText}>Età: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{player.age}</Text></Text></View>
                        <View style={st.badge}><Text style={st.badgeText}>Ruolo: <Text style={{ color: '#fff', fontWeight: 'bold' }}>{player.realPosition || '?'}</Text></Text></View>
                        {league.settings.hasFantasy && (
                            <View style={[st.badge, { borderColor: posColor }]}><Text style={[st.badgeText, { color: posColor }]}>Cat: <Text style={{ fontWeight: 'bold' }}>{player.position}</Text></Text></View>
                        )}
                    </View>
                    {team && (
                        <TouchableOpacity onPress={() => navigation.navigate('TeamProfile', { teamId: team.id })}>
                            <Text style={st.teamLink}>🏟️ {team.name}</Text>
                        </TouchableOpacity>
                    )}
                    {league.settings.hasFantasy && (
                        <View style={st.priceBox}>
                            <Text style={st.priceLabel}>QUOTAZIONE</Text>
                            <Text style={st.priceValue}>{player.price || 1}</Text>
                        </View>
                    )}
                </View>

                {/* Current Stats */}
                <Text style={st.sectionTitle}>Statistiche Torneo Corrente</Text>
                <View style={st.statsGrid}>
                    <StatCard label="Presenze" value={currentStats.played} />
                    <StatCard label="Gol" value={currentStats.goals} />
                    <StatCard label="Assist" value={currentStats.assists} />
                    <StatCard label="Amm." value={currentStats.yellows} color="#FFEB3B" />
                    <StatCard label="Esp." value={currentStats.reds} color="#F44336" />
                    <StatCard label="MVP" value={currentStats.mvp} color="#fbbf24" />
                </View>

                {/* Career Stats */}
                {player.careerId && careerPlayers.length > 1 && (
                    <>
                        <Text style={st.sectionTitle}>Statistiche di Carriera</Text>
                        <Text style={st.careerSub}>Aggregato da {careerPlayers.length} edizioni.</Text>
                        <View style={st.statsGrid}>
                            <StatCard label="Presenze" value={careerStats.played} />
                            <StatCard label="Gol Totali" value={careerStats.goals} />
                            <StatCard label="Assist Totali" value={careerStats.assists} />
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

function StatCard({ label, value, color = '#f8fafc' }: { label: string; value: number; color?: string }) {
    return (
        <View style={st.statCard}>
            <Text style={[st.statValue, { color }]}>{value}</Text>
            <Text style={st.statLabel}>{label}</Text>
        </View>
    );
}

const st = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    empty: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc', flex: 1 },
    content: { padding: 16, paddingBottom: 40 },
    hero: { alignItems: 'center', paddingBottom: 20, marginBottom: 20, borderBottomWidth: 1 },
    avatar: { width: 90, height: 90, borderRadius: 45, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 3 },
    avatarText: { fontSize: 36, fontWeight: 'bold' },
    heroName: { color: '#38bdf8', fontSize: 26, fontWeight: 'bold', marginBottom: 10 },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap', justifyContent: 'center' },
    badge: { paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    badgeText: { color: '#94a3b8', fontSize: 13 },
    teamLink: { color: '#94a3b8', fontSize: 14, marginBottom: 12 },
    priceBox: { alignItems: 'center', marginTop: 4 },
    priceLabel: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
    priceValue: { color: '#fbbf24', fontSize: 36, fontWeight: '900', textShadowColor: 'rgba(251,191,36,0.3)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 },
    sectionTitle: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center', borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 8 },
    careerSub: { color: '#64748b', fontSize: 12, textAlign: 'center', marginBottom: 12 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 20 },
    statCard: { width: '30%', backgroundColor: 'rgba(255,255,255,0.05)', padding: 14, borderRadius: 12, alignItems: 'center' },
    statValue: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
    statLabel: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
});
