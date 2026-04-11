import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useStore } from '../store';

export default function TeamsViewerScreen({ navigation }: any) {
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const realTeams = useStore(s => s.realTeams).filter(t => t.leagueId === leagueId);
    const players = useStore(s => s.players).filter(p => p.leagueId === leagueId);

    if (!league) return <View style={s.center}><Text style={s.empty}>Nessun torneo.</Text></View>;

    return (
        <View style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={s.backBtn}>&lt;</Text>
                </TouchableOpacity>
                <Text style={s.title}>Squadre del Torneo</Text>
            </View>

            <ScrollView contentContainerStyle={s.content}>
                {realTeams.length === 0 && <Text style={s.empty}>Nessuna squadra iscritta al torneo.</Text>}
                <View style={s.grid}>
                    {realTeams.map(t => {
                        const count = players.filter(p => p.realTeamId === t.id).length;
                        return (
                            <TouchableOpacity key={t.id} style={s.card} onPress={() => navigation.navigate('TeamProfile', { teamId: t.id })} activeOpacity={0.7}>
                                <View style={s.avatar}>
                                    <Text style={s.avatarText}>{t.name.charAt(0)}</Text>
                                </View>
                                <Text style={s.teamName} numberOfLines={1}>{t.name}</Text>
                                <Text style={s.teamSub}>{count} giocatori</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    empty: { color: '#94a3b8', fontSize: 15, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    content: { padding: 16, paddingBottom: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    card: { width: '48%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(251,191,36,0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 10, borderWidth: 2, borderColor: '#fbbf24' },
    avatarText: { color: '#fbbf24', fontSize: 24, fontWeight: 'bold' },
    teamName: { color: '#f8fafc', fontSize: 15, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 },
    teamSub: { color: '#94a3b8', fontSize: 12 },
});
