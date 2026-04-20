import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Dimensions, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import type { League, TournamentType } from '../types';
import { Trash2, Edit3, EyeOff, Eye, ChevronRight } from 'lucide-react-native';
import ColorPickerModal from '../components/ColorPickerModal';
import { supabase } from '../lib/supabase';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function LeaguesScreen({ navigation }: any) {
    const currentUser = useStore(state => state.currentUser);
    const leagues = useStore(state => state.leagues);
    const addLeague = useStore(state => state.addLeague);
    const joinLeagueStore = useStore(state => state.joinLeague);
    const setCurrentUser = useStore(state => state.setCurrentUser);
    const setActiveLeagueId = useStore(state => state.setActiveLeagueId);
    const isLoading = useStore(state => state.isLoading);

    const [mode, setMode] = useState<'list' | 'create' | 'join' | 'manage'>('list');
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

    // ═══ Step 1: Info Base ═══
    const [leagueName, setLeagueName] = useState('');
    const [seriesName, setSeriesName] = useState('');
    const [sportType, setSportType] = useState<'c5' | 'c7' | 'c8' | 'c11'>('c11');

    // ═══ Step 2: Torneo Reale ═══
    const [leagueType, setLeagueType] = useState<TournamentType>('campionato');
    const [groupCount, setGroupCount] = useState('2');
    const [customGroupNames, setCustomGroupNames] = useState<Record<number, string>>({});
    const [groupAdvancingTeams, setGroupAdvancingTeams] = useState('2');
    const [groupPenaltiesEnabled, setGroupPenaltiesEnabled] = useState(false);
    const [groupPenaltiesWinStr, setGroupPenaltiesWinStr] = useState('2');
    const [groupPenaltiesLossStr, setGroupPenaltiesLossStr] = useState('1');
    const [playoffStartingStage, setPlayoffStartingStage] = useState<string>('Quarti');
    const [playoutEnabled, setPlayoutEnabled] = useState<boolean>(false);
    const [playoutTeamsCount, setPlayoutTeamsCount] = useState('4');
    const [playoffCalendarType, setPlayoffCalendarType] = useState<'automatic' | 'manual'>('manual');

    // ═══ Step 3: Fantasy ═══
    const [hasFantasy, setHasFantasy] = useState(true);
    const [budget, setBudget] = useState('500');
    const [squadSize, setSquadSize] = useState('25');
    const [startersCount, setStartersCount] = useState('11');
    const [benchCount, setBenchCount] = useState('7');
    const [maxSubstitutions, setMaxSubstitutions] = useState('5');
    const [rosterType, setRosterType] = useState<'fixed' | 'variable'>('fixed');
    const [useCustomRoles, setUseCustomRoles] = useState(false);
    const [customRoles, setCustomRoles] = useState<{ name: string; minLimit: number; maxLimit: number; color?: string }[]>([
        { name: 'Top Player', minLimit: 1, maxLimit: 3, color: '#FFD700' },
        { name: 'Medium Player', minLimit: 2, maxLimit: 6, color: '#00E5FF' },
        { name: 'Rookie', minLimit: 5, maxLimit: 10, color: '#4CAF50' }
    ]);

    // Join state
    const [joinCode, setJoinCode] = useState('');

    // Color picker state for custom roles
    const [roleColorPickerVisible, setRoleColorPickerVisible] = useState(false);
    const [roleColorPickerIdx, setRoleColorPickerIdx] = useState(-1);

    // Playoff stage options
    const [stagePickerVisible, setStagePickerVisible] = useState(false);
    const stageOptions = [
        { value: 'Sedicesimi', label: 'Sedicesimi (32)' },
        { value: 'Ottavi', label: 'Ottavi (16)' },
        { value: 'Quarti', label: 'Quarti (8)' },
        { value: 'Semifinale', label: 'Semifinale (4)' },
        { value: 'Finale', label: 'Finale (2)' },
    ];

    const syncAllData = useStore(state => state.syncAllData);

    useEffect(() => {
        if (!currentUser) {
            navigation.replace('Auth');
        }
    }, [currentUser]);

    useFocusEffect(
        useCallback(() => {
            syncAllData();
        }, [syncAllData])
    );

    if (!currentUser) return null;

    const userLeagues = leagues.filter(l => l.roles[currentUser.id]);
    const hiddenLeagueIds = currentUser.hiddenLeagues || [];
    const visibleLeagues = userLeagues.filter(l => !hiddenLeagueIds.includes(l.id));

    const toggleHideLeague = (leagueId: string) => {
        const isHidden = hiddenLeagueIds.includes(leagueId);
        const newHidden = isHidden
            ? hiddenLeagueIds.filter((id: string) => id !== leagueId)
            : [...hiddenLeagueIds, leagueId];
        const updateUserState = useStore.getState().updateUser;
        updateUserState({ ...currentUser, hiddenLeagues: newHidden });
    };

    const handleCreateLeague = () => {
        if (!leagueName) {
            Alert.alert('Errore', 'Inserisci il nome del torneo');
            return;
        }

        const tournamentStages: string[] = [];
        if (leagueType === 'gironi' || leagueType === 'gironi_eliminazione') {
            tournamentStages.push("Gironi");
        }
        if (leagueType === 'gironi_eliminazione' || leagueType === 'eliminazione') {
            if (playoffStartingStage === 'Ottavi') tournamentStages.push("Ottavi");
            if (playoffStartingStage === 'Ottavi' || playoffStartingStage === 'Quarti') tournamentStages.push("Quarti");
            tournamentStages.push("Semifinale");
            tournamentStages.push("Finale");
        }

        const parsedGroupCount = Math.max(1, parseInt(groupCount) || 1);
        const parsedGroupAdvancing = Math.max(1, parseInt(groupAdvancingTeams) || 2);
        const parsedPlayoutTeams = Math.max(2, parseInt(playoutTeamsCount) || 4);
        const parsedBudget = Math.max(0, parseInt(budget) || 500);
        const parsedSquadSize = Math.max(5, parseInt(squadSize) || 25);
        const parsedStartersCount = Math.max(1, parseInt(startersCount) || 11);
        const parsedBenchCount = Math.max(0, parseInt(benchCount) || 7);
        const parsedMaxSubs = Math.max(0, parseInt(maxSubstitutions) || 5);

        // Build groupNames array based on entered details
        const groupNames = Array.from({ length: parsedGroupCount }).map((_, i) => customGroupNames[i] || `Girone ${String.fromCharCode(65 + i)}`);

        const newLeague: League = {
            id: uuidv4(),
            name: leagueName,
            type: leagueType,
            seriesId: seriesName ? seriesName.toLowerCase().replace(/\s+/g, '-') : undefined,
            seriesName: seriesName || undefined,
            roles: { [currentUser.id]: 'admin' },
            joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            settings: {
                sportType,
                groupCount: (leagueType === 'gironi' || leagueType === 'gironi_eliminazione') ? parsedGroupCount : undefined,
                groupNames: (leagueType === 'gironi' || leagueType === 'gironi_eliminazione') ? groupNames : undefined,
                groupPenaltiesEnabled: (leagueType === 'gironi' || leagueType === 'gironi_eliminazione') ? groupPenaltiesEnabled : undefined,
                groupPenaltiesWinPoints: (leagueType === 'gironi' || leagueType === 'gironi_eliminazione') && groupPenaltiesEnabled ? (parseInt(groupPenaltiesWinStr) || 2) : undefined,
                groupPenaltiesLossPoints: (leagueType === 'gironi' || leagueType === 'gironi_eliminazione') && groupPenaltiesEnabled ? (parseInt(groupPenaltiesLossStr) || 1) : undefined,
                groupAdvancingTeams: (leagueType === 'gironi_eliminazione') ? parsedGroupAdvancing : undefined,
                playoffTeamsCount: (leagueType === 'gironi_eliminazione' || leagueType === 'eliminazione') ? 8 : undefined,
                playoffStartingStage: (leagueType === 'gironi_eliminazione' || leagueType === 'eliminazione') ? playoffStartingStage : undefined,
                playoutEnabled,
                playoutTeamsCount: playoutEnabled ? parsedPlayoutTeams : undefined,
                playoffCalendarType: (leagueType === 'gironi_eliminazione' || leagueType === 'eliminazione') ? playoffCalendarType : undefined,
                tournamentStages: tournamentStages.length > 0 ? tournamentStages : undefined,
                hasFantasy,
                budget: parsedBudget,
                squadSize: parsedSquadSize,
                startersCount: parsedStartersCount,
                benchCount: parsedBenchCount,
                maxSubstitutions: parsedMaxSubs,
                rosterType,
                useBaseVote: true,
                baseVoteType: 'automatic',
                scoreBonusEnabled: false,
                useCustomRoles,
                customRoles: useCustomRoles ? customRoles : undefined,
                customBonus: {
                    goal: 3,
                    assist: 1,
                    yellowCard: -0.5,
                    redCard: -1,
                    ownGoal: -2,
                    mvp: 1,
                    cleanSheet: 1
                },
                extraBonuses: {},
                matchdayDeadlines: {}
            }
        };
        addLeague(newLeague).then(() => {
            setMode('list');
            setCreateStep(1);
        });
    };

    const handleNextStep = () => setCreateStep(prev => (prev + 1) as 1 | 2 | 3);
    const handlePrevStep = () => setCreateStep(prev => (prev - 1) as 1 | 2 | 3);

    const handleAddCustomRole = () => {
        setCustomRoles([...customRoles, { name: 'Nuovo Ruolo', minLimit: 0, maxLimit: 5, color: '#ffffff' }]);
    };

    const handleUpdateCustomRole = (index: number, field: string, value: string | number) => {
        const updated = [...customRoles];
        updated[index] = { ...updated[index], [field]: value };
        setCustomRoles(updated);
    };

    const handleRemoveCustomRole = (index: number) => {
        setCustomRoles(customRoles.filter((_, i) => i !== index));
    };

    const handleJoinLeague = () => {
        const trJoinCode = joinCode?.trim().toUpperCase();
        const leagueToJoin = leagues.find(l => l.joinCode?.toUpperCase() === trJoinCode);
        if (!leagueToJoin) {
            Alert.alert('Errore', 'Codice lega non valido');
            return;
        }
        if (leagueToJoin.roles[currentUser.id]) {
            Alert.alert('Errore', 'Fai già parte di questa lega');
            return;
        }
        joinLeagueStore(leagueToJoin.id, currentUser.id).then(() => {
            setMode('list');
        });
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setActiveLeagueId(null);
        setCurrentUser(null);
        navigation.replace('Auth');
    };

    const openLeague = (leagueId: string) => {
        setActiveLeagueId(leagueId);
        navigation.replace('AppDrawer', { leagueId });
    };

    const handleEditLeague = (league: League) => {
        if (Platform.OS === 'ios') {
            Alert.prompt(
                'Modifica Nome',
                'Inserisci il nuovo nome per il torneo:',
                [
                    { text: 'Annulla', style: 'cancel' },
                    {
                        text: 'Salva', onPress: (val?: string) => {
                            if (val && val.trim()) {
                                useStore.getState().updateLeague({ ...league, name: val.trim() });
                            }
                        }
                    }
                ],
                'plain-text',
                league.name
            );
        } else {
            // For Android, we could use a modal, but for now we'll just indicate how to edit
            Alert.alert(
                'Modifica Torneo',
                `Il nome attuale è: ${league.name}\n\nPer modificare il nome e le altre impostazioni, entra nel torneo e vai in "Impostazioni Torneo".`,
                [{ text: 'Ho capito', style: 'default' }]
            );
        }
    };

    const handleDeleteLeague = (league: League) => {
        Alert.alert(
            'Elimina Torneo',
            `Eliminare "${league.name}" e TUTTI i dati associati?`,
            [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina', style: 'destructive', onPress: () => {
                        useStore.getState().deleteLeague(league.id);
                    }
                }
            ]
        );
    };

    // ─── SPORT TYPE DATA ────
    const sportTypes = [
        { id: 'c5' as const, emoji: '🤾', label: 'Calcio a 5' },
        { id: 'c7' as const, emoji: '⚽', label: 'Calcio a 7' },
        { id: 'c8' as const, emoji: '⚽', label: 'Calcio a 8' },
        { id: 'c11' as const, emoji: '🏟️', label: 'Calcio a 11' },
    ];

    // ─── TOURNAMENT TYPE DATA ────
    const tournamentTypes = [
        { id: 'campionato' as TournamentType, emoji: '📋', label: 'Campionato', desc: 'Un unico girone all\'italiana.' },
        { id: 'gironi' as TournamentType, emoji: '🔄', label: 'Solo Gironi', desc: 'Più gironi separati.' },
        { id: 'gironi_eliminazione' as TournamentType, emoji: '🏆', label: 'Gironi + Eliminaz.', desc: 'Come la Champions!' },
        { id: 'eliminazione' as TournamentType, emoji: '🎯', label: 'Solo Eliminaz.', desc: 'Chi perde va a casa!' },
    ];

    // ═══════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>FantaTorneo</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.userName}>Ciao, {currentUser.firstName}</Text>
                    <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                        <Text style={styles.logoutText}>Esci</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

                {/* ═══════ LIST MODE ═══════ */}
                {mode === 'list' && (
                    <View>
                        <Text style={styles.sectionTitle}>I tuoi Tornei</Text>

                        {visibleLeagues.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>Non hai nessun torneo visibile al momento.</Text>
                            </View>
                        ) : (
                            visibleLeagues.map(league => (
                                <TouchableOpacity key={league.id} style={styles.leagueCard} onPress={() => openLeague(league.id)} activeOpacity={0.7}>
                                    <View style={styles.cardTopRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.leagueName}>{league.name}</Text>
                                            {league.seriesName && <Text style={styles.seriesBadge}>Serie: {league.seriesName}</Text>}
                                        </View>
                                        <View style={styles.cardActions}>
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); handleEditLeague(league); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 12 }}>
                                                <Edit3 size={16} color="#fbbf24" />
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={(e) => { e.stopPropagation?.(); handleDeleteLeague(league); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                                <Trash2 size={16} color="#ef4444" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <Text style={styles.leagueRole}>
                                        Ruolo: {league.roles[currentUser.id] === 'admin' ? 'Amministratore' : league.roles[currentUser.id] === 'organizer' ? 'Organizzatore' : 'Utente'}
                                    </Text>
                                    <Text style={styles.leagueType}>Tipo: {league.type}</Text>
                                </TouchableOpacity>
                            ))
                        )}

                        <View style={styles.actionsBox}>
                            <TouchableOpacity 
                                style={[styles.primaryBtn, isLoading && { opacity: 0.6 }]} 
                                onPress={() => { setMode('create'); setCreateStep(1); }}
                                disabled={isLoading}
                            >
                                <Text style={styles.primaryBtnText}>Crea Nuovo Torneo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('join')}>
                                <Text style={styles.secondaryBtnText}>Unisciti a un Torneo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.secondaryBtn, { borderColor: '#94a3b8' }]} onPress={() => setMode('manage')}>
                                <Text style={[styles.secondaryBtnText, { color: '#f8fafc' }]}>Gestisci i miei tornei</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ═══════ MANAGE MODE ═══════ */}
                {mode === 'manage' && (
                    <View style={styles.formCard}>
                        <View style={styles.formHeaderRow}>
                            <Text style={styles.sectionTitle}>Gestisci Tornei</Text>
                            <TouchableOpacity onPress={() => setMode('list')}>
                                <Text style={{ color: '#38bdf8', fontSize: 14 }}>← Indietro</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helpText}>Nascondi i tornei che non vuoi più vedere.</Text>

                        {userLeagues.map(league => {
                            const isHidden = hiddenLeagueIds.includes(league.id);
                            return (
                                <View key={league.id} style={styles.manageRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.manageName}>{league.name}</Text>
                                        <Text style={styles.manageRole}>
                                            {league.roles[currentUser.id] === 'admin' ? 'Amministratore' : 'Utente'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={[styles.manageBtnToggle, isHidden && styles.manageBtnShow]}
                                        onPress={() => toggleHideLeague(league.id)}
                                    >
                                        {isHidden ? <Eye size={14} color="#22c55e" /> : <EyeOff size={14} color="#ef4444" />}
                                        <Text style={{ color: isHidden ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>
                                            {isHidden ? 'Mostra' : 'Nascondi'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* ═══════ CREATE MODE ═══════ */}
                {mode === 'create' && (
                    <View style={styles.formCard}>
                        {/* Header + Step Indicator */}
                        <View style={styles.formHeaderRow}>
                            <Text style={styles.wizardTitle}>
                                {createStep === 1 ? '⚽ Info Torneo' : createStep === 2 ? '🏆 Formula di Gioco' : '🎮 Fantacalcio'}
                            </Text>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>{createStep}/3</Text>
                            </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBar}>
                            {[1, 2, 3].map(step => (
                                <View key={step} style={[styles.progressSegment, step <= createStep && styles.progressSegmentActive]} />
                            ))}
                        </View>

                        {/* ─── STEP 1 ─── */}
                        {createStep === 1 && (
                            <View>
                                <Text style={styles.label}>Nome del Torneo *</Text>
                                <TextInput
                                    style={[styles.input, { fontSize: 18 }]}
                                    placeholder="Es. Champions degli Amici 2026"
                                    placeholderTextColor="#64748b"
                                    value={leagueName}
                                    onChangeText={setLeagueName}
                                />

                                <View style={styles.dashedBox}>
                                    <Text style={styles.label}>🔗 Nome Serie <Text style={styles.optionalTag}>(opzionale)</Text></Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Es. Champions degli Amici"
                                        placeholderTextColor="#64748b"
                                        value={seriesName}
                                        onChangeText={setSeriesName}
                                    />
                                    <Text style={styles.hintText}>
                                        Se crei più tornei con lo stesso Nome Serie, i giocatori verranno collegati per <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>statistiche di carriera</Text> congiunte.
                                    </Text>
                                </View>

                                <Text style={[styles.label, { marginTop: 20 }]}>Sport / Formato</Text>
                                <View style={styles.sportGrid}>
                                    {sportTypes.map(st => (
                                        <TouchableOpacity
                                            key={st.id}
                                            style={[styles.sportCard, sportType === st.id && styles.sportCardActive]}
                                            onPress={() => setSportType(st.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.sportEmoji}>{st.emoji}</Text>
                                            <Text style={[styles.sportLabel, sportType === st.id && { fontWeight: 'bold', color: '#f8fafc' }]}>{st.label}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={[styles.secondaryBtn, styles.btnFlex]} onPress={() => { setMode('list'); setCreateStep(1); }}>
                                        <Text style={styles.secondaryBtnText}>Annulla</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.primaryBtn, styles.btnFlex, !leagueName && { opacity: 0.5 }]} onPress={handleNextStep} disabled={!leagueName}>
                                        <Text style={styles.primaryBtnText}>Avanti →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ─── STEP 2 ─── */}
                        {createStep === 2 && (
                            <View>
                                <Text style={styles.helpText}>Scegli come si svolge il torneo reale.</Text>

                                <View style={styles.typeGrid}>
                                    {tournamentTypes.map(type => (
                                        <TouchableOpacity
                                            key={type.id}
                                            style={[styles.typeCard, leagueType === type.id && styles.typeCardActive]}
                                            onPress={() => setLeagueType(type.id)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.typeEmoji}>{type.emoji}</Text>
                                            <Text style={[styles.typeLabel, leagueType === type.id && { color: '#fbbf24' }]}>{type.label}</Text>
                                            <Text style={styles.typeDesc}>{type.desc}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Gruppi config */}
                                {(leagueType === 'gironi' || leagueType === 'gironi_eliminazione') && (
                                    <View style={styles.configBox}>
                                        <Text style={styles.configTitle}>🔄 Impostazioni Gironi</Text>
                                        <View style={styles.configRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.configLabel}>Numero di Gironi</Text>
                                                <TextInput style={styles.configInput} keyboardType="numeric" value={groupCount} onChangeText={setGroupCount} />
                                            </View>
                                            {leagueType === 'gironi_eliminazione' && (
                                                <View style={{ flex: 1, marginLeft: 10 }}>
                                                    <Text style={styles.configLabel}>Squadre che passano</Text>
                                                    <TextInput style={styles.configInput} keyboardType="numeric" value={groupAdvancingTeams} onChangeText={setGroupAdvancingTeams} />
                                                </View>
                                            )}
                                        </View>
                                        {/* Nomi dei gironi configurabili */}
                                        <View style={{ marginTop: 12 }}>
                                            <Text style={styles.configLabel}>Nomi dei Gironi (opzionale)</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                                                {Array.from({ length: Math.min(parseInt(groupCount) || 2, 20) }).map((_, i) => (
                                                    <TextInput
                                                        key={i}
                                                        style={[styles.configInput, { width: '48%', marginBottom: 10 }]}
                                                        placeholder={`Girone ${String.fromCharCode(65 + i)}`}
                                                        placeholderTextColor="#64748b"
                                                        value={customGroupNames[i] || ''}
                                                        onChangeText={val => setCustomGroupNames(prev => ({ ...prev, [i]: val }))}
                                                    />
                                                ))}
                                            </View>
                                        </View>

                                        {/* Rigori gironi */}
                                        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }}>
                                            <TouchableOpacity
                                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                                                onPress={() => setGroupPenaltiesEnabled(!groupPenaltiesEnabled)}
                                            >
                                                <View style={[styles.checkbox, groupPenaltiesEnabled && styles.checkboxActive]}>
                                                    {groupPenaltiesEnabled && <Text style={styles.checkmark}>✓</Text>}
                                                </View>
                                                <Text style={[styles.configLabel, { marginBottom: 0 }]}>Rigori in caso di pareggio</Text>
                                            </TouchableOpacity>

                                            {groupPenaltiesEnabled && (
                                                <View style={styles.configRow}>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={styles.configLabel}>Punti Vincitore</Text>
                                                        <TextInput style={styles.configInput} keyboardType="numeric" value={groupPenaltiesWinStr} onChangeText={setGroupPenaltiesWinStr} />
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                                        <Text style={styles.configLabel}>Punti Sconfitto</Text>
                                                        <TextInput style={styles.configInput} keyboardType="numeric" value={groupPenaltiesLossStr} onChangeText={setGroupPenaltiesLossStr} />
                                                    </View>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {/* Eliminazione config */}
                                {(leagueType === 'gironi_eliminazione' || leagueType === 'eliminazione') && (
                                    <View style={[styles.configBox, { borderColor: '#fbbf24', borderLeftWidth: 3 }]}>
                                        <Text style={[styles.configTitle, { color: '#fbbf24' }]}>🎯 Eliminazione Diretta</Text>
                                        <Text style={styles.hintText}>Le partite le creerai dalla sezione "Calendario Partite" selezionando il tipo "Playoff".</Text>
                                        <View style={styles.configRow}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.configLabel}>Fase iniziale</Text>
                                                {stageOptions.map(opt => (
                                                    <TouchableOpacity
                                                        key={opt.value}
                                                        style={[styles.stageOption, playoffStartingStage === opt.value && styles.stageOptionActive]}
                                                        onPress={() => setPlayoffStartingStage(opt.value)}
                                                    >
                                                        <Text style={[styles.stageOptionText, playoffStartingStage === opt.value && { color: '#fbbf24', fontWeight: 'bold' }]}>{opt.label}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                <Text style={styles.configLabel}>Generazione</Text>
                                                <TouchableOpacity
                                                    style={[styles.stageOption, playoffCalendarType === 'manual' && styles.stageOptionActive]}
                                                    onPress={() => setPlayoffCalendarType('manual')}
                                                >
                                                    <Text style={[styles.stageOptionText, playoffCalendarType === 'manual' && { color: '#fbbf24', fontWeight: 'bold' }]}>Manuale</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity
                                                    style={[styles.stageOption, playoffCalendarType === 'automatic' && styles.stageOptionActive]}
                                                    onPress={() => setPlayoffCalendarType('automatic')}
                                                >
                                                    <Text style={[styles.stageOptionText, playoffCalendarType === 'automatic' && { color: '#fbbf24', fontWeight: 'bold' }]}>Automatico</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                )}

                                {/* Playout */}
                                <View style={styles.configBox}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.configTitle}>🛡️ Playout</Text>
                                            <Text style={styles.hintText}>Mini-torneo tra le ultime classificate.</Text>
                                        </View>
                                        <Switch value={playoutEnabled} onValueChange={setPlayoutEnabled} trackColor={{ false: "#1e293b", true: "#0ea5e9" }} />
                                    </View>
                                    {playoutEnabled && (
                                        <View style={{ marginTop: 10 }}>
                                            <Text style={styles.configLabel}>Squadre nel Playout</Text>
                                            <TextInput style={[styles.configInput, { width: 80 }]} keyboardType="numeric" value={playoutTeamsCount} onChangeText={setPlayoutTeamsCount} />
                                        </View>
                                    )}
                                </View>

                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={[styles.secondaryBtn, styles.btnFlex]} onPress={handlePrevStep}>
                                        <Text style={styles.secondaryBtnText}>← Indietro</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.primaryBtn, styles.btnFlex]} onPress={handleNextStep}>
                                        <Text style={styles.primaryBtnText}>Avanti →</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* ─── STEP 3 ─── */}
                        {createStep === 3 && (
                            <View>
                                {/* Fantasy Toggle */}
                                <View style={styles.fantasyToggleBox}>
                                    <Switch value={hasFantasy} onValueChange={setHasFantasy} trackColor={{ false: "#1e293b", true: "#0ea5e9" }} />
                                    <View style={{ marginLeft: 12, flex: 1 }}>
                                        <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 16 }}>🎮 Modalità Fantacalcio</Text>
                                        <Text style={styles.hintText}>
                                            {hasFantasy ? 'Attiva — I partecipanti potranno creare le loro squadre fantasy.' : 'Disattivata — Solo torneo reale.'}
                                        </Text>
                                    </View>
                                </View>

                                {hasFantasy && (
                                    <View style={styles.fantasyRulesBox}>
                                        <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>💰 Regole Fantasy</Text>

                                        <View style={styles.rulesGrid}>
                                            <View style={styles.ruleItem}>
                                                <Text style={styles.ruleLabel}>Budget</Text>
                                                <TextInput style={styles.ruleInput} keyboardType="numeric" value={budget} onChangeText={setBudget} />
                                            </View>
                                            <View style={styles.ruleItem}>
                                                <Text style={styles.ruleLabel}>Max Rosa</Text>
                                                <TextInput style={styles.ruleInput} keyboardType="numeric" value={squadSize} onChangeText={setSquadSize} />
                                            </View>
                                            <View style={styles.ruleItem}>
                                                <Text style={styles.ruleLabel}>Titolari</Text>
                                                <TextInput style={styles.ruleInput} keyboardType="numeric" value={startersCount} onChangeText={setStartersCount} />
                                            </View>
                                            <View style={styles.ruleItem}>
                                                <Text style={styles.ruleLabel}>Panchinari</Text>
                                                <TextInput style={styles.ruleInput} keyboardType="numeric" value={benchCount} onChangeText={setBenchCount} />
                                            </View>
                                            <View style={styles.ruleItem}>
                                                <Text style={styles.ruleLabel}>Sost. Max</Text>
                                                <TextInput style={styles.ruleInput} keyboardType="numeric" value={maxSubstitutions} onChangeText={setMaxSubstitutions} />
                                            </View>
                                            <View style={styles.ruleItem}>
                                                <Text style={styles.ruleLabel}>Tipo Rosa</Text>
                                                <View style={{ flexDirection: 'row', gap: 4 }}>
                                                    <TouchableOpacity
                                                        style={[styles.miniToggle, rosterType === 'fixed' && styles.miniToggleActive]}
                                                        onPress={() => setRosterType('fixed')}
                                                    >
                                                        <Text style={[styles.miniToggleText, rosterType === 'fixed' && { color: '#0ea5e9' }]}>Fissa</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.miniToggle, rosterType === 'variable' && styles.miniToggleActive]}
                                                        onPress={() => setRosterType('variable')}
                                                    >
                                                        <Text style={[styles.miniToggleText, rosterType === 'variable' && { color: '#0ea5e9' }]}>Variab.</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Custom Roles */}
                                        <View style={styles.customRolesSection}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 14 }}>🎨 Categorie Personalizzate</Text>
                                                <Switch value={useCustomRoles} onValueChange={setUseCustomRoles} trackColor={{ false: "#1e293b", true: "#fbbf24" }} />
                                            </View>

                                            {useCustomRoles && (
                                                <View style={{ marginTop: 12 }}>
                                                    {customRoles.map((role, idx) => (
                                                        <View key={idx} style={styles.customRoleRow}>
                                                            <TouchableOpacity
                                                                style={[styles.roleColorDot, { backgroundColor: role.color || '#fff' }]}
                                                                onPress={() => { setRoleColorPickerIdx(idx); setRoleColorPickerVisible(true); }}
                                                            />
                                                            <TextInput
                                                                style={[styles.input, { flex: 2, marginBottom: 0, padding: 8, fontSize: 13 }]}
                                                                value={role.name}
                                                                onChangeText={v => handleUpdateCustomRole(idx, 'name', v)}
                                                                placeholder="Nome"
                                                                placeholderTextColor="#64748b"
                                                            />
                                                            <TextInput
                                                                style={[styles.input, { width: 40, marginBottom: 0, padding: 8, fontSize: 13, textAlign: 'center' }]}
                                                                keyboardType="numeric"
                                                                value={role.minLimit.toString()}
                                                                onChangeText={v => handleUpdateCustomRole(idx, 'minLimit', parseInt(v) || 0)}
                                                            />
                                                            <Text style={{ color: '#64748b', fontSize: 10 }}>—</Text>
                                                            <TextInput
                                                                style={[styles.input, { width: 40, marginBottom: 0, padding: 8, fontSize: 13, textAlign: 'center' }]}
                                                                keyboardType="numeric"
                                                                value={role.maxLimit.toString()}
                                                                onChangeText={v => handleUpdateCustomRole(idx, 'maxLimit', parseInt(v) || 0)}
                                                            />
                                                            <TouchableOpacity onPress={() => handleRemoveCustomRole(idx)}>
                                                                <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    ))}
                                                    <TouchableOpacity onPress={handleAddCustomRole} style={{ marginTop: 8 }}>
                                                        <Text style={{ color: '#38bdf8', fontSize: 13 }}>+ Aggiungi Categoria</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.btnRow}>
                                    <TouchableOpacity style={[styles.secondaryBtn, styles.btnFlex]} onPress={handlePrevStep}>
                                        <Text style={styles.secondaryBtnText}>← Indietro</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.createBtn, styles.btnFlex]} onPress={handleCreateLeague}>
                                        <Text style={styles.createBtnText}>🚀 Crea Torneo</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ═══════ JOIN MODE ═══════ */}
                {mode === 'join' && (
                    <View style={styles.formCard}>
                        <Text style={styles.sectionTitle}>Unisciti a un Torneo</Text>
                        <Text style={styles.label}>Codice Invito (6 caratteri)</Text>
                        <TextInput
                            style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 4, textTransform: 'uppercase' }]}
                            placeholder="ABCDEF"
                            placeholderTextColor="#64748b"
                            value={joinCode}
                            onChangeText={setJoinCode}
                            maxLength={6}
                            autoCapitalize="characters"
                        />

                        <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.secondaryBtn, styles.btnFlex]} onPress={() => setMode('list')}>
                                <Text style={styles.secondaryBtnText}>Annulla</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.primaryBtn, styles.btnFlex]} onPress={handleJoinLeague}>
                                <Text style={styles.primaryBtnText}>Partecipa</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Color Picker Modal for Custom Roles */}
            <ColorPickerModal
                visible={roleColorPickerVisible}
                currentColor={roleColorPickerIdx >= 0 ? (customRoles[roleColorPickerIdx]?.color || '#ffffff') : '#ffffff'}
                onSelect={(color) => {
                    if (roleColorPickerIdx >= 0) {
                        handleUpdateCustomRole(roleColorPickerIdx, 'color', color);
                    }
                }}
                onClose={() => { setRoleColorPickerVisible(false); setRoleColorPickerIdx(-1); }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8' },
    headerRight: { flexDirection: 'row', alignItems: 'center' },
    userName: { color: '#f8fafc', marginRight: 10 },
    logoutBtn: { backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
    logoutText: { color: '#ef4444', fontWeight: 'bold' },
    content: { padding: 20, paddingBottom: 40 },
    sectionTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc', marginBottom: 20 },
    emptyState: { padding: 40, alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: 12, marginBottom: 20 },
    emptyText: { color: '#94a3b8' },

    // ─── League Cards ────
    leagueCard: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#38bdf8' },
    cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardActions: { flexDirection: 'row', gap: 8 },
    leagueName: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 4 },
    seriesBadge: { color: '#fbbf24', fontSize: 12, marginBottom: 4 },
    leagueRole: { color: '#94a3b8', fontSize: 14 },
    leagueType: { color: '#94a3b8', fontSize: 14 },

    // ─── Buttons ────
    actionsBox: { marginTop: 20, gap: 12 },
    primaryBtn: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    secondaryBtn: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#38bdf8', padding: 16, borderRadius: 12, alignItems: 'center' },
    secondaryBtnText: { color: '#38bdf8', fontWeight: 'bold', fontSize: 16 },
    createBtn: { padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: '#fbbf24' },
    createBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
    btnRow: { flexDirection: 'row', marginTop: 24, gap: 10 },
    btnFlex: { flex: 1 },

    // ─── Form ────
    formCard: { backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    label: { color: '#f8fafc', fontWeight: 'bold', marginBottom: 8, marginTop: 16, fontSize: 15 },
    optionalTag: { color: '#64748b', fontWeight: 'normal', fontSize: 13 },
    helpText: { color: '#94a3b8', fontSize: 13, marginBottom: 12, lineHeight: 18 },
    hintText: { color: '#64748b', fontSize: 12, marginTop: 6, lineHeight: 16 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 8 },

    // ─── Wizard ────
    wizardTitle: { color: '#38bdf8', fontSize: 18, fontWeight: 'bold' },
    stepBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    stepBadgeText: { color: '#94a3b8', fontSize: 13 },
    progressBar: { flexDirection: 'row', gap: 4, marginBottom: 20 },
    progressSegment: { height: 4, flex: 1, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
    progressSegmentActive: { backgroundColor: '#fbbf24' },

    // ─── Step 1 ────
    dashedBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.15)', marginTop: 16 },
    sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    sportCard: { width: (SCREEN_WIDTH - 72) / 4, paddingVertical: 12, alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
    sportCardActive: { borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)' },
    sportEmoji: { fontSize: 24, marginBottom: 4 },
    sportLabel: { fontSize: 10, color: '#94a3b8', textAlign: 'center' },

    // ─── Step 2 ────
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeCard: { width: (SCREEN_WIDTH - 68) / 2, padding: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10 },
    typeCardActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.06)' },
    typeEmoji: { fontSize: 24, marginBottom: 6 },
    typeLabel: { fontWeight: 'bold', color: '#f8fafc', marginBottom: 4, fontSize: 13 },
    typeDesc: { fontSize: 11, color: '#64748b', lineHeight: 15 },
    configBox: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
    configTitle: { fontWeight: 'bold', color: '#f8fafc', fontSize: 14, marginBottom: 8 },
    configLabel: { color: '#94a3b8', fontSize: 12, marginBottom: 4 },
    configInput: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10, fontSize: 14 },
    configRow: { flexDirection: 'row', marginTop: 8 },
    stageOption: { padding: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 4 },
    stageOptionActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.08)' },
    stageOptionText: { color: '#94a3b8', fontSize: 12 },

    // ─── Step 3 ────
    fantasyToggleBox: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 16 },
    fantasyRulesBox: { padding: 16, backgroundColor: 'rgba(15, 23, 42, 0.6)', borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    ruleItem: { width: (SCREEN_WIDTH - 100) / 3, marginBottom: 12 },
    ruleLabel: { color: '#94a3b8', fontSize: 11, marginBottom: 4, fontWeight: '600' },
    ruleInput: { backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 8, fontSize: 14, textAlign: 'center' },
    miniToggle: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    miniToggleActive: { borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)' },
    miniToggleText: { color: '#94a3b8', fontSize: 11, fontWeight: 'bold' },
    customRolesSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    customRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 },
    roleColorDot: { width: 16, height: 16, borderRadius: 8 },

    // ─── Manage ────
    manageRow: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, marginBottom: 8 },
    manageName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14 },
    manageRole: { color: '#94a3b8', fontSize: 12 },
    manageBtnToggle: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#ef4444' },
    manageBtnShow: { borderColor: '#22c55e' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#64748b', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    checkmark: { color: 'white', fontSize: 14, fontWeight: 'bold' },
});
