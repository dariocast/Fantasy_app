import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Shield, ChevronRight, Info } from 'lucide-react-native';

export default function TeamsViewerScreen({ navigation }: any) {
    const leagues = useStore(s => s.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const realTeams = useStore(s => s.realTeams).filter(t => t.leagueId === leagueId);
    const players = useStore(s => s.players).filter(p => p.leagueId === leagueId);

    if (!league) return (
        <SafeAreaView style={s.container} edges={['bottom', 'left', 'right']}>
            <View style={s.center}><Text style={s.empty}>Nessun torneo.</Text></View>
        </SafeAreaView>
    );

    return (
        <SafeAreaView style={s.container} edges={['bottom', 'left', 'right']}>
            <View style={s.header}>
                <Text style={s.headerTitle}>Squadre</Text>
            </View>
            <ScrollView contentContainerStyle={s.content}>
                {realTeams.length === 0 && (
                    <View style={s.emptyContainer}>
                        <Info size={40} color="rgba(255,255,255,0.05)" />
                        <Text style={s.empty}>Nessuna squadra iscritta a questo torneo.</Text>
                    </View>
                )}
                <View style={s.grid}>
                    {realTeams.map(t => {
                        const count = players.filter(p => p.realTeamId === t.id).length;
                        return (
                            <TouchableOpacity key={t.id} style={s.card} onPress={() => navigation.navigate('TeamProfile', { teamId: t.id })} activeOpacity={0.7}>
                                {t.logo ? (
                                    <Image source={{ uri: t.logo }} style={s.logoImg} />
                                ) : (
                                    <View style={s.avatar}>
                                        <Text style={s.avatarText}>{t.name.charAt(0)}</Text>
                                    </View>
                                )}
                                <Text style={s.teamName} numberOfLines={1}>{t.name}</Text>
                                <Text style={s.teamSub}>{count} giocatori</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    center: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    empty: { color: '#475569', fontSize: 15, textAlign: 'center', marginTop: 20, paddingHorizontal: 40 },
    content: { padding: 16, paddingBottom: 40 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
    card: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 25, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    avatar: { width: 64, height: 64, borderRadius: 20, backgroundColor: 'rgba(251,191,36,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.2)' },
    avatarText: { color: '#fbbf24', fontSize: 24, fontWeight: '900' },
    logoImg: { width: 70, height: 70, borderRadius: 20, marginBottom: 12, resizeMode: 'contain', backgroundColor: 'rgba(255,255,255,0.02)' },
    teamName: { color: '#f8fafc', fontSize: 16, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
    teamSub: { color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
});
