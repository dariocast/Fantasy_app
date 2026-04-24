import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { User, Shield, Star, Award, TrendingUp, Info, ChevronLeft } from 'lucide-react-native';

export default function PlayerProfileScreen({ route, navigation }: any) {
    const { playerId } = route.params;
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const allPlayers = useStore(s => s.players);
    const matches = useStore(s => s.matches);
    const realTeams = useStore(s => s.realTeams);

    const player = allPlayers.find(p => p.id === playerId);    const team = player ? realTeams.find(t => t.id === player.realTeamId) : null;
    const careerPlayers = player?.careerId ? allPlayers.filter(p => p.careerId === player.careerId) : (player ? [player] : []);
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

    const currentStats = useMemo(() => player ? calcStats([player], currentMatches) : calcStats([], []), [player, currentMatches]);
    const careerStats = useMemo(() => calcStats(careerPlayers, matches.filter(m => m.status === 'finished')), [careerPlayers, matches]);

    if (!player || !league) return (
        <SafeAreaView style={st.container} edges={['bottom', 'left', 'right']}>
            <View style={st.center}><Text style={st.empty}>Giocatore non trovato.</Text></View>
        </SafeAreaView>
    );

    const catColors: Record<string, string> = { POR: '#FF9800', DIF: '#2196F3', CEN: '#4CAF50', ATT: '#F44336' };
    const posColor = league.settings.customRoles?.find(r => r.name === player.position)?.color || catColors[player.position] || '#94a3b8';

    return (
        <SafeAreaView style={st.container} edges={['bottom', 'left', 'right']}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
                    <ChevronLeft color="#f8fafc" size={24} />
                </TouchableOpacity>
                <Text style={st.headerTitle}>Profilo Giocatore</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={st.content} showsVerticalScrollIndicator={false}>
                <View style={st.hero}>
                    <View style={st.avatarContainer}>
                        {player.photo ? (
                            <Image source={{ uri: player.photo }} style={[st.avatar, { borderColor: posColor }]} />
                        ) : (
                            <View style={[st.avatar, { borderColor: posColor, backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                                <User color={posColor} size={40} />
                            </View>
                        )}
                        <View style={[st.posBadge, { backgroundColor: posColor }]}>
                            <Text style={st.posBadgeText}>{player.position}</Text>
                        </View>
                    </View>

                    <Text style={st.heroName}>{player.name}</Text>
                    
                    {team && (
                        <TouchableOpacity style={st.teamContainer} onPress={() => navigation.navigate('TeamProfile', { teamId: team.id })}>
                            <Shield size={14} color="#64748b" style={{ marginRight: 6 }} />
                            <Text style={st.teamLink}>{team.name}</Text>
                        </TouchableOpacity>
                    )}

                    <View style={st.badgeRow}>
                        <View style={st.infoBadge}>
                            <Text style={st.infoBadgeLabel}>ETÀ</Text>
                            <Text style={st.infoBadgeValue}>{player.age}</Text>
                        </View>
                        <View style={st.infoBadge}>
                            <Text style={st.infoBadgeLabel}>RUOLO</Text>
                            <Text style={st.infoBadgeValue}>{player.realPosition || '?'}</Text>
                        </View>
                        {league.settings.hasFantasy && (
                            <View style={st.infoBadge}>
                                <Text style={st.infoBadgeLabel}>QUOT.</Text>
                                <Text style={st.infoBadgeValue}>€{player.price || 1}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <Text style={st.sectionTitle}>Statistiche Torneo Corrente</Text>
                <View style={st.statsGrid}>
                    <StatCard label="Presenze" value={currentStats.played} />
                    <StatCard label="Gol" value={currentStats.goals} />
                    <StatCard label="Assist" value={currentStats.assists} />
                    <StatCard label="Amm." value={currentStats.yellows} color="#FFEB3B" />
                    <StatCard label="Esp." value={currentStats.reds} color="#F44336" />
                    <StatCard label="MVP" value={currentStats.mvp} color="#fbbf24" />
                </View>

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
        </SafeAreaView>
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
    headerTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    empty: { color: '#475569', fontSize: 16 },
    content: { padding: 16, paddingBottom: 60 },
    hero: { alignItems: 'center', marginBottom: 40, marginTop: 10 },
    avatarContainer: { position: 'relative', marginBottom: 20 },
    avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, backgroundColor: 'rgba(255,255,255,0.02)' },
    posBadge: { position: 'absolute', bottom: 0, right: 0, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 3, borderColor: '#0f172a' },
    posBadgeText: { color: '#fff', fontSize: 12, fontWeight: '900' },
    heroName: { color: '#f8fafc', fontSize: 32, fontWeight: '900', letterSpacing: -1, marginBottom: 5 },
    teamContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 25, backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    teamLink: { color: '#64748b', fontSize: 14, fontWeight: 'bold' },
    badgeRow: { flexDirection: 'row', gap: 10 },
    infoBadge: { backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, alignItems: 'center', minWidth: 80, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    infoBadgeLabel: { color: '#475569', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    infoBadgeValue: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    sectionTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '900', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    careerSub: { color: '#475569', fontSize: 12, marginBottom: 15, marginLeft: 4, fontWeight: 'bold' },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginBottom: 35 },
    statCard: { width: '31%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    statValue: { fontSize: 24, fontWeight: '900', marginBottom: 4 },
    statLabel: { color: '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
});
