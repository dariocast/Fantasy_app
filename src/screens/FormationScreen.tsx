import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Image, DimensionValue } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import type { FantasyLineup, Player } from '../types';
import { v4 as uuidv4 } from 'uuid';

const FIELD_HEIGHT = 450;

export default function FormationScreen({ navigation, route }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const currentUser = useStore(state => state.currentUser);
    const players = useStore(state => state.players);
    const fantasyTeams = useStore(state => state.fantasyTeams);
    const updateFantasyLineup = useStore(state => state.updateFantasyLineup);
    const fantasyLineups = useStore(state => state.fantasyLineups);
    const showNotification = useStore(state => state.showNotification);

    // ADMIN MODE: if route params include a fantasyTeamId, we are editing as admin
    const adminEditTeamId = route.params?.fantasyTeamId;
    const isFixed = league?.settings.rosterType === 'fixed';

    const targetTeamDoc = adminEditTeamId
        ? fantasyTeams.find(f => f.id === adminEditTeamId)
        : fantasyTeams.find(f => f.leagueId === leagueId && f.userId === currentUser?.id);

    const isViewingOwnLineup = !adminEditTeamId;
    const teamPlayers = targetTeamDoc ? players.filter(p => targetTeamDoc.players.includes(p.id)) : [];

    const startersCount = league?.settings.startersCount || 11;
    const [starters, setStarters] = useState<(string | null)[]>(Array(startersCount).fill(null));
    const [bench, setBench] = useState<string[]>([]);
    const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
    const [existingLineup, setExistingLineup] = useState<FantasyLineup | null>(null);
    const [detailPlayer, setDetailPlayer] = useState<Player | null>(null);

    const availablePlayersForField = teamPlayers.filter(p => !starters.includes(p.id) && !bench.includes(p.id));

    const upcomingFantasyMatch = useStore(state => state.matches)
        .filter(m => m.leagueId === leagueId && m.isFantasyMatchday)
        .sort((a, b) => a.matchday - b.matchday)[0];

    const currentMatchday = isFixed ? 1 : (upcomingFantasyMatch ? upcomingFantasyMatch.matchday : 1);
    const [viewingMatchday, setViewingMatchday] = useState<number>(currentMatchday);

    // Update viewingMatchday if currentMatchday changes (e.g. initial load)
    useEffect(() => {
        setViewingMatchday(currentMatchday);
    }, [currentMatchday]);

    const deadlineString = isFixed
        ? league?.settings.fantasyMarketDeadline
        : league?.settings.matchdayDeadlines?.[viewingMatchday];

    const availableMatchdays = useMemo(() => {
        const deads = league?.settings.matchdayDeadlines || {};
        const days = Object.keys(deads).map(Number);
        if (days.length === 0) return [1, 2, 3, 4, 5]; // Fallback
        return days.sort((a, b) => a - b);
    }, [league?.settings.matchdayDeadlines]);

    // LOAD EXISTING LINEUP
    useEffect(() => {
        if (targetTeamDoc) {
            const found = fantasyLineups.find(l => l.fantasyTeamId === targetTeamDoc.id && l.matchday === viewingMatchday);
            setExistingLineup(found || null);
            if (found) {
                const newStarters = Array(startersCount).fill(null);
                Object.entries(found.starters).forEach(([idx, pId]) => {
                    const index = parseInt(idx);
                    if (index < startersCount) newStarters[index] = pId || null;
                });
                setStarters(newStarters);
                setBench(found.bench || []);
            } else {
                setStarters(Array(startersCount).fill(null));
                setBench([]);
            }
        }
    }, [targetTeamDoc, viewingMatchday, fantasyLineups, startersCount]);

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
        if (bench.length >= (league?.settings.benchCount || 7)) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Panchina piena!'
            });
            return;
        }
        setBench([...bench, playerId]);
    };

    const handleRemoveBench = (playerId: string) => {
        setBench(bench.filter(id => id !== playerId));
    };

    const [timeLeft, setTimeLeft] = useState<string>('');
    const [isLocked, setIsLocked] = useState<boolean>(false);

    useEffect(() => {
        if (!deadlineString) {
            setTimeLeft(isFixed ? 'Nessuna Scadenza Mercato' : 'Nessuna Scadenza');
            setIsLocked(false);
            return;
        }
        const deadline = new Date(deadlineString).getTime();
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = deadline - now;
            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft(isFixed ? 'MERCATO CHIUSO' : 'SCADUTO - Bloccate');
                setIsLocked(!adminEditTeamId); // Admins can always edit
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
    }, [deadlineString, adminEditTeamId]);

    const saveFormation = () => {
        if (isLocked && !adminEditTeamId) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Tempo Scaduto! Non puoi più schierare formazioni.'
            });
            return;
        }
        if (!targetTeamDoc) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Nessuna fantasquadra trovata.'
            });
            return;
        }

        const existingLineup = fantasyLineups.find(l => l.fantasyTeamId === targetTeamDoc.id && l.matchday === currentMatchday);

        const newLineup: FantasyLineup = {
            id: existingLineup ? existingLineup.id : uuidv4(),
            fantasyTeamId: targetTeamDoc.id,
            matchday: viewingMatchday,
            starters: starters.reduce((acc, pId, idx) => ({ ...acc, [idx.toString()]: pId || '' }), {}),
            bench,
            points: existingLineup ? existingLineup.points : 0,
            playerPoints: existingLineup ? existingLineup.playerPoints : {}
        };

        updateFantasyLineup(newLineup);
        // L'avviso di successo viene ora gestito centralmente dal fantasySlice tramite showSuccess
        if (adminEditTeamId) navigation.goBack();
    };

    const getPosColor = (pos: string) => {
        if (league?.settings.useCustomRoles && league.settings.customRoles) {
            const customRole = league.settings.customRoles.find(r => r.name === pos);
            if (customRole && customRole.color) return customRole.color;
        }
        if (pos === 'POR') return '#f97316';
        if (pos === 'DIF') return '#22c55e';
        if (pos === 'CEN') return '#3b82f6';
        if (pos === 'ATT') return '#ef4444';
        return '#64748b';
    };

    const renderPlayerPhoto = (player: any, size: number = 40) => {
        if (player?.photo) {
            return <Image source={{ uri: player.photo }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
        }
        return (
            <View style={[styles.photoPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
                <Text style={[styles.photoPlaceholderText, { fontSize: size * 0.4 }]}>{player?.name?.charAt(0) || '?'}</Text>
            </View>
        );
    };

    const getFormationCoords = () => {
        const count = startersCount;
        let rows: number[] = [];

        if (count === 5) rows = [2, 2, 1];
        else if (count === 6) rows = [2, 3, 1];
        else if (count === 7) rows = [1, 2, 3, 1];
        else if (count === 8) rows = [2, 2, 3, 1];
        else if (count === 9) rows = [2, 3, 3, 1];
        else if (count === 10) rows = [2, 3, 4, 1];
        else if (count === 11) rows = [3, 3, 4, 1];
        else {
            return Array.from({ length: count }).map((_, i) => ({
                top: `${10 + (Math.floor(i / 3) * 25)}%` as DimensionValue,
                left: `${15 + (i % 3) * 35}%` as DimensionValue
            }));
        }

        const coords: { top: DimensionValue, left: DimensionValue }[] = [];
        rows.forEach((numInRow, rowIndex) => {
            const top = (rowIndex * (90 / rows.length)) + 5;
            for (let i = 0; i < numInRow; i++) {
                const left = (i * (100 / numInRow)) + (100 / (numInRow * 2)) - 8;
                coords.push({ top: `${top}%` as DimensionValue, left: `${left}%` as DimensionValue });
            }
        });
        return coords;
    };

    const formationCoords = getFormationCoords();

    if (!league || !targetTeamDoc) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Devi prima iscriverti e creare una Fantasquadra.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.headerInfo}>
                        <View>
                            <Text style={styles.titleInfo}>{adminEditTeamId ? targetTeamDoc.name : (isFixed ? 'La tua Formazione' : `Giornata ${viewingMatchday}`)}</Text>
                            {adminEditTeamId && <Text style={styles.adminBadge}>MODALITÀ ADMIN</Text>}
                        </View>
                        <View style={[styles.timerBadge, isLocked && styles.timerBadgeLocked]}>
                            <Text style={styles.timerLabel}>Scadenza:</Text>
                            <Text style={[styles.timerValue, isLocked && styles.textError]}>{timeLeft}</Text>
                        </View>
                    </View>

                    {!isFixed && availableMatchdays.length > 1 && (
                        <View style={styles.matchdayTabs}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.matchdayTabsScroll}>
                                {availableMatchdays.map((m: number) => (
                                    <TouchableOpacity 
                                        key={m} 
                                        style={[styles.matchdayTab, viewingMatchday === m && styles.matchdayTabActive]}
                                        onPress={() => setViewingMatchday(m)}
                                    >
                                        <Text style={[styles.matchdayTabText, viewingMatchday === m && styles.matchdayTabTextActive]}>G{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.fieldContainer}>
                        <View style={styles.field}>
                            <View style={styles.centerCircle} />
                            <View style={styles.centerLine} />
                            {starters.map((playerId, idx) => {
                                const p = players.find(x => x.id === playerId);
                                const isSelected = selectedSlot === idx;
                                const coord = formationCoords[idx] || { top: '0%' as DimensionValue, left: '0%' as DimensionValue };
                                return (
                                    <View key={idx} style={[styles.playerContainer, { position: 'absolute', top: coord.top, left: coord.left }]}>
                                        <TouchableOpacity
                                            style={[
                                                styles.playerSlot,
                                                isSelected && styles.slotSelected,
                                                { borderColor: p ? getPosColor(p.position) : '#fff' }
                                            ]}
                                            onPress={() => {
                                                if (isLocked) {
                                                    if (p) setDetailPlayer(p);
                                                    return;
                                                }
                                                if (playerId) handleRemoveStarter(idx);
                                                else setSelectedSlot(idx);
                                            }}
                                        >
                                            {p ? renderPlayerPhoto(p, 50) : <Text style={styles.plusIcon}>+</Text>}
                                        </TouchableOpacity>
                                        <Text style={[styles.slotName, { color: p ? getPosColor(p.position) : '#fff' }]} numberOfLines={1}>
                                            {p ? p.name.split(' ').pop() : 'Vuoto'}
                                        </Text>
                                        {p && existingLineup?.playerPoints?.[p.id] !== undefined && (
                                            <View style={styles.pointsBadge}>
                                                <Text style={styles.pointsBadgeText}>{existingLineup.playerPoints[p.id]}</Text>
                                            </View>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    {selectedSlot !== null && (
                        <View style={styles.selectionPanel}>
                            <Text style={styles.panelTitle}>Scegli un giocatore dal campo</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                                {availablePlayersForField.map(p => (
                                    <TouchableOpacity key={p.id} style={styles.availablePlayerCard} onPress={() => handleSelectStarter(p.id)}>
                                        {renderPlayerPhoto(p, 30)}
                                        <View style={{ marginLeft: 10 }}>
                                            <Text style={[styles.apPos, { color: getPosColor(p.position) }]}>{p.position}</Text>
                                            <Text style={styles.apName}>{p.name}</Text>
                                        </View>
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
                                    <TouchableOpacity 
                                        key={index} 
                                        style={styles.benchItem}
                                        onPress={() => {
                                            if (isLocked && p) setDetailPlayer(p);
                                        }}
                                        disabled={!isLocked}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            {renderPlayerPhoto(p, 32)}
                                            <Text style={styles.benchItemText} numberOfLines={1}>
                                                <Text style={{ fontWeight: 'bold', color: getPosColor(p?.position || '') }}> {p?.position} </Text>| {p?.name}
                                            </Text>
                                            {p && existingLineup?.playerPoints?.[p.id] !== undefined && (
                                                <View style={[styles.pointsBadge, { position: 'relative', top: 0, right: 0, marginLeft: 8 }]}>
                                                    <Text style={styles.pointsBadgeText}>{existingLineup.playerPoints[p.id]}</Text>
                                                </View>
                                            )}
                                        </View>
                                        {!isLocked && (
                                            <TouchableOpacity onPress={() => handleRemoveBench(playerId)} style={styles.removeBtn}>
                                                <Text style={styles.removeBtnText}>X</Text>
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        {bench.length < (league.settings.benchCount || 7) && !isLocked && (
                            <View style={styles.addBenchSection}>
                                <Text style={styles.addBenchTitle}>Aggiungi in panchina</Text>
                                {availablePlayersForField.map(p => (
                                    <TouchableOpacity key={`bench-${p.id}`} style={styles.benchAddableItem} onPress={() => handleAddBench(p.id)}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            {renderPlayerPhoto(p, 32)}
                                            <Text style={styles.benchItemText} numberOfLines={1}>
                                                <Text style={{ fontWeight: 'bold', color: getPosColor(p.position) }}> {p.position} </Text>| {p.name}
                                            </Text>
                                        </View>
                                        <Text style={styles.addBtnText}>+</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    {!isLocked ? (
                        <TouchableOpacity style={styles.saveBtn} onPress={saveFormation}>
                            <Text style={styles.saveBtnText}>{adminEditTeamId ? 'Conferma Modifica (Admin)' : 'Conferma Formazione'}</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.lockedAlert}>
                            <Text style={styles.lockedText}>{isFixed ? 'Scadenza Mercato Raggiunta.' : 'Giornata Bloccata.'}</Text>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
            {detailPlayer && (
                <View style={styles.modalOverlay}>
                    <View style={styles.detailCard}>
                        <View style={styles.detailHeader}>
                            <Text style={styles.detailTitle}>{detailPlayer.name}</Text>
                            <TouchableOpacity onPress={() => setDetailPlayer(null)}>
                                <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>CHIUDI</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView style={{ maxHeight: 400 }}>
                            {existingLineup?.playerPointsDetails?.[detailPlayer.id] ? (
                                <View>
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Voto Base</Text>
                                        <Text style={styles.detailValue}>{(existingLineup.playerPointsDetails[detailPlayer.id].baseVote || 0).toFixed(1)}</Text>
                                    </View>
                                    
                                    {(existingLineup.playerPointsDetails[detailPlayer.id].events || []).length > 0 && (
                                        <View style={{ marginTop: 15 }}>
                                            <Text style={styles.detailSub}>Eventi in Campo</Text>
                                            {existingLineup.playerPointsDetails[detailPlayer.id].events.map((ev: any, i: number) => (
                                                <View key={i} style={styles.detailRow}>
                                                    <Text style={styles.detailEventText}>{(ev.type === 'yellow_card' ? 'Giallo' : ev.type === 'red_card' ? 'Rosso' : ev.type.toUpperCase())}</Text>
                                                    <Text style={[styles.detailValue, { color: ev.value > 0 ? '#4ade80' : '#ef4444' }]}>{ev.value > 0 ? '+' : ''}{ev.value.toFixed(1)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {(existingLineup.playerPointsDetails[detailPlayer.id].manualBonuses || []).length > 0 && (
                                        <View style={{ marginTop: 15 }}>
                                            <Text style={styles.detailSub}>Bonus Manuali</Text>
                                            {existingLineup.playerPointsDetails[detailPlayer.id].manualBonuses.map((mb: any, i: number) => (
                                                <View key={i} style={styles.detailRow}>
                                                    <Text style={styles.detailEventText}>{mb.description}</Text>
                                                    <Text style={[styles.detailValue, { color: mb.value > 0 ? '#4ade80' : '#ef4444' }]}>{mb.value > 0 ? '+' : ''}{mb.value.toFixed(1)}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    <View style={[styles.detailRow, { marginTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 10 }]}>
                                        <Text style={[styles.detailLabel, { fontSize: 18 }]}>TOTALE</Text>
                                        <Text style={[styles.detailValue, { fontSize: 22, color: '#fbbf24' }]}>{(existingLineup.playerPointsDetails[detailPlayer.id].total || 0).toFixed(1)}</Text>
                                    </View>
                                </View>
                            ) : (
                                <Text style={{ color: '#94a3b8', textAlign: 'center', marginVertical: 20 }}>Nessun dettaglio disponibile per questa giornata.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
    scrollContent: { padding: 16, paddingBottom: 60 },
    headerInfo: { marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    titleInfo: { fontSize: 18, fontWeight: 'bold', color: '#38bdf8', flex: 1, marginRight: 8 },
    adminBadge: { color: '#fbbf24', fontSize: 9, fontWeight: 'bold', marginTop: 1 },
    timerBadge: { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: '#38bdf8', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
    timerBadgeLocked: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    timerLabel: { color: '#94a3b8', marginRight: 4, fontSize: 10 },
    timerValue: { color: '#38bdf8', fontWeight: 'bold', fontSize: 11 },
    textError: { color: '#ef4444' },
    fieldContainer: { marginBottom: 24 },
    field: { height: FIELD_HEIGHT, backgroundColor: '#166534', borderRadius: 16, borderWidth: 2, borderColor: '#fff', position: 'relative', overflow: 'hidden' },
    centerCircle: { position: 'absolute', top: '50%', left: '50%', width: 100, height: 100, marginLeft: -50, marginTop: -50, borderRadius: 50, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
    centerLine: { position: 'absolute', top: '50%', left: 0, width: '100%', height: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
    playerContainer: { width: 60, alignItems: 'center' },
    playerSlot: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 3, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    slotSelected: { borderColor: '#fbbf24', borderWidth: 4 },
    slotName: { color: '#fff', fontSize: 10, fontWeight: 'bold', marginTop: 4, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 1 },
    plusIcon: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
    selectionPanel: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderColor: '#fbbf24', borderWidth: 1, marginBottom: 24 },
    panelTitle: { color: '#fbbf24', fontWeight: 'bold', marginBottom: 12 },
    availablePlayerCard: { backgroundColor: '#1e293b', padding: 12, borderRadius: 8, marginRight: 10, minWidth: 150, flexDirection: 'row', alignItems: 'center' },
    apPos: { fontSize: 10, fontWeight: 'bold' },
    apName: { color: '#f8fafc', fontWeight: 'bold', marginTop: 2, fontSize: 13 },
    benchContainer: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, marginBottom: 24 },
    benchTitle: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
    benchList: { marginBottom: 16 },
    benchItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', padding: 12, borderRadius: 8, marginBottom: 8 },
    benchItemText: { color: '#f8fafc', marginLeft: 10 },
    removeBtn: { paddingHorizontal: 8 },
    removeBtnText: { color: '#ef4444', fontWeight: 'bold' },
    addBenchSection: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 },
    addBenchTitle: { color: '#94a3b8', marginBottom: 8 },
    benchAddableItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8, marginBottom: 8 },
    addBtnText: { color: '#22c55e', fontWeight: 'bold' },
    saveBtn: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    lockedAlert: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center' },
    lockedText: { color: '#ef4444', fontWeight: 'bold' },
    photoPlaceholder: { backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    photoPlaceholderText: { color: '#94a3b8', fontWeight: 'bold' },
    pointsBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#fbbf24', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, minWidth: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#000' },
    pointsBadgeText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
    matchdayTabs: { marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, paddingVertical: 8 },
    matchdayTabsScroll: { paddingHorizontal: 12 },
    matchdayTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, marginRight: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'transparent' },
    matchdayTabActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    matchdayTabText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
    matchdayTabTextActive: { color: '#38bdf8' },
    modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 1000 },
    detailCard: { backgroundColor: '#1e293b', borderRadius: 24, width: '100%', padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc' },
    detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    detailLabel: { color: '#94a3b8', fontSize: 14 },
    detailValue: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
    detailSub: { color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 1 },
    detailEventText: { color: '#cbd5e1', fontSize: 14 }
});
