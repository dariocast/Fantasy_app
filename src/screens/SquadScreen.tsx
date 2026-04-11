import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import type { FantasyTeam } from '../types';

export default function SquadScreen({ navigation }: any) {
    const currentUser = useStore(state => state.currentUser);
    const leagues = useStore(state => state.leagues);
    const players = useStore(state => state.players);
    const realTeams = useStore(state => state.realTeams);
    const fantasyTeams = useStore(state => state.fantasyTeams);

    // In a real app with proper route params we'd get leagueId from route.
    // Here we adapt by picking the active league from the store (similar to other screens)
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const myFantasyTeamDoc = fantasyTeams.find(f => f.leagueId === leagueId && f.userId === currentUser?.id);

    // Tab state: 'market' | 'roster'
    const [activeTab, setActiveTab] = useState<'market' | 'roster'>('market');
    const [teamName, setTeamName] = useState(myFantasyTeamDoc?.name || '');
    
    // Filter state
    const defaultQueryPos = league?.settings.useCustomRoles ? 'TUTTI' : 'TUTTI';
    const [filterPos, setFilterPos] = useState<string>(defaultQueryPos);

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
            manualPointsAdjustment: 0
        };
        useStore.setState(state => ({ fantasyTeams: [...state.fantasyTeams, newTeam] }));
    };

    const handleBuyPlayer = (playerId: string) => {
        if (!myFantasyTeamDoc || !league) return;
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

        useStore.setState(state => ({
            fantasyTeams: state.fantasyTeams.map(f => {
                if (f.id === myFantasyTeamDoc.id) {
                    return { ...f, budgetRemaining: f.budgetRemaining - price, players: [...f.players, playerId] };
                }
                return f;
            })
        }));
    };

    const handleSellPlayer = (playerId: string) => {
        if (!myFantasyTeamDoc) return;
        const playerToSell = players.find(p => p.id === playerId);
        const price = playerToSell?.price || 1; 

        useStore.setState(state => ({
            fantasyTeams: state.fantasyTeams.map(f => {
                if (f.id === myFantasyTeamDoc.id) {
                    return { ...f, budgetRemaining: f.budgetRemaining + price, players: f.players.filter(id => id !== playerId) };
                }
                return f;
            })
        }));
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

    const availablePlayersThisLeague = players.filter(p => p.leagueId === leagueId);
    const myPlayersDetails = availablePlayersThisLeague.filter(p => myFantasyTeamDoc.players.includes(p.id));
    const freePlayers = availablePlayersThisLeague.filter(p => !myFantasyTeamDoc.players.includes(p.id) && (filterPos === 'TUTTI' || p.position === filterPos));

    const getPosColor = (pos: string) => {
        if (league.settings.useCustomRoles && league.settings.customRoles) {
            const customRole = league.settings.customRoles.find(r => r.name === pos);
            if (customRole && customRole.color) return customRole.color;
        }
        if (pos === 'POR') return '#ffa500';
        if (pos === 'DIF') return '#00e600';
        if (pos === 'CEN') return '#6666ff';
        if (pos === 'ATT') return '#ff4d4d';
        return '#94a3b8';
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.teamTitle}>{myFantasyTeamDoc.name}</Text>
                <View style={styles.budgetBadge}>
                    <Text style={styles.budgetValue}>{myFantasyTeamDoc.budgetRemaining} CR</Text>
                </View>
            </View>

            <View style={styles.tabsMenu}>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'market' && styles.tabBtnActive]} 
                    onPress={() => setActiveTab('market')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'market' && styles.tabBtnTextActive]}>Mercato</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'roster' && styles.tabBtnActive]} 
                    onPress={() => setActiveTab('roster')}
                >
                    <Text style={[styles.tabBtnText, activeTab === 'roster' && styles.tabBtnTextActive]}>
                        Rosa ({myFantasyTeamDoc.players.length}/{league.settings.squadSize})
                    </Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'market' && (
                <View style={styles.marketFilters}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {['TUTTI', ...(league.settings.useCustomRoles ? (league.settings.customRoles?.map(r=>r.name) || []) : ['POR', 'DIF', 'CEN', 'ATT'])].map(pos => (
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
                                    <View style={styles.playerInfo}>
                                        <View style={[styles.posBadge, { backgroundColor: 'transparent', borderColor: getPosColor(p.position), borderWidth: 1 }]}>
                                            <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position.substring(0, 3).toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.playerName}>{p.name}</Text>
                                            <Text style={styles.playerTeam}>{pTeam?.name || 'Svincolato'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.buyBtn} onPress={() => handleBuyPlayer(p.id)}>
                                        <Text style={styles.buyBtnText}>Compra ({p.price || 1})</Text>
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
                                    <View style={styles.playerInfo}>
                                        <View style={[styles.posBadge, { backgroundColor: 'transparent', borderColor: getPosColor(p.position), borderWidth: 1 }]}>
                                            <Text style={[styles.posText, { color: getPosColor(p.position) }]}>{p.position.substring(0, 3).toUpperCase()}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.playerName}>{p.name}</Text>
                                            <Text style={styles.playerTeam}>{pTeam?.name || 'Svincolato'}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity style={styles.sellBtn} onPress={() => handleSellPlayer(p.id)}>
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
    centerContainer: {
        flex: 1,
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
    },
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    card: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 20,
    },
    label: {
        color: '#f8fafc',
        fontWeight: 'bold',
        marginBottom: 8,
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: '#f8fafc',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 14,
        fontSize: 16,
        marginBottom: 8,
    },
    budgetHelp: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 20,
    },
    emptyText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 20,
    },
    primaryBtn: {
        backgroundColor: '#0ea5e9',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    primaryBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    teamTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#38bdf8',
    },
    budgetBadge: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderColor: '#38bdf8',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    budgetValue: {
        color: '#38bdf8',
        fontWeight: 'bold',
    },
    tabsMenu: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
    },
    tabBtnActive: {
        borderBottomWidth: 2,
        borderBottomColor: '#38bdf8',
    },
    tabBtnText: {
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    tabBtnTextActive: {
        color: '#38bdf8',
    },
    marketFilters: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#1e293b',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginRight: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterChipActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderColor: '#38bdf8',
    },
    filterChipText: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
    },
    filterChipTextActive: {
        color: '#38bdf8',
    },
    playerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    playerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    posBadge: {
        width: 36,
        height: 36,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    posText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    playerName: {
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: 16,
    },
    playerTeam: {
        color: '#94a3b8',
        fontSize: 12,
        marginTop: 2,
    },
    buyBtn: {
        backgroundColor: '#22c55e',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    buyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },
    sellBtn: {
        backgroundColor: 'transparent',
        borderColor: '#ef4444',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    sellBtnText: {
        color: '#ef4444',
        fontWeight: 'bold',
        fontSize: 12,
    }
});
