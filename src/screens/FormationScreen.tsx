import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useStore } from '../store';
import type { FantasyLineup } from '../types';
import { v4 as uuidv4 } from 'uuid';

export default function FormationScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const currentUser = useStore(state => state.currentUser);
    const players = useStore(state => state.players);
    const fantasyTeams = useStore(state => state.fantasyTeams);
    const updateFantasyLineup = useStore(state => state.updateFantasyLineup);
    const fantasyLineups = useStore(state => state.fantasyLineups);

    const myFantasyTeamDoc = fantasyTeams.find(f => f.leagueId === leagueId && f.userId === currentUser?.id);

    // Provide default fallback values if the store has no fantasy team setup yet
    const myPlayers = myFantasyTeamDoc ? players.filter(p => myFantasyTeamDoc.players.includes(p.id)) : [];

    const [starters, setStarters] = useState<(string | null)[]>(Array(league?.settings.startersCount || 11).fill(null));
    const [bench, setBench] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

    const availablePlayersForField = myPlayers.filter(p => !starters.includes(p.id) && !bench.includes(p.id));

    const handleSelectStarter = (playerId: string) => {
        if (selectedSlot !== null) {
            const newStarters = [...starters];
            newStarters[selectedSlot] = playerId;
            setStarters(newStarters);
            setSelectedSlot(null);
        }
    };

    const handleRemoveStarter = (index: number) => {
        const newStarters = [...starters];
        newStarters[index] = null;
        setStarters(newStarters);
        setSelectedSlot(index);
    };

    const handleAddBench = (playerId: string) => {
        if (bench.length >= (league?.settings.benchCount || 7)) return Alert.alert('Errore', 'Panchina piena!');
        setBench([...bench, playerId]);
    };

    const handleRemoveBench = (playerId: string) => {
        setBench(bench.filter(id => id !== playerId));
    };

    const upcomingFantasyMatch = useStore(state => state.matches)
        .filter(m => m.leagueId === leagueId && m.isFantasyMatchday)
        .sort((a, b) => a.matchday - b.matchday)[0];

    const currentMatchday = upcomingFantasyMatch ? upcomingFantasyMatch.matchday : 1;
    const deadlineString = league?.settings.matchdayDeadlines?.[currentMatchday];

    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isLocked, setIsLocked] = useState<boolean>(false);

    useEffect(() => {
        if (!deadlineString) {
            setTimeLeft('Nessuna Scadenza');
            setIsLocked(false);
            return;
        }

        const deadline = new Date(deadlineString).getTime();

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = deadline - now;

            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft('SCADUTO - Bloccate');
                setIsLocked(true);
            } else {
                setIsLocked(false);
                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setTimeLeft(`${days > 0 ? days + 'g ' : ''}${hours}h ${minutes}m ${seconds}s`);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [deadlineString]);

    const saveFormation = () => {
        if (isLocked) return Alert.alert("Errore", "Tempo Scaduto! Non puoi più schierare formazioni per questa giornata.");
        if (!myFantasyTeamDoc) return Alert.alert("Errore", "Nessuna fantasquadra trovata.");

        const newLineup: FantasyLineup = {
            id: uuidv4(),
            fantasyTeamId: myFantasyTeamDoc.id,
            matchday: currentMatchday,
            starters: starters.reduce((acc, pId, idx) => ({ ...acc, [idx.toString()]: pId || '' }), {}),
            bench,
            points: 0,
            playerPoints: {}
        };

        updateFantasyLineup(newLineup);
        Alert.alert("Successo", "Formazione salvata con successo!");
    };

    if (!league || !myFantasyTeamDoc) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Devi prima iscriverti e creare una Fantasquadra.</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Schiera Formazione - G{currentMatchday}</Text>
                <View style={[styles.timerBadge, isLocked && styles.timerBadgeLocked]}>
                    <Text style={styles.timerLabel}>Scadenza:</Text>
                    <Text style={[styles.timerValue, isLocked && styles.textError]}>{timeLeft}</Text>
                </View>
            </View>

            <View style={styles.fieldContainer}>
                <View style={styles.field}>
                    <View style={styles.centerCircle} />
                    <View style={styles.centerLine} />

                    <View style={styles.fieldGrid}>
                        {starters.map((playerId, idx) => {
                            const p = players.find(x => x.id === playerId);
                            const isSelected = selectedSlot === idx;

                            const getPosColor = (pos: string) => {
                                if (pos === 'POR') return '#f97316'; // orange-500
                                if (pos === 'DIF') return '#22c55e'; // green-500
                                if (pos === 'CEN') return '#3b82f6'; // blue-500
                                if (pos === 'ATT') return '#ef4444'; // red-500
                                return '#64748b'; // slate-500
                            };

                            return (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        styles.playerSlot,
                                        playerId ? { backgroundColor: getPosColor(p?.position || '') } : null,
                                        isSelected && styles.slotSelected
                                    ]}
                                    onPress={() => {
                                        if (isLocked) return;
                                        if (playerId) handleRemoveStarter(idx);
                                        else setSelectedSlot(idx);
                                    }}
                                >
                                    <View style={styles.slotOverlay}>
                                        <Text style={styles.slotName} numberOfLines={1}>
                                            {p ? p.name : '+'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>

            {selectedSlot !== null && (
                <View style={styles.selectionPanel}>
                    <Text style={styles.panelTitle}>Scegli un giocatore dal campo</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        {availablePlayersForField.map(p => (
                            <TouchableOpacity key={p.id} style={styles.availablePlayerCard} onPress={() => handleSelectStarter(p.id)}>
                                <Text style={styles.apPos}>{p.position}</Text>
                                <Text style={styles.apName}>{p.name}</Text>
                            </TouchableOpacity>
                        ))}
                        {availablePlayersForField.length === 0 && (
                            <Text style={styles.emptyText}>Nessun giocatore disponibile.</Text>
                        )}
                    </ScrollView>
                </View>
            )}

            <View style={styles.benchContainer}>
                <Text style={styles.benchTitle}>Panchina ({bench.length}/{league.settings.benchCount || 7})</Text>

                <View style={styles.benchList}>
                    {bench.map((playerId, index) => {
                        const p = players.find(x => x.id === playerId);
                        return (
                            <View key={index} style={styles.benchItem}>
                                <Text style={styles.benchItemText}>{index + 1}. {p?.position} | {p?.name}</Text>
                                {!isLocked && (
                                    <TouchableOpacity onPress={() => handleRemoveBench(playerId)} style={styles.removeBtn}>
                                        <Text style={styles.removeBtnText}>X</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        );
                    })}
                </View>

                {bench.length < (league.settings.benchCount || 7) && !isLocked && (
                    <View style={styles.addBenchSection}>
                        <Text style={styles.addBenchTitle}>Aggiungi in panchina</Text>
                        {availablePlayersForField.map(p => (
                            <TouchableOpacity key={`bench-${p.id}`} style={styles.benchAddableItem} onPress={() => handleAddBench(p.id)}>
                                <Text style={styles.benchItemText}>{p.position} | {p.name}</Text>
                                <Text style={styles.addBtnText}>+</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </View>

            {!isLocked ? (
                <TouchableOpacity style={styles.saveBtn} onPress={saveFormation}>
                    <Text style={styles.saveBtnText}>Conferma Formazione</Text>
                </TouchableOpacity>
            ) : (
                <View style={styles.lockedAlert}>
                    <Text style={styles.lockedText}>Mercato e Formazioni Bloccati.</Text>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
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
    emptyText: {
        color: '#94a3b8',
        fontSize: 16,
        textAlign: 'center'
    },
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#38bdf8',
        marginBottom: 8,
    },
    timerBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: '#38bdf8',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    timerBadgeLocked: {
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    timerLabel: {
        color: '#94a3b8',
        marginRight: 8,
    },
    timerValue: {
        color: '#38bdf8',
        fontWeight: 'bold',
        fontSize: 16,
        fontFamily: 'Courier',
    },
    textError: {
        color: '#ef4444',
    },
    fieldContainer: {
        marginBottom: 24,
    },
    field: {
        height: 400,
        backgroundColor: '#166534', // green-800
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
    },
    centerCircle: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: 100,
        height: 100,
        marginLeft: -50,
        marginTop: -50,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    centerLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        width: '100%',
        height: 2,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    fieldGrid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around',
        alignContent: 'space-around',
        paddingVertical: 20,
    },
    playerSlot: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        margin: 5,
        overflow: 'hidden'
    },
    slotSelected: {
        borderColor: '#fbbf24', // gold
        borderWidth: 3,
    },
    slotOverlay: {
        backgroundColor: 'rgba(0,0,0,0.5)',
        width: '100%',
        position: 'absolute',
        bottom: 0,
        paddingVertical: 2,
        alignItems: 'center',
    },
    slotName: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    selectionPanel: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
        borderColor: '#fbbf24',
        borderWidth: 1,
        marginBottom: 24,
    },
    panelTitle: {
        color: '#fbbf24',
        fontWeight: 'bold',
        marginBottom: 12,
    },
    availablePlayerCard: {
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginRight: 10,
        minWidth: 120,
    },
    apPos: {
        color: '#94a3b8',
        fontSize: 12,
    },
    apName: {
        color: '#f8fafc',
        fontWeight: 'bold',
        marginTop: 4,
    },
    benchContainer: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    benchTitle: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    benchList: {
        marginBottom: 16,
    },
    benchItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#1e293b',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    benchItemText: {
        color: '#f8fafc',
    },
    removeBtn: {
        paddingHorizontal: 8,
    },
    removeBtnText: {
        color: '#ef4444',
        fontWeight: 'bold',
    },
    addBenchSection: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
        paddingTop: 12,
    },
    addBenchTitle: {
        color: '#94a3b8',
        marginBottom: 8,
    },
    benchAddableItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    addBtnText: {
        color: '#22c55e',
        fontWeight: 'bold',
    },
    saveBtn: {
        backgroundColor: '#0ea5e9',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    lockedAlert: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ef4444',
        alignItems: 'center',
    },
    lockedText: {
        color: '#ef4444',
        fontWeight: 'bold',
    }
});
