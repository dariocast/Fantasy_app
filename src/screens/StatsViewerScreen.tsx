import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';
import type { Player } from '../types';

export default function StatsViewerScreen({ navigation }: any) {
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const players = useStore(s => s.players).filter(p => p.leagueId === leagueId);
    const realTeams = useStore(s => s.realTeams).filter(t => t.leagueId === leagueId);
    const matches = useStore(s => s.matches).filter(m => m.leagueId === leagueId && m.status === 'finished');
    const fantasyLineups = useStore(s => s.fantasyLineups);

    if (!league) return <View style={st.center}><Text style={st.empty}>Nessun torneo.</Text></View>;

    // Build stats map
    const playersWithStats = useMemo(() => {
        const statsMap = new Map<string, { goal: number; assist: number; yellow: number; red: number; fantasyPts: number }>();
        players.forEach(p => statsMap.set(p.id, { goal: 0, assist: 0, yellow: 0, red: 0, fantasyPts: 0 }));

        matches.forEach(m => {
            (m.events || []).forEach(ev => {
                const s = statsMap.get(ev.playerId);
                if (!s) return;
                if (ev.type === 'goal') s.goal++;
                if (ev.type === 'assist') s.assist++;
                if (ev.type === 'yellow_card') s.yellow++;
                if (ev.type === 'red_card') s.red++;
            });
        });

        if (league.settings.hasFantasy) {
            fantasyLineups.forEach(fl => {
                const ft = useStore.getState().fantasyTeams.find(f => f.id === fl.fantasyTeamId);
                if (ft && ft.leagueId === leagueId && fl.playerPoints) {
                    Object.entries(fl.playerPoints).forEach(([pid, pts]) => {
                        const s = statsMap.get(pid);
                        if (s) s.fantasyPts += pts;
                    });
                }
            });
        }

        return players.map(p => ({ ...p, ...statsMap.get(p.id)! }));
    }, [players, matches, fantasyLineups, leagueId]);

    const topScorers = [...playersWithStats].sort((a, b) => b.goal - a.goal).filter(p => p.goal > 0).slice(0, 10);
    const topAssists = [...playersWithStats].sort((a, b) => b.assist - a.assist).filter(p => p.assist > 0).slice(0, 10);
    const topCards = [...playersWithStats].sort((a, b) => (b.red * 2 + b.yellow) - (a.red * 2 + a.yellow)).filter(p => p.yellow > 0 || p.red > 0).slice(0, 10);
    const topFantasy = [...playersWithStats].sort((a, b) => b.fantasyPts - a.fantasyPts).filter(p => p.fantasyPts !== 0).slice(0, 10);

    type StatPlayer = Player & { goal: number; assist: number; yellow: number; red: number; fantasyPts: number };

    const renderRow = (p: StatPlayer, idx: number, valLabel: string, val: number | string) => (
        <TouchableOpacity key={p.id} style={st.row} onPress={() => navigation.navigate('PlayerProfile', { playerId: p.id })}>
            <Text style={[st.rank, idx === 0 && { color: '#fbbf24' }]}>{idx + 1}</Text>
            <View style={{ flex: 1 }}>
                <Text style={st.name}>{p.name}</Text>
                <Text style={st.sub}>{realTeams.find(t => t.id === p.realTeamId)?.name || '?'}</Text>
            </View>
            <View style={st.valBox}>
                <Text style={st.val}>{val}</Text>
                <Text style={st.valLabel}>{valLabel}</Text>
            </View>
        </TouchableOpacity>
    );

    const renderCardRow = (p: StatPlayer, idx: number) => (
        <TouchableOpacity key={p.id} style={st.row} onPress={() => navigation.navigate('PlayerProfile', { playerId: p.id })}>
            <Text style={[st.rank, idx === 0 && { color: '#fbbf24' }]}>{idx + 1}</Text>
            <View style={{ flex: 1 }}>
                <Text style={st.name}>{p.name}</Text>
                <Text style={st.sub}>{realTeams.find(t => t.id === p.realTeamId)?.name || '?'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
                {p.yellow > 0 && <Text style={{ color: '#FFEB3B', fontWeight: 'bold' }}>{p.yellow} 🟨</Text>}
                {p.red > 0 && <Text style={{ color: '#F44336', fontWeight: 'bold' }}>{p.red} 🟥</Text>}
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={st.container}>
            <View style={st.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={st.backBtn}>&lt;</Text>
                </TouchableOpacity>
                <Text style={st.title}>Statistiche Torneo</Text>
            </View>

            <ScrollView contentContainerStyle={st.content}>
                {/* Top Scorers */}
                <View style={st.card}>
                    <Text style={st.cardTitle}>⚽ Top Marcatori</Text>
                    {topScorers.length === 0 && <Text style={st.empty}>Nessun gol registrato.</Text>}
                    {topScorers.map((p, i) => renderRow(p, i, 'Gol', p.goal))}
                </View>

                {/* Top Assists */}
                <View style={st.card}>
                    <Text style={st.cardTitle}>👟 Top Assistman</Text>
                    {topAssists.length === 0 && <Text style={st.empty}>Nessun assist registrato.</Text>}
                    {topAssists.map((p, i) => renderRow(p, i, 'Assist', p.assist))}
                </View>

                {/* Cards */}
                <View style={st.card}>
                    <Text style={st.cardTitle}>🟨 Cartellini</Text>
                    {topCards.length === 0 && <Text style={st.empty}>Nessun cartellino registrato.</Text>}
                    {topCards.map((p, i) => renderCardRow(p, i))}
                </View>

                {/* Fantasy */}
                {league.settings.hasFantasy && (
                    <View style={st.card}>
                        <Text style={[st.cardTitle, { color: '#fbbf24' }]}>🏆 Top Player Fantasy</Text>
                        {topFantasy.length === 0 && <Text style={st.empty}>Nessun punteggio fantasy calcolato.</Text>}
                        {topFantasy.map((p, i) => renderRow(p, i, 'pt', p.fantasyPts.toFixed(1)))}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const st = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    empty: { color: '#64748b', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 10 },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8' },
    content: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { color: '#38bdf8', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    rank: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14, width: 28 },
    name: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
    sub: { color: '#64748b', fontSize: 11 },
    valBox: { alignItems: 'flex-end' },
    val: { color: '#f8fafc', fontWeight: '900', fontSize: 16 },
    valLabel: { color: '#64748b', fontSize: 10 },
});
