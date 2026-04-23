import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { Search, ShoppingBag, Users, CreditCard, Clock, Filter, Trash2, Plus, Info, ChevronRight, ShoppingCart } from 'lucide-react-native';
import type { FantasyTeam } from '../types';

export default function SquadScreen({ navigation }: any) {
    const currentUser = useStore(state => state.currentUser);
    const leagues = useStore(state => state.leagues);
    const players = useStore(state => state.players);
    const realTeams = useStore(state => state.realTeams);
    const fantasyTeams = useStore(state => state.fantasyTeams);
    const updateFantasyTeam = useStore(state => state.updateFantasyTeam);

    const leagueIdStore = useStore(state => state.activeLeagueId);
    const league = leagues.find(l => l.id === leagueIdStore) || (leagues.length > 0 ? leagues[0] : null);
    const leagueId = league?.id || '';

    const myFantasyTeamDoc = fantasyTeams.find(f => f.leagueId === leagueId && f.userId === currentUser?.id);
    const showNotification = useStore(state => state.showNotification);

    const [activeTab, setActiveTab] = useState<'market' | 'roster'>('market');
    const [teamName, setTeamName] = useState(myFantasyTeamDoc?.name || '');

    const defaultQueryPos = 'TUTTI';
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
    }, [deadlineString, leagueId]);

    const handleCreateTeam = async () => {
        if (!league || !currentUser) return;
        if (!teamName.trim()) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Inserisci il nome della squadra.'
            });
            return;
        }

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

    const handleBuyPlayer = async (playerId: string) => {
        if (!myFantasyTeamDoc || !league) return;
        if (!isMarketOpen) {
            showNotification({
                type: 'error',
                title: 'Attenzione',
                message: 'Mercato chiuso!'
            });
            return;
        }

        if (myFantasyTeamDoc.players.length >= league.settings.squadSize) {
            showNotification({
                type: 'error',
                title: 'Attenzione',
                message: 'Hai raggiunto il limite della rosa.'
            });
            return;
        }

        const playerToBuy = players.find(p => p.id === playerId);
        const price = playerToBuy?.price || 1;
        if (myFantasyTeamDoc.budgetRemaining < price) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Budget esaurito!'
            });
            return;
        }

        if (league.settings.useCustomRoles && league.settings.customRoles && playerToBuy) {
            const roleLimit = league.settings.customRoles.find(r => r.name === playerToBuy.position)?.maxLimit;
            if (roleLimit) {
                const currentCount = myFantasyTeamDoc.players.filter(pid => players.find(p => p.id === pid)?.position === playerToBuy.position).length;
                if (currentCount >= roleLimit) {
                    showNotification({
                        type: 'error',
                        title: 'Attenzione',
                        message: `Hai raggiunto il limite massimo (${roleLimit}) per la categoria ${playerToBuy.position}!`
                    });
                    return;
                }
            }
        }

        // Rule: Max players from the same real team
        if (league.settings.maxPlayersPerRealTeamEnabled && league.settings.maxPlayersPerRealTeam && playerToBuy) {
            const limit = league.settings.maxPlayersPerRealTeam;
            const playersFromSameTeam = myFantasyTeamDoc.players.filter(pid => {
                const p = players.find(x => x.id === pid);
                return p?.realTeamId === playerToBuy.realTeamId;
            });
            
            if (playersFromSameTeam.length >= limit) {
                const teamName = realTeams.find(t => t.id === playerToBuy.realTeamId)?.name || 'questa squadra';
                showNotification({
                    type: 'error',
                    title: 'Limite Raggiunto',
                    message: `Hai già raggiunto il limite massimo di ${limit} calciatori per la squadra ${teamName}.`
                });
                return;
            }
        }

        const updatedTeam = {
            ...myFantasyTeamDoc,
            budgetRemaining: myFantasyTeamDoc.budgetRemaining - price,
            players: [...myFantasyTeamDoc.players, playerId]
        };

        updateFantasyTeam(updatedTeam).then(() => {
            showNotification({
                type: 'success',
                title: 'Successo',
                message: 'Giocatore acquistato!'
            });
        });
    };

    const handleSellPlayer = async (playerId: string) => {
        if (!myFantasyTeamDoc) return;
        if (!isMarketOpen) {
            showNotification({
                type: 'error',
                title: 'Attenzione',
                message: 'Mercato chiuso!'
            });
            return;
        }

        const playerToSell = players.find(p => p.id === playerId);
        const price = playerToSell?.price || 1;

        const updatedTeam = {
            ...myFantasyTeamDoc,
            budgetRemaining: myFantasyTeamDoc.budgetRemaining + price,
            players: myFantasyTeamDoc.players.filter(id => id !== playerId)
        };

        updateFantasyTeam(updatedTeam).then(() => {
            showNotification({
                type: 'success',
                title: 'Successo',
                message: 'Giocatore venduto!'
            });
        });
    };

    if (!league) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Devi prima navigare in una lega.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!myFantasyTeamDoc) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <KeyboardAvoidingView 
                    style={{ flex: 1 }} 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                >
                    <ScrollView contentContainerStyle={styles.centerContainer} keyboardShouldPersistTaps="handled">
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
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTeam}>
                                <Text style={styles.primaryBtnText}>Inizia</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            </SafeAreaView>
        );
    }

    const availablePlayersThisLeague = players.filter(p => p.leagueId === leagueId && p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const myPlayersDetails = availablePlayersThisLeague.filter(p => myFantasyTeamDoc.players.includes(p.id));
    const freePlayers = availablePlayersThisLeague.filter(p => !myFantasyTeamDoc.players.includes(p.id) && (filterPos === 'TUTTI' || p.position === filterPos));

    const getPosColor = (pos: string) => {
        if (league?.settings?.useCustomRoles && league.settings.customRoles) {
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
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
            >
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>{myFantasyTeamDoc.name}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                            <Info size={12} color="#38bdf8" style={{ marginRight: 6 }} />
                            <Text style={styles.headerSub}>{isVariable ? `Mercato Settimanale (G${currentMatchday})` : 'Mercato Permanente'}</Text>
                        </View>
                    </View>
                    <View style={styles.budgetBadge}>
                        <CreditCard size={14} color="#38bdf8" style={{ marginRight: 8 }} />
                        <Text style={styles.budgetValue}>{myFantasyTeamDoc.budgetRemaining} CR</Text>
                    </View>
                </View>

                <View style={styles.statusBanner}>
                    <View style={styles.statusItem}>
                        <ShoppingCart size={16} color={isMarketOpen ? '#4ade80' : '#ef4444'} style={{ marginRight: 8 }} />
                        <View>
                            <Text style={styles.statusLabel}>STATO</Text>
                            <Text style={[styles.statusValue, { color: isMarketOpen ? '#4ade80' : '#ef4444' }]}>
                                {isMarketOpen ? 'APERTO' : 'CHIUSO'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.statusDivider} />
                    <View style={styles.statusItem}>
                        <Clock size={16} color="#94a3b8" style={{ marginRight: 8 }} />
                        <View>
                            <Text style={styles.statusLabel}>SCADENZA</Text>
                            <Text style={styles.statusValue}>{timeLeft}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.tabsWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
                        <TouchableOpacity
                            style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]}
                            onPress={() => setActiveTab('market')}
                        >
                            <ShoppingBag size={18} color={activeTab === 'market' ? '#38bdf8' : '#94a3b8'} style={{ marginRight: 8 }} />
                            <Text style={[styles.tabText, activeTab === 'market' && styles.tabTextActive]}>Listone Mercato</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={[styles.tabBtn, activeTab === 'roster' && styles.tabBtnActive]}
                            onPress={() => setActiveTab('roster')}
                        >
                            <Users size={18} color={activeTab === 'roster' ? '#fbbf24' : '#94a3b8'} style={{ marginRight: 8 }} />
                            <Text style={[styles.tabText, activeTab === 'roster' && styles.tabTextActive]}>
                                Mia Rosa ({myFantasyTeamDoc.players.length}/{league.settings.squadSize})
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {activeTab === 'market' && (
                    <View style={styles.filterSection}>
                        <View style={styles.searchContainer}>
                            <Search size={18} color="#64748b" style={{ marginRight: 10 }} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Cerca calciatore..."
                                placeholderTextColor="#64748b"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                            <Filter size={16} color="#64748b" style={{ marginRight: 12, marginTop: 10 }} />
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

                <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
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
                                                <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
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
                            {freePlayers.length === 0 && <Text style={styles.emptyText}>Nessun giocatore disponibile.</Text>}
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
                                                <Text style={styles.playerName} numberOfLines={1}>{p.name}</Text>
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
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
    headerSub: { fontSize: 13, color: '#38bdf8', fontWeight: 'bold' },
    budgetBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15 },
    budgetValue: { color: '#38bdf8', fontWeight: 'bold', fontSize: 14 },
    statusBanner: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    statusItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    statusDivider: { width: 1, height: 25, backgroundColor: 'rgba(255,255,255,0.05)', marginHorizontal: 10 },
    statusLabel: { color: '#64748b', fontSize: 10, fontWeight: 'bold' },
    statusValue: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold', marginTop: 1 },
    tabsWrapper: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabsScroll: { paddingHorizontal: 16, paddingVertical: 12 },
    tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginRight: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'transparent' },
    tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    tabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 14 },
    tabTextActive: { color: '#38bdf8' },
    filterSection: { padding: 16, backgroundColor: '#0f172a' },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, paddingHorizontal: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    searchInput: { flex: 1, color: '#f8fafc', paddingVertical: 12, fontSize: 15 },
    filtersScroll: { marginTop: 12, paddingBottom: 5 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.04)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    filterChipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    filterChipText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
    filterChipTextActive: { color: '#38bdf8' },
    playerCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    playerPhoto: { width: 45, height: 45, borderRadius: 22, marginRight: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
    posBadge: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    posText: { fontSize: 11, fontWeight: 'bold' },
    playerName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
    playerTeam: { color: '#64748b', fontSize: 12, marginTop: 2 },
    buyBtn: { backgroundColor: '#38bdf8', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
    buyBtnText: { color: '#000', fontWeight: 'bold', fontSize: 13 },
    sellBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)', borderWidth: 1, paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12 },
    sellBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
    disabledBtn: { opacity: 0.3 },
    emptyText: { color: '#475569', textAlign: 'center', marginTop: 40, fontSize: 15 },
    card: { backgroundColor: 'rgba(255,255,255,0.04)', padding: 25, borderRadius: 25, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20, textAlign: 'center' },
    label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 15, fontSize: 16, marginBottom: 12 },
    budgetHelp: { color: '#64748b', fontSize: 13, marginBottom: 25, textAlign: 'center' },
    primaryBtn: { backgroundColor: '#38bdf8', padding: 18, borderRadius: 15, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});
