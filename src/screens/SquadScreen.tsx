import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import type { FantasyTeam } from '../types';

export default function SquadScreen({ navigation }: any) {
    const currentUser = useStore(state => state.currentUser);
    const leagues = useStore(state => state.leagues);
    const players = useStore(state => state.players);
    const realTeams = useStore(state => state.realTeams);
    const fantasyTeams = useStore(state => state.fantasyTeams);
    const updateFantasyTeam = useStore(state => state.updateFantasyTeam);

    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const myFantasyTeamDoc = fantasyTeams.find(f => f.leagueId === leagueId && f.userId === currentUser?.id);

    const [activeTab, setActiveTab] = useState<'market' | 'roster'>('market');
    const [teamName, setTeamName] = useState(myFantasyTeamDoc?.name || '');

    const defaultQueryPos = league?.settings.useCustomRoles ? 'TUTTI' : 'TUTTI';
    const [filterPos, setFilterPos] = useState<string>(defaultQueryPos);
    const [searchQuery, setSearchQuery] = useState('');

    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isMarketOpen, setIsMarketOpen] = useState<boolean>(true);

    const isVariable = league?.settings.rosterType === 'variable';

    const upcomingFantasyMatch = useStore(state => state.matches)
        .filter(m => m.leagueId === leagueId && m.isFantasyMatchday)
        .sort((a, b) => a.matchday - b.matchday)[0];

    const currentMatchday = upcomingFantasyMatch ? upcomingFantasyMatch.matchday : 1;

    const deadlineString = isVariable
        ? league?.settings.matchdayDeadlines?.[currentMatchday]
        : league?.settings.fantasyMarketDeadline;

    useEffect(() => {
        if (!deadlineString) {
            setTimeLeft('Nessuna Scadenza');
            setIsMarketOpen(true);
            return;
        }
        const deadline = new Date(deadlineString).getTime();
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = deadline - now;
            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft('MERCATO CHIUSO');
                setIsMarketOpen(false);
            } else {
                setIsMarketOpen(true);
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                setTimeLeft(`${days > 0 ? days + 'g ' : ''}${hours}h ${minutes}m`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [deadlineString]);

    const createFantasyTeam = () => {
        if (!league || !currentUser) return;
        if (!teamName.trim()) return Alert.alert('Errore', 'Inserisci il nome della squadra.');

        const newTeam: FantasyTeam = {
            id: uuidv4(),
            userId: currentUser.id,
            leagueId,
            name: teamName,
            budgetRemaining: league.settings.budget,
            players: [],
            manualPointsAdjustment: 0,
            matchdayPoints: {}
        };
        updateFantasyTeam(newTeam);
    };

    const handleBuyPlayer = (playerId: string) => {
        if (!myFantasyTeamDoc || !league) return;
        if (!isMarketOpen) return Alert.alert('Attenzione', 'Mercato chiuso!');

        if (myFantasyTeamDoc.players.length >= league.settings.squadSize) {
            return Alert.alert('Attenzione', 'Hai raggiunto il limite della rosa.');
        }

        const playerToBuy = players.find(p => p.id === playerId);
        const price = playerToBuy?.price || 1;
        if (myFantasyTeamDoc.budgetRemaining < price) {
            return Alert.alert('Errore', 'Budget esaurito!');
        }

        if (league.settings.useCustomRoles && league.settings.customRoles && playerToBuy) {
            const roleLimit = league.settings.customRoles.find(r => r.name === playerToBuy.position)?.maxLimit;
            if (roleLimit) {
                const currentCount = myFantasyTeamDoc.players.filter(pid => players.find(p => p.id === pid)?.position === playerToBuy.position).length;
                if (currentCount >= roleLimit) {
                    return Alert.alert('Attenzione', `Hai raggiunto il limite massimo (${roleLimit}) per la categoria ${playerToBuy.position}!`);
                }
            }
        }

        const updatedTeam = {
            ...myFantasyTeamDoc,
            budgetRemaining: myFantasyTeamDoc.budgetRemaining - price,
            players: [...myFantasyTeamDoc.players, playerId]
        };
        updateFantasyTeam(updatedTeam);
    };

    const handleSellPlayer = (playerId: string) => {
        if (!myFantasyTeamDoc) return;
        if (!isMarketOpen) return Alert.alert('Attenzione', 'Mercato chiuso!');

        const playerToSell = players.find(p => p.id === playerId);
        const price = playerToSell?.price || 1;

        const updatedTeam = {
            ...myFantasyTeamDoc,
            budgetRemaining: myFantasyTeamDoc.budgetRemaining + price,
            players: myFantasyTeamDoc.players.filter(id => id !== playerId)
        };
        updateFantasyTeam(updatedTeam);
    };

    if (!league) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Devi prima navigare in una lega.</Text>
            </View>
        );
    }

    if (!myFantasyTeamDoc) {
        return (
            <View style={styles.centerContainer}>
                <View style={styles.card}>
                    <Text style={styles.title}>Crea Fantasquadra</Text>
                    <Text style={styles.label}>Nome Squadra</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Es. Atletico Ma Non Troppo"
                        placeholderTextColor="#94a3b8"
                        value={teamName}
                        onChangeText={setTeamName}
                    />
                    <Text style={styles.budgetHelp}>Budget inziale: {league.settings.budget} CR</Text>
                    <TouchableOpacity style={styles.primaryBtn} onPress={createFantasyTeam}>
                        <Text style={styles.primaryBtnText}>Inizia</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const availablePlayersThisLeague = players.filter(p => p.leagueId === leagueId && p.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const myPlayersDetails = availablePlayersThisLeague.filter(p => myFantasyTeamDoc.players.includes(p.id));
    const freePlayers = availablePlayersThisLeague.filter(p => !myFantasyTeamDoc.players.includes(p.id) && (filterPos === 'TUTTI' || p.position === filterPos));

    const getPosColor = (pos: string) => {
        if (league.settings.useCustomRoles && league.settings.customRoles) {
            const customRole = league.settings.customRoles.find(r => r.name === pos);
            if (customRole && customRole.color) return customRole.color;
        }
        if (pos.startsWith('P')) return '#fbbf24';
        if (pos.startsWith('D')) return '#4ade80';
        if (pos.startsWith('C')) return '#38bdf8';
        if (pos.startsWith('A')) return '#ef4444';
        return '#94a3b8';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.teamTitle}>{myFantasyTeamDoc.name}</Text>
                    <Text style={styles.subtitle}>{isVariable ? `Mercato Settimanale (G${currentMatchday})` : 'Mercato Permanente'}</Text>
                </View>
                <View style={styles.budgetBadge}>
                    <Text style={styles.budgetValue}>{myFantasyTeamDoc.budgetRemaining} CR</Text>
                </View>
            </View>

            <View style={styles.statusBox}>
                <View style={styles.budgetCol}>
                    <Text style={styles.budgetLabel}>STATO MERCATO</Text>
                    <Text style={[styles.budgetText, { color: isMarketOpen ? '#4ade80' : '#ef4444', fontSize: 16, marginTop: 4 }]}>
                        {isMarketOpen ? 'APERTO' : 'CHIUSO'}
                    </Text>
                </View>
                <View style={styles.budgetCol}>
                    <Text style={styles.budgetLabel}>SCADENZA</Text>
                    <Text style={[styles.budgetText, { fontSize: 14, marginTop: 4 }]}>
                        {timeLeft}
                    </Text>
                </View>
            </View>

            <View style={styles.tabsMenu}>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('market')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'market' && styles.tabBtnTextActive]}>Listone Mercato</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tabBtn, activeTab === 'roster' && styles.tabBtnActive]}
                    onPress={() => setActiveTab('roster')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'roster' && styles.tabBtnTextActive]}>
                        Mia Rosa ({myFantasyTeamDoc.players.length}/{league.settings.squadSize})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'market' && (
                <View style={styles.marketFilters}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Cerca calciatore..."
                        placeholderTextColor="#94a3b8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 10 }}>
                        {['TUTTI', ...(league.settings.useCustomRoles ? (league.settings.customRoles?.map(r => r.name) || []) : ['POR', 'DIF', 'CEN', 'ATT'])].map(pos => (
                            <TouchableOpacity
                                key={pos}
                                style={[styles.filterChip, filterPos === pos && styles.filterChipActive]}
                                onPress={() => setFilterPos(pos)}
                            >
                                <Text style={[styles.filterChipText, filterPos === pos && styles.filterChipTextActive]}>{pos}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {activeTab === 'market' && (
                    <View>
                        {freePlayers.map(p => {
                            const pTeam = realTeams.find(t => t.id === p.realTeamId);
                            return (
                                <View key={p.id} style={styles.playerCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {p.photo ? (
                                            <Image source={{ uri: p.photo }} style={styles.playerPhoto} />
                                        ) : (
                                            <View style={[styles.posBadge, { backgroundColor: 'transparent', borderColor: getPosColor(p.position), borderWidth: 1 }]}>
                                                <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position.substring(0, 3).toUpperCase()}</Text>
                                            </View>
                                        )}
                                        <View>
                                            <Text style={styles.playerName}>{p.name}</Text>
                                            <Text style={styles.playerTeam}>{pTeam?.name || 'Svincolato'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.buyBtn, !isMarketOpen && styles.disabledBtn]}
                                        disabled={!isMarketOpen}
                                        onPress={() => handleBuyPlayer(p.id)}
                                    >
                                        <Text style={styles.buyBtnText}>Compra ({p.price || 1}cr)</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                        {freePlayers.length === 0 && <Text style={styles.emptyText}>Nessun giocatore disponibile in questa categoria.</Text>}
                    </View>
                )}

                {activeTab === 'roster' && (
                    <View>
                        {myPlayersDetails.map(p => {
                            const pTeam = realTeams.find(t => t.id === p.realTeamId);
                            return (
                                <View key={p.id} style={styles.playerCard}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        {p.photo ? (
                                            <Image source={{ uri: p.photo }} style={styles.playerPhoto} />
                                        ) : (
                                            <View style={[styles.posBadge, { backgroundColor: 'transparent', borderColor: getPosColor(p.position), borderWidth: 1 }]}>
                                                <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position.substring(0, 3).toUpperCase()}</Text>
                                            </View>
                                        )}
                                        <View>
                                            <Text style={styles.playerName}>{p.name}</Text>
                                            <Text style={styles.playerTeam}>{pTeam?.name || 'Svincolato'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.sellBtn, !isMarketOpen && styles.disabledBtn]}
                                        disabled={!isMarketOpen}
                                        onPress={() => handleSellPlayer(p.id)}
                                    >
                                        <Text style={styles.sellBtnText}>Vendi</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                        {myPlayersDetails.length === 0 && <Text style={styles.emptyText}>Non hai ancora comprato nessun giocatore.</Text>}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
    label: { color: '#f8fafc', fontWeight: 'bold', marginBottom: 8 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 8 },
    budgetHelp: { color: '#94a3b8', fontSize: 12, marginBottom: 20 },
    primaryBtn: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtnText: { color: '#38bdf8', fontSize: 24, fontWeight: 'bold', marginRight: 15 },
    teamTitle: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    subtitle: { fontSize: 13, color: '#38bdf8', fontWeight: 'bold' },
    budgetBadge: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    budgetValue: { color: '#38bdf8', fontWeight: 'bold' },
    statusBox: { flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    budgetCol: { flex: 1, alignItems: 'center' },
    budgetLabel: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold', marginBottom: 2 },
    budgetText: { color: '#f8fafc', fontSize: 24, fontWeight: 'bold' },
    tabsMenu: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    tabBtn: { flex: 1, paddingVertical: 16, alignItems: 'center' },
    tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#38bdf8' },
    tabBtnText: { color: '#94a3b8', fontWeight: 'bold' },
    tabBtnTextActive: { color: '#38bdf8' },
    marketFilters: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    searchInput: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#f8fafc', padding: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    filterChip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    filterChipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    filterChipText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    filterChipTextActive: { color: '#38bdf8' },
    playerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    playerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    posBadge: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    posText: { fontSize: 10, fontWeight: 'bold' },
    playerName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
    playerTeam: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    buyBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    buyBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 12 },
    sellBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
    sellBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12 },
    disabledBtn: { opacity: 0.4 },
    emptyText: { color: '#64748b', textAlign: 'center', marginTop: 30, fontSize: 16 },
    playerPhoto: { width: 40, height: 40, borderRadius: 20, marginRight: 12, resizeMode: 'cover' },
});
