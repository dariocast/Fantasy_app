import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Dimensions, Platform, KeyboardAvoidingView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import type { League, TournamentType } from '../types';
import { Trash2, Edit3, EyeOff, Eye, ChevronRight, Plus, LogIn, Trophy, Users, Settings, LogOut, Shield, Info, CheckCircle2, Image as ImageIcon } from 'lucide-react-native';
import ColorPickerModal from '../components/ColorPickerModal';
import * as ImagePicker from 'expo-image-picker';
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
    const showNotification = useStore(state => state.showNotification);

    const [mode, setMode] = useState<'list' | 'create' | 'join' | 'manage'>('list');
    const [createStep, setCreateStep] = useState<1 | 2 | 3>(1);

    // ═══ Step 1: Info Base ═══
    const [leagueName, setLeagueName] = useState('');
    const [seriesName, setSeriesName] = useState('');
    const [sportType, setSportType] = useState<'c5' | 'c7' | 'c8' | 'c11'>('c11');
    const [leagueLogo, setLeagueLogo] = useState<string | undefined>(undefined);

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

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setLeagueLogo(result.assets[0].uri);
        }
    };

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
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Inserisci il nome del torneo'
            });
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
            logo: leagueLogo,
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
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Codice lega non valido'
            });
            return;
        }
        if (leagueToJoin.roles[currentUser.id]) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Fai già parte di questa lega'
            });
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
            showNotification({
                type: 'info',
                title: 'Modifica Torneo',
                message: `Il nome attuale è: ${league.name}\n\nPer modificare il nome e le altre impostazioni, entra nel torneo e vai in "Impostazioni Torneo".`
            });
        }
    };

    const handleDeleteLeague = (league: League) => {
        showNotification({
            type: 'confirm',
            title: 'Elimina Torneo',
            message: `Eliminare "${league.name}" e TUTTI i dati associati?`,
            actions: [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina', style: 'destructive', onPress: () => {
                        useStore.getState().deleteLeague(league.id);
                    }
                }
            ]
        });
    };

    // ─── SPORT TYPE DATA ──── (Removed)

    const tournamentTypes = [
        { id: 'campionato' as TournamentType, label: 'Campionato', desc: 'Un unico girone all\'italiana.' },
        { id: 'gironi' as TournamentType, label: 'Gironi', desc: 'Più gironi separati.' },
        { id: 'gironi_eliminazione' as TournamentType, label: 'Gironi ed Eliminazione Diretta', desc: 'Come la Champions!' },
        { id: 'eliminazione' as TournamentType, label: 'Eliminazione Diretta', desc: 'Chi perde va a casa!' },
    ];

    // ═══════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerSubtitle}>Benvenuto,</Text>
                    <Text style={styles.headerTitle}>{currentUser.firstName}</Text>
                </View>
                <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
                    <LogOut size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                style={{ flex: 1 }} 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView 
                    contentContainerStyle={styles.content} 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >

                {/* ═══════ LIST MODE ═══════ */}
                {mode === 'list' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Trophy size={20} color="#fbbf24" style={{ marginRight: 10 }} />
                            <Text style={styles.sectionTitle}>I tuoi Tornei</Text>
                        </View>

                        {visibleLeagues.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Info size={40} color="rgba(255,255,255,0.05)" />
                                <Text style={styles.emptyText}>Non hai nessun torneo visibile al momento.</Text>
                            </View>
                        ) : (
                            visibleLeagues.map(league => (
                                <TouchableOpacity key={league.id} style={styles.leagueCard} onPress={() => openLeague(league.id)} activeOpacity={0.8}>
                                    <View style={styles.cardTopRow}>
                                        <View style={styles.leagueIconBox}>
                                            {league.logo ? (
                                                <Image source={{ uri: league.logo }} style={{ width: 48, height: 48, borderRadius: 15 }} />
                                            ) : (
                                                <Shield size={24} color="#38bdf8" />
                                            )}
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 15 }}>
                                            <Text style={styles.leagueName}>{league.name}</Text>
                                            <View style={styles.leagueMeta}>
                                                <Text style={styles.leagueRoleBadge}>
                                                    {league.roles[currentUser.id] === 'admin' ? 'Amministratore' : 'Membro'}
                                                </Text>
                                                {league.seriesName && <Text style={styles.seriesNameText}>· {league.seriesName}</Text>}
                                            </View>
                                        </View>
                                        <ChevronRight size={20} color="#475569" />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}

                        <View style={styles.actionsBox}>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => { setMode('create'); setCreateStep(1); }}
                                activeOpacity={0.8}
                            >
                                <Plus size={20} color="#fff" style={{ marginRight: 10 }} />
                                <Text style={styles.primaryBtnText}>Crea Nuovo Torneo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setMode('join')} activeOpacity={0.8}>
                                <LogIn size={20} color="#38bdf8" style={{ marginRight: 10 }} />
                                <Text style={styles.secondaryBtnText}>Unisciti a un Torneo</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.manageBtn} onPress={() => setMode('manage')} activeOpacity={0.8}>
                                <Settings size={20} color="#64748b" style={{ marginRight: 10 }} />
                                <Text style={styles.manageBtnText}>Gestisci Tornei</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* ═══════ MANAGE MODE ═══════ */}
                {mode === 'manage' && (
                    <View style={styles.formCard}>
                        <View style={styles.formHeaderRow}>
                            <Text style={styles.wizardTitle}>Gestisci Tornei</Text>
                            <TouchableOpacity onPress={() => setMode('list')} style={styles.backLink}>
                                <ChevronRight size={16} color="#38bdf8" style={{ transform: [{ rotate: '180deg' }] }} />
                                <Text style={styles.backLinkText}>Indietro</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.helpText}>Personalizza la visibilità dei tuoi tornei.</Text>

                        {userLeagues.map(league => {
                            const isHidden = hiddenLeagueIds.includes(league.id);
                            return (
                                <View key={league.id} style={styles.manageRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.manageName}>{league.name}</Text>
                                        <Text style={styles.manageRoleLabel}>
                                            {league.roles[currentUser.id] === 'admin' ? 'Amministratore' : 'Utente'}
                                        </Text>
                                    </View>
                                    <View style={styles.manageActions}>
                                        <TouchableOpacity onPress={() => handleEditLeague(league)} style={styles.miniActionBtn}>
                                            <Edit3 size={16} color="#fbbf24" />
                                        </TouchableOpacity>
                                        <TouchableOpacity onPress={() => handleDeleteLeague(league)} style={styles.miniActionBtn}>
                                            <Trash2 size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.manageBtnToggle, isHidden && styles.manageBtnShow]}
                                            onPress={() => toggleHideLeague(league.id)}
                                        >
                                            {isHidden ? <Eye size={16} color="#22c55e" /> : <EyeOff size={16} color="#ef4444" />}
                                        </TouchableOpacity>
                                    </View>
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
                                {createStep === 1 ? 'Configurazione' : createStep === 2 ? 'Formula' : 'Fantacalcio'}
                            </Text>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepBadgeText}>{createStep} di 3</Text>
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

                                <Text style={styles.label}>Logo del Torneo</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 25, gap: 15 }}>
                                    <TouchableOpacity 
                                        style={[styles.secondaryBtn, { flex: 1, paddingVertical: 12, borderRadius: 15 }]} 
                                        onPress={pickImage}
                                    >
                                        <ImageIcon size={18} color="#38bdf8" style={{ marginRight: 10 }} />
                                        <Text style={[styles.secondaryBtnText, { fontSize: 14 }]}>
                                            {leagueLogo ? 'Cambia Logo' : 'Carica Logo'}
                                        </Text>
                                    </TouchableOpacity>
                                    {leagueLogo && (
                                        <Image 
                                            source={{ uri: leagueLogo }} 
                                            style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' }} 
                                        />
                                    )}
                                </View>

                                <View style={styles.dashedBox}>
                                    <Text style={styles.label}>Nome Serie <Text style={styles.optionalTag}>(opzionale)</Text></Text>
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
                                            <Text style={[styles.typeLabel, leagueType === type.id && { color: '#fbbf24' }]}>{type.label}</Text>
                                            <Text style={styles.typeDesc}>{type.desc}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Gruppi config */}
                                {(leagueType === 'gironi' || leagueType === 'gironi_eliminazione') && (
                                    <View style={styles.configBox}>
                                        <Text style={styles.configTitle}>Impostazioni Gironi</Text>
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
                                        <Text style={[styles.configTitle, { color: '#fbbf24' }]}>Eliminazione Diretta</Text>
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
                                            <Text style={styles.configTitle}>Playoff/Playout</Text>
                                            <Text style={styles.hintText}>Mini-torneo tra le ultime classificate.</Text>
                                        </View>
                                        <Switch value={playoutEnabled} onValueChange={setPlayoutEnabled} trackColor={{ false: "#1e293b", true: "#0ea5e9" }} />
                                    </View>
                                    {playoutEnabled && (
                                        <View style={{ marginTop: 10 }}>
                                            <Text style={styles.configLabel}>Squadre nel Playoff/Playout</Text>
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
                                        <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 16 }}>Modalità Fantacalcio</Text>
                                        <Text style={styles.hintText}>
                                            {hasFantasy ? 'Attiva — I partecipanti potranno creare le loro squadre fantasy.' : 'Disattivata — Solo torneo reale.'}
                                        </Text>
                                    </View>
                                </View>

                                {hasFantasy && (
                                    <View style={styles.fantasyRulesBox}>
                                        <Text style={{ color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 16 }}>Regole Fantasy</Text>

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
                                            <View style={[styles.ruleItem, { minWidth: '100%', marginTop: 10 }]}>
                                                <Text style={styles.ruleLabel}>Tipo Rosa</Text>
                                                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                                    <TouchableOpacity
                                                        style={[styles.miniToggle, rosterType === 'fixed' && styles.miniToggleActive, { flex: 1 }]}
                                                        onPress={() => setRosterType('fixed')}
                                                    >
                                                        <Text style={[styles.miniToggleText, rosterType === 'fixed' && { color: '#0ea5e9' }, { fontSize: 12 }]}>Fissa</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.miniToggle, rosterType === 'variable' && styles.miniToggleActive, { flex: 1 }]}
                                                        onPress={() => setRosterType('variable')}
                                                    >
                                                        <Text style={[styles.miniToggleText, rosterType === 'variable' && { color: '#0ea5e9' }, { fontSize: 12 }]}>Variabile</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>

                                        {/* Custom Roles */}
                                        <View style={styles.customRolesSection}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                                <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 14 }}>Categorie Personalizzate</Text>
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
                                        <Text style={styles.secondaryBtnText}>Indietro</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.primaryBtn, styles.btnFlex]} onPress={handleCreateLeague}>
                                        <CheckCircle2 size={20} color="#fff" style={{ marginRight: 10 }} />
                                        <Text style={styles.primaryBtnText}>Crea</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* ═══════ JOIN MODE ═══════ */}
                {mode === 'join' && (
                    <View style={styles.formCard}>
                        <View style={styles.formHeaderRow}>
                            <Text style={styles.wizardTitle}>Unisciti</Text>
                            <TouchableOpacity onPress={() => setMode('list')} style={styles.backLink}>
                                <ChevronRight size={16} color="#38bdf8" style={{ transform: [{ rotate: '180deg' }] }} />
                                <Text style={styles.backLinkText}>Indietro</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.joinInputBox}>
                            <Text style={styles.label}>Codice Invito</Text>
                            <TextInput
                                style={styles.joinInput}
                                placeholder="ABCDEF"
                                placeholderTextColor="rgba(255,255,255,0.1)"
                                value={joinCode}
                                onChangeText={setJoinCode}
                                maxLength={6}
                                autoCapitalize="characters"
                            />
                            <Text style={styles.hintText}>Inserisci il codice di 6 caratteri ricevuto dall'amministratore.</Text>
                        </View>

                        <TouchableOpacity style={styles.primaryBtn} onPress={handleJoinLeague}>
                            <LogIn size={20} color="#fff" style={{ marginRight: 10 }} />
                            <Text style={styles.primaryBtnText}>Partecipa al Torneo</Text>
                        </TouchableOpacity>
                    </View>
                )}
                </ScrollView>
            </KeyboardAvoidingView>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 25 },
    headerSubtitle: { color: '#64748b', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    headerTitle: { fontSize: 32, fontWeight: '900', color: '#f8fafc', letterSpacing: -1 },
    logoutBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(239, 68, 68, 0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.1)' },
    content: { padding: 16, paddingBottom: 60 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginLeft: 4 },
    sectionTitle: { fontSize: 20, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
    emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255, 255, 255, 0.02)', borderRadius: 30, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    emptyText: { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 15, paddingHorizontal: 20 },
    leagueCard: { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 20, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    leagueIconBox: { width: 48, height: 48, borderRadius: 15, backgroundColor: 'rgba(56, 189, 248, 0.05)', alignItems: 'center', justifyContent: 'center' },
    leagueName: { fontSize: 18, fontWeight: '900', color: '#f8fafc', marginBottom: 4 },
    leagueMeta: { flexDirection: 'row', alignItems: 'center' },
    leagueRoleBadge: { color: '#38bdf8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
    seriesNameText: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginLeft: 6 },
    actionsBox: { marginTop: 20, gap: 12 },
    primaryBtn: { backgroundColor: '#38bdf8', padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    secondaryBtn: { backgroundColor: 'rgba(56, 189, 248, 0.05)', padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)' },
    secondaryBtnText: { color: '#38bdf8', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    manageBtn: { backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
    manageBtnText: { color: '#64748b', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    formCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 30, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    formHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    wizardTitle: { fontSize: 24, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
    stepBadge: { backgroundColor: 'rgba(56, 189, 248, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    stepBadgeText: { color: '#38bdf8', fontSize: 12, fontWeight: '900', textTransform: 'uppercase' },
    backLink: { flexDirection: 'row', alignItems: 'center' },
    backLinkText: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
    helpText: { color: '#94a3b8', fontSize: 14, marginBottom: 25, fontWeight: '500' },
    manageRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    manageName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    manageRoleLabel: { color: '#64748b', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
    manageActions: { flexDirection: 'row', gap: 10 },
    miniActionBtn: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    manageBtnToggle: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center' },
    manageBtnShow: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
    label: { color: '#f8fafc', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    input: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, padding: 15, color: '#f8fafc', fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    dashedBox: { padding: 20, borderRadius: 20, backgroundColor: 'rgba(56, 189, 248, 0.02)', borderStyle: 'dashed', borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.2)', marginBottom: 20 },
    optionalTag: { color: '#64748b', fontSize: 10, fontWeight: 'normal' },
    hintText: { color: '#94a3b8', fontSize: 12, lineHeight: 18, marginTop: 4 },
    progressBar: { flexDirection: 'row', gap: 6, marginBottom: 30 },
    progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.05)' },
    progressSegmentActive: { backgroundColor: '#38bdf8' },
    sportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
    sportCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    sportCardActive: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.05)' },
    sportEmoji: { fontSize: 24, marginBottom: 8 },
    sportLabel: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
    btnRow: { flexDirection: 'row', gap: 12, marginTop: 20 },
    btnFlex: { flex: 1 },
    typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 30 },
    typeCard: { flex: 1, minWidth: '45%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    typeCardActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.05)' },
    typeEmoji: { fontSize: 24, marginBottom: 10 },
    typeLabel: { color: '#f8fafc', fontSize: 14, fontWeight: '900', marginBottom: 4 },
    typeDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18 },
    configBox: { backgroundColor: 'rgba(255,255,255,0.02)', padding: 20, borderRadius: 25, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    configTitle: { color: '#f8fafc', fontSize: 15, fontWeight: '900', marginBottom: 15 },
    configRow: { flexDirection: 'row', gap: 12, marginBottom: 15 },
    configLabel: { color: '#64748b', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
    configInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 12, color: '#f8fafc', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: '#475569', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    checkboxActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
    checkmark: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
    stageOption: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    stageOptionActive: { borderColor: 'rgba(251, 191, 36, 0.2)', backgroundColor: 'rgba(251, 191, 36, 0.05)' },
    stageOptionText: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold' },
    fantasyToggleBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(14, 165, 233, 0.05)', padding: 20, borderRadius: 25, marginBottom: 25, borderWidth: 1, borderColor: 'rgba(14, 165, 233, 0.1)' },
    fantasyRulesBox: { gap: 20 },
    rulesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    ruleItem: { flex: 1, minWidth: '30%', backgroundColor: 'rgba(255,255,255,0.02)', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    ruleLabel: { color: '#64748b', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8 },
    ruleInput: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold', padding: 0 },
    miniToggle: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
    miniToggleActive: { backgroundColor: 'rgba(14, 165, 233, 0.1)' },
    miniToggleText: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8' },
    customRolesSection: { marginTop: 10, padding: 20, backgroundColor: 'rgba(251, 191, 36, 0.02)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.05)' },
    customRoleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    roleColorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
    joinInputBox: { marginBottom: 30 },
    joinInput: { fontSize: 40, fontWeight: '900', color: '#38bdf8', textAlign: 'center', letterSpacing: 10, paddingVertical: 20, textTransform: 'uppercase' }
});
