import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, KeyboardAvoidingView } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store';
import { handleError, showSuccess } from '../lib/error-handler';
import { Timer, Sparkles, Settings as SettingsIcon, Calculator, Trash2, Edit3, Search, ChevronRight, Info, Users } from 'lucide-react-native';

export default function FantasyAdminScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const updateLeague = useStore(state => state.updateLeague);
    const activeLeagueId = useStore(state => state.activeLeagueId);
    const league = leagues.find(l => l.id === activeLeagueId);
    const leagueId = league?.id || '';
    const currentUser = useStore((state) => state.currentUser);
    const showNotification = useStore(state => state.showNotification);

    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);
    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const fantasyLineups = useStore(state => state.fantasyLineups);
    const updateMatch = useStore(state => state.updateMatch);
    const updateFantasyTeam = useStore(state => state.updateFantasyTeam);
    const addPlayerBonus = useStore(state => state.addPlayerBonus);
    const deletePlayerBonus = useStore(state => state.deletePlayerBonus);
    const playerBonuses = useStore(state => state.playerBonuses);
    const updateFantasyLineup = useStore(state => state.updateFantasyLineup);
    const deleteFantasyLineup = useStore(state => state.deleteFantasyLineup);
    const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const users = useStore(state => state.users);

    const [activeTab, setActiveTab] = useState<'matchdays' | 'calc' | 'bonus' | 'settings' | 'lineups'>('matchdays');

    const [selectedFantasyTeam, setSelectedFantasyTeam] = useState('');
    const [bonusPoints, setBonusPoints] = useState('');
    const [selPlayerId, setSelPlayerId] = useState('');
    const [pBonusDesc, setPBonusDesc] = useState('');
    const [pBonusVal, setPBonusVal] = useState('');
    const [pBonusMatchday, setPBonusMatchday] = useState('1');
    const [newDefName, setNewDefName] = useState('');
    const [newDefValue, setNewDefValue] = useState('');
    const [bonusSubTab, setBonusSubTab] = useState<'create' | 'assign' | 'view'>('assign');
    const [selectedBonusDefId, setSelectedBonusDefId] = useState('');
    const [newDefTarget, setNewDefTarget] = useState<'player' | 'team' | 'both'>('player');

    const [searchTeamObj, setSearchTeamObj] = useState('');
    const [searchPlayerObj, setSearchPlayerObj] = useState('');

    const [tempDeadlineDate, setTempDeadlineDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempMatchdayInput, setTempMatchdayInput] = useState('1');

    const [selectedLineups, setSelectedLineups] = useState<string[]>([]);

    const [customBonuses, setCustomBonuses] = useState(league?.settings?.customBonus || {
        goal: 3, assist: 1, yellowCard: -0.5, redCard: -1, ownGoal: -2, mvp: 1, cleanSheet: 1
    });
    const [categoryBonuses, setCategoryBonuses] = useState<Record<string, Record<string, number>>>(league?.settings?.categoryBonuses || {});

    if (!league || !isAdmin) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const isVariable = league.settings.rosterType === 'variable';

    const toggleMatchFantasyStatus = (matchId: string) => {
        const match = matches.find(m => m.id === matchId);
        if (match) {
            updateMatch({ ...match, isFantasyMatchday: !match.isFantasyMatchday });
        }
    };

    const handleApplyBonus = () => {
        if (!selectedFantasyTeam) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Seleziona una squadra fantasy'
            });
            return;
        }
        const points = parseFloat(bonusPoints);
        if (isNaN(points)) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Inserisci un valore numerico per i punti'
            });
            return;
        }

        const ft = fantasyTeams.find(f => f.id === selectedFantasyTeam);
        if (ft) {
            updateFantasyTeam({ ...ft, manualPointsAdjustment: (ft.manualPointsAdjustment || 0) + points });
            showNotification({
                type: 'success',
                title: 'Successo',
                message: `Bonus di ${points} pt applicato a ${ft.name}`
            });
        }
        setBonusPoints('');
        setSelectedFantasyTeam('');
    };

    const handleApplyPlayerBonus = () => {
        if (!selPlayerId) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Seleziona un calciatore'
            });
            return;
        }
        const points = parseFloat(pBonusVal);
        if (isNaN(points)) {
            showNotification({
                type: 'error',
                title: 'Errore',
                message: 'Inserisci un valore numerico'
            });
            return;
        }

        addPlayerBonus({
            id: uuidv4(),
            leagueId,
            playerId: selPlayerId,
            matchday: parseInt(pBonusMatchday) || 1,
            value: points,
            description: pBonusDesc.trim() || 'Bonus manuale',
            type: 'extra'
        });

        setSelPlayerId('');
        setPBonusDesc('');
        setPBonusVal('');
        showNotification({
            type: 'success',
            title: 'Successo',
            message: 'Bonus calciatore applicato!'
        });
    };

    const handleCreateBonusDefinition = () => {
        if (!newDefName.trim() || !newDefValue) return;
        const val = parseFloat(newDefValue);
        if (isNaN(val)) return;

        const newDef = { id: uuidv4(), name: newDefName.trim(), value: val, target: newDefTarget };
        const updatedDefinitions = [...(league.settings.customBonusDefinitions || []), newDef];

        updateLeague({
            ...league,
            settings: { ...league.settings, customBonusDefinitions: updatedDefinitions }
        });

        setNewDefName('');
        setNewDefValue('');
        showNotification({ type: 'success', title: 'Creato', message: `Tipo Bonus "${newDef.name}" creato!` });
    };

    const handleDeleteBonusDefinition = (id: string) => {
        const updatedDefinitions = (league.settings.customBonusDefinitions || []).filter(d => d.id !== id);
        updateLeague({
            ...league,
            settings: { ...league.settings, customBonusDefinitions: updatedDefinitions }
        });
    };

    const handleAssignBonusToPlayer = (playerId: string) => {
        if (!selectedBonusDefId) {
            showNotification({ type: 'error', title: 'Errore', message: 'Seleziona prima un tipo di bonus' });
            return;
        }
        const def = league.settings.customBonusDefinitions?.find(d => d.id === selectedBonusDefId);
        if (!def) return;

        addPlayerBonus({
            id: uuidv4(),
            leagueId,
            playerId,
            matchday: parseInt(pBonusMatchday) || 1,
            value: def.value,
            description: def.name,
            type: 'extra'
        });

        showNotification({ type: 'success', title: 'Assegnato', message: `Bonus "${def.name}" assegnato!` });
    };

    const handleAssignBonusToTeam = (teamId: string) => {
        if (!selectedBonusDefId) {
            showNotification({ type: 'error', title: 'Errore', message: 'Seleziona prima un tipo di bonus' });
            return;
        }
        const def = league.settings.customBonusDefinitions?.find(d => d.id === selectedBonusDefId);
        if (!def) return;

        const newAssignment = { id: uuidv4(), teamId, definitionId: selectedBonusDefId, matchday: parseInt(pBonusMatchday) || 1 };
        const updatedAssignments = [...(league.settings.teamBonusAssignments || []), newAssignment];

        updateLeague({
            ...league,
            settings: { ...league.settings, teamBonusAssignments: updatedAssignments }
        });

        showNotification({ type: 'success', title: 'Assegnato', message: `Bonus "${def.name}" assegnato alla squadra!` });
    };

    const handleDeleteTeamBonus = (assignmentId: string) => {
        const updatedAssignments = (league.settings.teamBonusAssignments || []).filter(a => a.id !== assignmentId);
        updateLeague({
            ...league,
            settings: { ...league.settings, teamBonusAssignments: updatedAssignments }
        });
    };

    const handleSaveScoringRules = () => {
        updateLeague({
            ...league,
            settings: {
                ...league.settings,
                customBonus: customBonuses,
                categoryBonuses: categoryBonuses
            }
        });
        showNotification({
            type: 'success',
            title: 'Successo',
            message: 'Regole di punteggio salvate!'
        });
    };

    const calculateMatchday = () => {
        showNotification({
            type: 'confirm',
            title: 'Conferma Calcolo',
            message: 'Vuoi calcolare la giornata basandoti sui voti base (calcolati automaticamente o inseriti) e gli eventi?',
            actions: [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Calcola 🚀',
                    style: 'default',
                    onPress: () => {
                        let fantasyMatchdays = matches.filter(m => m.isFantasyMatchday);
                        if (!isVariable) {
                            fantasyMatchdays = matches.filter(m => m.status === 'finished' && !m.played);
                        }

                        if (fantasyMatchdays.length === 0) {
                            showNotification({
                                type: 'error',
                                title: 'Errore',
                                message: 'Nessuna partita valida per il calcolo trovata.'
                            });
                            return;
                        }

                        const playerScores = new Map<string, number>();
                        const playerDetails = new Map<string, any>();

                        fantasyMatchdays.forEach(match => {
                            const matchPlayers = useStore.getState().players.filter(p => p.realTeamId === match.homeTeamId || p.realTeamId === match.awayTeamId);

                            matchPlayers.forEach(player => {
                                let baseVote = 0;
                                if (league?.settings.baseVoteType === 'manual') {
                                    baseVote = match.playerVotes?.[player.id] || 0;
                                } else {
                                    const isHome = player.realTeamId === match.homeTeamId;
                                    const diff = isHome ? (match.homeScore - match.awayScore) : (match.awayScore - match.homeScore);
                                    const bands = league?.settings.autoVoteBands || [];
                                    const matchedBand = bands.find(b => diff >= b.minDiff && diff <= b.maxDiff);
                                    baseVote = matchedBand ? matchedBand.points : 6;
                                }

                                if (baseVote > 0) {
                                    let totalPlayerPoints = baseVote;
                                    const eventsList: { type: string, value: number }[] = [];
                                    const playerEvents = match.events.filter(e => e.playerId === player.id);

                                    const playerObj = useStore.getState().players.find(p => p.id === player.id);
                                    const category = playerObj?.position || 'normale';

                                    playerEvents.forEach(ev => {
                                        let val = 0;
                                        const type = ev.type;

                                        // Try to get category-specific bonus first
                                        if (league?.settings.categoryBonuses?.[type]?.[category] !== undefined) {
                                            val = league.settings.categoryBonuses[type][category];
                                        } else {
                                            // Fallback to default
                                            if (type === 'goal') val = (league?.settings.customBonus?.goal ?? 3);
                                            if (type === 'assist') val = (league?.settings.customBonus?.assist ?? 1);
                                            if (type === 'yellow_card') val = -Math.abs(league?.settings.customBonus?.yellowCard ?? 0.5);
                                            if (type === 'red_card') val = -Math.abs(league?.settings.customBonus?.redCard ?? 1);
                                            if (type === 'own_goal') val = -Math.abs(league?.settings.customBonus?.ownGoal ?? 2);
                                            if (type === 'mvp') val = (league?.settings.customBonus?.mvp ?? 1);
                                            if (type === 'clean_sheet') val = (league?.settings.customBonus?.cleanSheet ?? 1);
                                        }

                                        if (val !== 0) {
                                            totalPlayerPoints += val;
                                            eventsList.push({ type: ev.type, value: val });
                                        }
                                    });

                                    const pBonuses = useStore.getState().playerBonuses.filter(b =>
                                        b.playerId === player.id &&
                                        (b.matchId === match.id || b.matchday === match.matchday)
                                    );
                                    const manualList = pBonuses.map(b => ({ description: b.description, value: b.value }));
                                    const extraPoints = manualList.reduce((sum, b) => sum + b.value, 0);
                                    totalPlayerPoints += extraPoints;

                                    playerScores.set(player.id, totalPlayerPoints);
                                    playerDetails.set(player.id, {
                                        baseVote,
                                        events: eventsList,
                                        manualBonuses: manualList,
                                        total: totalPlayerPoints
                                    });
                                }
                            });
                        });

                        const currentMatchday = fantasyMatchdays[0].matchday;
                        const stateLineups = useStore.getState().fantasyLineups;

                        const updatePromises = fantasyTeams.map(async ft => {
                            const lineup = stateLineups.find(l => l.fantasyTeamId === ft.id && l.matchday === currentMatchday);
                            if (lineup) {
                                let teamMatchdayPoints = 0;
                                const playerPointsToSave: Record<string, number> = {};
                                const playerDetailsToSave: Record<string, any> = {};
                                let availableBench = [...(lineup.bench || [])];

                                Object.values(lineup.starters).forEach(playerId => {
                                    let pts = 0;
                                    let scorerId: string | null = playerId;

                                    if (playerId && playerScores.has(playerId)) {
                                        pts = playerScores.get(playerId)!;
                                    } else if (playerId) {
                                        const starterPos = useStore.getState().players.find(p => p.id === playerId)?.position;
                                        const subIndex = availableBench.findIndex(benchId => playerScores.has(benchId) && useStore.getState().players.find(p => p.id === benchId)?.position === starterPos);
                                        if (subIndex !== -1) {
                                            scorerId = availableBench[subIndex];
                                            pts = playerScores.get(scorerId)!;
                                            availableBench.splice(subIndex, 1);
                                        }
                                    }

                                    if (scorerId && playerDetails.has(scorerId)) {
                                        teamMatchdayPoints += pts;
                                        // Save under the STARTER's ID so UI can find it easily
                                        playerPointsToSave[playerId] = pts;
                                        playerDetailsToSave[playerId] = playerDetails.get(scorerId);
                                    }
                                });

                                const teamAssignments = (league.settings.teamBonusAssignments || []).filter(a => a.teamId === ft.id && a.matchday === currentMatchday);
                                let structuredTeamBonus = 0;
                                teamAssignments.forEach(a => {
                                    const def = league.settings.customBonusDefinitions?.find(d => d.id === a.definitionId);
                                    if (def) structuredTeamBonus += def.value;
                                });

                                const finalLineupPoints = teamMatchdayPoints + structuredTeamBonus;

                                // Aggiunta Punti Pronostici
                                let predictionPoints = 0;
                                if (league.settings.predictionsEnabled) {
                                    fantasyMatchdays.forEach(match => {
                                        const pred = useStore.getState().predictions.find(p => p.fantasyTeamId === ft.id && p.matchId === match.id);
                                        if (pred) {
                                            const actualHome = match.homeScore;
                                            const actualAway = match.awayScore;
                                            const predHome = pred.homeScore;
                                            const predAway = pred.awayScore;

                                            // Risultato Esatto
                                            if (actualHome === predHome && actualAway === predAway) {
                                                predictionPoints += (league.settings.predictionPointsExact || 0);
                                            } else {
                                                // Solo Esito (1X2)
                                                const actualDiff = actualHome - actualAway;
                                                const predDiff = predHome - predAway;
                                                if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
                                                    predictionPoints += (league.settings.predictionPointsOutcome || 0);
                                                }
                                            }
                                        }
                                    });
                                }

                                const finalTotalMatchdayPoints = finalLineupPoints + predictionPoints;

                                await updateFantasyLineup({
                                    ...lineup,
                                    points: finalTotalMatchdayPoints,
                                    playerPoints: playerPointsToSave,
                                    playerPointsDetails: playerDetailsToSave
                                });

                                const updatedMatchdayPoints = { ...(ft.matchdayPoints || {}), [currentMatchday]: finalTotalMatchdayPoints };
                                const newTotal = Object.values(updatedMatchdayPoints).reduce((a, b) => (a as number) + (b as number), 0) + (ft.manualPointsAdjustment || 0);

                                await updateFantasyTeam({
                                    ...ft,
                                    matchdayPoints: updatedMatchdayPoints,
                                    totalPoints: newTotal
                                });
                            }
                        });

                        const matchPromises = fantasyMatchdays.map(m =>
                            updateMatch({ ...m, isFantasyMatchday: false, played: true })
                        );

                        Promise.all([...updatePromises, ...matchPromises]).then(() => {
                            showNotification({
                                type: 'success',
                                title: 'Fantacalcio Completato',
                                message: 'Giornata calcolata con successo!'
                            });
                        }).catch(err => {
                            handleError(err, 'Errore Calcolo Giornata');
                        });
                    }
                }
            ]
        });
    };

    const updateFixedRosterClassifica = () => {
        showNotification({
            type: 'confirm',
            title: 'Aggiorna Classifica',
            message: 'Ricalcola i punti totali cumulativi per tutte le fantasquadre con formazione fissa, usando tutte le partite terminate.',
            actions: [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Aggiorna 🔄',
                    style: 'default',
                    onPress: () => {
                        const validMatches = matches.filter(m => m.status === 'finished');
                        if (validMatches.length === 0) {
                            showNotification({
                                type: 'error',
                                title: 'Errore',
                                message: 'Nessuna partita terminata trovata.'
                            });
                            return;
                        }

                        const playerScores = new Map<string, number>();
                        const playerDetails = new Map<string, any>();
                        validMatches.forEach(match => {
                            const matchPlayers = useStore.getState().players.filter(p => p.realTeamId === match.homeTeamId || p.realTeamId === match.awayTeamId);
                            matchPlayers.forEach(player => {
                                let baseVote = 0;
                                if (league.settings.baseVoteType === 'manual') {
                                    baseVote = match.playerVotes?.[player.id] || 0;
                                } else {
                                    const isHome = player.realTeamId === match.homeTeamId;
                                    const diff = isHome ? (match.homeScore - match.awayScore) : (match.awayScore - match.homeScore);
                                    const bands = league.settings.autoVoteBands || [];
                                    const matchedBand = bands.find(b => diff >= b.minDiff && diff <= b.maxDiff);
                                    baseVote = matchedBand ? matchedBand.points : 6;
                                }

                                if (baseVote > 0) {
                                    let pts = baseVote;
                                    const matchEventsList: { type: string, value: number }[] = [];
                                    const playerObj = useStore.getState().players.find(p => p.id === player.id);
                                    const category = playerObj?.position || 'normale';

                                    match.events.filter(e => e.playerId === player.id).forEach(ev => {
                                        let val = 0;
                                        const type = ev.type;

                                        // Try to get category-specific bonus first
                                        if (league.settings.categoryBonuses?.[type]?.[category] !== undefined) {
                                            val = league.settings.categoryBonuses[type][category];
                                        } else {
                                            if (type === 'goal') val = (league.settings.customBonus?.goal ?? 3);
                                            if (type === 'assist') val = (league.settings.customBonus?.assist ?? 1);
                                            if (type === 'yellow_card') val = -Math.abs(league.settings.customBonus?.yellowCard ?? 0.5);
                                            if (type === 'red_card') val = -Math.abs(league.settings.customBonus?.redCard ?? 1);
                                            if (type === 'own_goal') val = -Math.abs(league.settings.customBonus?.ownGoal ?? 2);
                                            if (type === 'mvp') val = (league.settings.customBonus?.mvp ?? 1);
                                            if (type === 'clean_sheet') val = (league.settings.customBonus?.cleanSheet ?? 1);
                                        }
                                        if (val !== 0) {
                                            pts += val;
                                            matchEventsList.push({ type: ev.type, value: val });
                                        }
                                    });

                                    const pBonuses = useStore.getState().playerBonuses
                                        .filter(b => b.playerId === player.id && (b.matchId === match.id || b.matchday === match.matchday));
                                    const manualList = pBonuses.map(b => ({ description: b.description, value: b.value }));
                                    const extraPts = manualList.reduce((s, b) => s + b.value, 0);

                                    pts += extraPts;
                                    playerScores.set(player.id, (playerScores.get(player.id) || 0) + pts);

                                    const existingDetail = playerDetails.get(player.id) || { baseVote: 0, events: [], manualBonuses: [], total: 0 };
                                    playerDetails.set(player.id, {
                                        baseVote: existingDetail.baseVote + baseVote,
                                        events: [...existingDetail.events, ...matchEventsList],
                                        manualBonuses: [...existingDetail.manualBonuses, ...manualList],
                                        total: existingDetail.total + pts
                                    });
                                }
                            });
                        });

                        const stateLineups = useStore.getState().fantasyLineups;
                        const updatePromises = fantasyTeams.map(async ft => {
                            const lineup = stateLineups.find(l => l.fantasyTeamId === ft.id);
                            let total = ft.manualPointsAdjustment || 0;
                            const playerPointsToSave: Record<string, number> = {};
                            const playerDetailsToSave: Record<string, any> = {};

                            if (lineup) {
                                let bench = [...(lineup.bench || [])];
                                Object.values(lineup.starters).forEach(playerId => {
                                    let pts = 0;
                                    let scorerId: string | null = playerId;

                                    if (playerId && playerScores.has(playerId)) {
                                        pts = playerScores.get(playerId)!;
                                    } else if (playerId) {
                                        const pos = useStore.getState().players.find(p => p.id === playerId)?.position;
                                        const subIdx = bench.findIndex(bid => playerScores.has(bid) && useStore.getState().players.find(p => p.id === bid)?.position === pos);
                                        if (subIdx !== -1) {
                                            scorerId = bench[subIdx];
                                            pts = playerScores.get(scorerId)!;
                                            bench.splice(subIdx, 1);
                                        }
                                    }

                                    if (scorerId && playerDetails.has(scorerId)) {
                                        total += pts;
                                        // Save under the STARTER's ID
                                        playerPointsToSave[playerId] = pts;
                                        playerDetailsToSave[playerId] = playerDetails.get(scorerId);
                                    }
                                });

                                // Aggiunta Bonus Strutturati Squadra (Fissi)
                                const teamAssignments = (league.settings.teamBonusAssignments || []).filter(a => a.teamId === ft.id);
                                teamAssignments.forEach(a => {
                                    const def = league.settings.customBonusDefinitions?.find(d => d.id === a.definitionId);
                                    if (def) total += def.value;
                                });

                                // Aggiunta Punti Pronostici (Fissi)
                                if (league.settings.predictionsEnabled) {
                                    validMatches.forEach(match => {
                                        const pred = useStore.getState().predictions.find(p => p.fantasyTeamId === ft.id && p.matchId === match.id);
                                        if (pred) {
                                            const actualHome = match.homeScore;
                                            const actualAway = match.awayScore;
                                            const predHome = pred.homeScore;
                                            const predAway = pred.awayScore;

                                            if (actualHome === predHome && actualAway === predAway) {
                                                total += (league.settings.predictionPointsExact || 0);
                                            } else {
                                                const actualDiff = actualHome - actualAway;
                                                const predDiff = predHome - predAway;
                                                if ((actualDiff > 0 && predDiff > 0) || (actualDiff < 0 && predDiff < 0) || (actualDiff === 0 && predDiff === 0)) {
                                                    total += (league.settings.predictionPointsOutcome || 0);
                                                }
                                            }
                                        }
                                    });
                                }

                                const finalPoints = total - (ft.manualPointsAdjustment || 0);
                                await updateFantasyLineup({
                                    ...lineup,
                                    points: finalPoints,
                                    playerPoints: playerPointsToSave,
                                    playerPointsDetails: playerDetailsToSave
                                });

                                const updatedMatchdayPoints = { ...(ft.matchdayPoints || {}), [lineup.matchday]: finalPoints };
                                await updateFantasyTeam({
                                    ...ft,
                                    totalPoints: total,
                                    matchdayPoints: updatedMatchdayPoints
                                });
                            }
                        });

                        Promise.all(updatePromises).then(() => {
                            showNotification({
                                type: 'success',
                                title: 'Classifica Aggiornata ✅',
                                message: 'I punti totali cumulativi sono stati ricalcolati.'
                            });
                        });
                    }
                }
            ]
        });
    };

    const recalculateAllTournament = async () => {
        showNotification({
            type: 'confirm',
            title: 'Ricalcolo Totale',
            message: 'Vuoi ricalcolare i punti totali di tutte le squadre partendo dalle formazioni e dai bonus salvati? Questa operazione pulirà eventuali errori di calcolo dovuti a cancellazioni.',
            actions: [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Ricalcola Tutto 🛠️',
                    style: 'default',
                    onPress: async () => {
                        useStore.getState().setLoading(true);
                        try {
                            // 1. Forziamo il Sync per essere sicuri di avere i dati reali dal DB
                            await useStore.getState().syncAllData();

                            const stateLineups = useStore.getState().fantasyLineups.filter(l => l.points !== undefined);
                            const stateTeams = useStore.getState().fantasyTeams.filter(t => t.leagueId === leagueId);
                            const currentLeague = useStore.getState().leagues.find(l => l.id === leagueId);

                            if (!currentLeague) throw new Error('Torneo non trovato');

                            for (const team of stateTeams) {
                                const teamLineups = stateLineups.filter(l => l.fantasyTeamId === team.id);
                                const newMatchdayPoints: Record<number, number> = {};

                                // Reset matchday points from actual lineups
                                // Note: lineup.points already includes structured bonuses and predictions
                                teamLineups.forEach(l => {
                                    newMatchdayPoints[l.matchday] = l.points || 0;
                                });

                                // Calculate new total including updated manual adjustment
                                const newTotal = Object.values(newMatchdayPoints).reduce((a, b) => (a as number) + (b as number), 0) + (team.manualPointsAdjustment || 0);

                                await updateFantasyTeam({
                                    ...team,
                                    totalPoints: newTotal,
                                    matchdayPoints: newMatchdayPoints
                                });
                            }

                            showNotification({
                                type: 'success',
                                title: 'Completato',
                                message: 'Tutte le classifiche sono state ricalcolate e allineate.'
                            });
                        } catch (err) {
                            handleError(err, 'Ricalcolo Totale');
                        } finally {
                            useStore.getState().setLoading(false);
                        }
                    }
                }
            ]
        });
    };

    const toggleLineupSelection = (id: string) => {
        if (selectedLineups.includes(id)) setSelectedLineups(selectedLineups.filter(x => x !== id));
        else setSelectedLineups([...selectedLineups, id]);
    };

    const handleDeleteSelectedLineups = () => {
        if (selectedLineups.length === 0) return;
        showNotification({
            type: 'confirm',
            title: 'Conferma Eliminazione',
            message: `Vuoi eliminare le ${selectedLineups.length} formazioni?`,
            actions: [
                { text: 'Annulla', style: 'cancel' },
                {
                    text: 'Elimina 🗑️',
                    style: 'destructive',
                    onPress: async () => {
                        for (const id of selectedLineups) await deleteFantasyLineup(id);
                        setSelectedLineups([]);
                        showNotification({
                            type: 'success',
                            title: 'Successo',
                            message: 'Eliminate!'
                        });
                    }
                }]
        });
    };

    const filteredTeams = fantasyTeams.filter(t => t.name.toLowerCase().includes(searchTeamObj.toLowerCase()) || users.find(u => u.id === t.userId)?.lastName?.toLowerCase().includes(searchTeamObj.toLowerCase()));
    const filteredPlayers = players.filter(p => p.name.toLowerCase().includes(searchPlayerObj.toLowerCase()));

    const currentViewMatchday = isVariable ? (parseInt(tempMatchdayInput) || 1) : 1;
    const lineupsToManage = fantasyLineups.filter(l => l.matchday === currentViewMatchday);

    const renderTab = (id: typeof activeTab, label: string, Icon: any) => (
        <TouchableOpacity style={[styles.tabBtn, activeTab === id && styles.tabBtnActive]} onPress={() => setActiveTab(id)}>
            <Icon size={16} color={activeTab === id ? '#fbbf24' : '#94a3b8'} />
            <Text style={[styles.tabText, activeTab === id && styles.tabTextActive]}>{label}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.title}>Gestione Fantasy</Text>
                <Text style={styles.subtitle}>Configura e calcola i punteggi</Text>
            </View>

            <View style={styles.tabsWrapper}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContainer}>
                    {renderTab('matchdays', 'Timer', Timer)}
                    {renderTab('lineups', 'Formazioni', ChevronRight)}
                    {renderTab('bonus', 'Bonus', Sparkles)}
                    {renderTab('settings', 'Settings', SettingsIcon)}
                    {renderTab('calc', 'Calcolo', Calculator)}
                </ScrollView>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
            >
                <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    {activeTab === 'matchdays' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Timer color="#fbbf24" size={24} />
                                <Text style={styles.cardTitle}>{isVariable ? 'Scadenze Giornate' : 'Scadenza Mercato'}</Text>
                            </View>
                            <Text style={styles.helpText}>{isVariable ? 'Imposta la scadenza per ogni singola giornata.' : 'Imposta la scadenza unica del mercato (Rose Fisse).'}</Text>

                            {isVariable && (
                                <View style={styles.row}>
                                    <View style={{ flex: 1, marginRight: 12 }}>
                                        <Text style={styles.label}>Giornata:</Text>
                                        <TextInput style={styles.input} keyboardType="numeric" value={tempMatchdayInput} onChangeText={setTempMatchdayInput} />
                                    </View>
                                </View>
                            )}

                            <View style={{ marginBottom: 20 }}>
                                <Text style={styles.label}>Data e Ora Scadenza:</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity
                                        style={[styles.input, { flex: 2, justifyContent: 'center', marginBottom: 0 }]}
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: tempDeadlineDate ? '#f8fafc' : '#64748b', fontSize: 15 }}>
                                            {tempDeadlineDate ? tempDeadlineDate.toLocaleDateString('it-IT') : 'Seleziona Data'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.input, { flex: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 0 }]}
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Text style={{ color: tempDeadlineDate ? '#f8fafc' : '#64748b', fontSize: 15 }}>
                                            {tempDeadlineDate ? tempDeadlineDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'Ora'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.primaryBtn, !tempDeadlineDate && { opacity: 0.6 }]}
                                disabled={!tempDeadlineDate}
                                onPress={() => {
                                    if (!tempDeadlineDate) return;
                                    const updatedSettings = { ...league.settings };
                                    if (isVariable) {
                                        const md = parseInt(tempMatchdayInput);
                                        updatedSettings.matchdayDeadlines = { ...(updatedSettings.matchdayDeadlines || {}), [md]: tempDeadlineDate.toISOString() };
                                    } else {
                                        updatedSettings.fantasyMarketDeadline = tempDeadlineDate.toISOString();
                                    }
                                    updateLeague({ ...league, settings: updatedSettings });
                                    setTempDeadlineDate(null);
                                    showNotification({
                                        type: 'success',
                                        title: 'Successo',
                                        message: 'Scadenza aggiornata!'
                                    });
                                }}
                            >
                                <Text style={styles.primaryBtnText}>Salva Scadenza</Text>
                            </TouchableOpacity>

                            {isVariable && (
                                <View style={{ marginTop: 24 }}>
                                    <Text style={styles.sectionTitle}>Seleziona Partite della Giornata</Text>
                                    {matches.map(m => (
                                        <TouchableOpacity key={m.id} style={[styles.itemCard, m.isFantasyMatchday && styles.itemCardActive]} onPress={() => toggleMatchFantasyStatus(m.id)}>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.itemTitle}>G{m.matchday} | {m.homeTeamId} - {m.awayTeamId}</Text>
                                                <Text style={styles.itemSub}>{m.status}</Text>
                                            </View>
                                            <View style={[styles.checkbox, m.isFantasyMatchday && styles.checkboxActive]} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>
                    )}

                    {activeTab === 'lineups' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <ChevronRight color="#fbbf24" size={24} />
                                    <Text style={styles.cardTitle}>Lineup {isVariable ? `G${currentViewMatchday}` : 'Totali'}</Text>
                                </View>
                                {selectedLineups.length > 0 && (
                                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteSelectedLineups}>
                                        <Trash2 color="#ef4444" size={16} />
                                        <Text style={styles.deleteBtnText}>Elimina ({selectedLineups.length})</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            {isVariable && (
                                <View style={{ marginBottom: 16 }}>
                                    <Text style={styles.label}>Filtra per Giornata:</Text>
                                    <TextInput style={styles.input} keyboardType="numeric" value={tempMatchdayInput} onChangeText={setTempMatchdayInput} />
                                </View>
                            )}

                            {lineupsToManage.length === 0 && <Text style={styles.emptyText}>Nessuna formazione trovata.</Text>}
                            {lineupsToManage.map(l => {
                                const team = fantasyTeams.find(t => t.id === l.fantasyTeamId);
                                const isSelected = selectedLineups.includes(l.id);
                                return (
                                    <View key={l.id} style={[styles.itemCard, isSelected && styles.itemCardActive]}>
                                        <TouchableOpacity style={{ flex: 1, marginRight: 12 }} onPress={() => toggleLineupSelection(l.id)}>
                                            <Text style={styles.itemTitle} numberOfLines={1}>{team?.name}</Text>
                                            <Text style={styles.itemSub}>{users.find(u => u.id === team?.userId)?.lastName}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={styles.editBtn} onPress={() => navigation.navigate('Formation', { fantasyTeamId: team?.id })}>
                                            <Edit3 color="#38bdf8" size={18} />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    )}

                    {activeTab === 'bonus' && (
                        <View>
                            {/* SUB TABS BONUS */}
                            <View style={[styles.subTabsWrapper, { marginBottom: 16, flexWrap: 'wrap' }]}>
                                <TouchableOpacity style={[styles.subTabBtn, bonusSubTab === 'create' && styles.subTabBtnActive, { minWidth: '30%' }]} onPress={() => setBonusSubTab('create')}>
                                    <SettingsIcon size={14} color={bonusSubTab === 'create' ? '#fbbf24' : '#64748b'} style={{ marginRight: 6 }} />
                                    <Text style={[styles.subTabText, bonusSubTab === 'create' && styles.subTabTextActive]} numberOfLines={1}>Tipi Bonus</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.subTabBtn, bonusSubTab === 'assign' && styles.subTabBtnActive, { minWidth: '30%' }]} onPress={() => setBonusSubTab('assign')}>
                                    <Users size={14} color={bonusSubTab === 'assign' ? '#fbbf24' : '#64748b'} style={{ marginRight: 6 }} />
                                    <Text style={[styles.subTabText, bonusSubTab === 'assign' && styles.subTabTextActive]} numberOfLines={1}>Assegna</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.subTabBtn, bonusSubTab === 'view' && styles.subTabBtnActive, { minWidth: '33%' }]} onPress={() => setBonusSubTab('view')}>
                                    <Info size={14} color={bonusSubTab === 'view' ? '#fbbf24' : '#64748b'} style={{ marginRight: 6 }} />
                                    <Text style={[styles.subTabText, bonusSubTab === 'view' && styles.subTabTextActive]} numberOfLines={1}>Vista Bonus</Text>
                                </TouchableOpacity>
                            </View>

                            {bonusSubTab === 'create' && (
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <SettingsIcon color="#fbbf24" size={24} />
                                        <Text style={styles.cardTitle}>Gestione Tipi Bonus</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 15 }}>
                                        <TextInput
                                            style={[styles.input, { flex: 2 }]}
                                            placeholder="Nome (es. Clean Sheet)"
                                            placeholderTextColor="#64748b"
                                            value={newDefName}
                                            onChangeText={setNewDefName}
                                        />
                                        <TextInput
                                            style={[styles.input, { flex: 1 }]}
                                            placeholder="Valore"
                                            placeholderTextColor="#64748b"
                                            keyboardType="decimal-pad"
                                            value={newDefValue}
                                            onChangeText={setNewDefValue}
                                        />
                                    </View>

                                    <Text style={styles.label}>Target:</Text>
                                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                                        {(['player', 'team', 'both'] as const).map(t => (
                                            <TouchableOpacity
                                                key={t}
                                                style={[styles.miniChip, newDefTarget === t && styles.miniChipActive, { flex: 1, minWidth: '28%', alignItems: 'center' }]}
                                                onPress={() => setNewDefTarget(t)}
                                            >
                                                <Text style={styles.miniChipText} numberOfLines={1} adjustsFontSizeToFit>{t === 'player' ? 'Giocatore' : t === 'team' ? 'Squadra' : 'Entrambi'}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateBonusDefinition}>
                                        <Text style={styles.primaryBtnText}>Crea Nuovo Tipo</Text>
                                    </TouchableOpacity>

                                    <View style={{ marginTop: 24 }}>
                                        <Text style={styles.sectionTitle}>Tipi Creati</Text>
                                        {(league.settings.customBonusDefinitions || []).map(def => (
                                            <View key={def.id} style={styles.bonusListItem}>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.bonusListPlayer}>{def.name} <Text style={{ fontSize: 10, color: '#64748b' }}>({def.target === 'player' ? 'Giac.' : def.target === 'team' ? 'Squad.' : 'Entr.'})</Text></Text>
                                                    <Text style={styles.bonusListValue}>{def.value > 0 ? '+' : ''}{def.value} pt</Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleDeleteBonusDefinition(def.id)}>
                                                    <Trash2 size={18} color="#ef4444" />
                                                </TouchableOpacity>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {bonusSubTab === 'assign' && (
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Users color="#fbbf24" size={24} />
                                        <Text style={styles.cardTitle}>Assegna Bonus</Text>
                                    </View>

                                    <Text style={styles.label}>1. Seleziona Tipo Bonus:</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                                        {(league.settings.customBonusDefinitions || []).map(def => (
                                            <TouchableOpacity
                                                key={def.id}
                                                style={[styles.miniChip, selectedBonusDefId === def.id && styles.miniChipActive]}
                                                onPress={() => setSelectedBonusDefId(def.id)}
                                            >
                                                <Text style={styles.miniChipText}>{def.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {(league.settings.customBonusDefinitions || []).length === 0 && (
                                            <Text style={styles.emptyText}>Crea prima dei tipi bonus!</Text>
                                        )}
                                    </ScrollView>

                                    <View style={{ marginBottom: 15 }}>
                                        <Text style={styles.label}>2. Seleziona Giornata:</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={pBonusMatchday}
                                            onChangeText={setPBonusMatchday}
                                        />
                                    </View>

                                    {selectedBonusDefId && (
                                        <>
                                            {(() => {
                                                const def = league.settings.customBonusDefinitions?.find(d => d.id === selectedBonusDefId);
                                                const showPlayers = def?.target === 'player' || def?.target === 'both';
                                                const showTeams = def?.target === 'team' || def?.target === 'both';

                                                return (
                                                    <View>
                                                        {showPlayers && (
                                                            <View style={{ marginBottom: 20 }}>
                                                                <Text style={styles.label}>3. Cerca e Aggiungi Calciatori:</Text>
                                                                <TextInput
                                                                    style={styles.searchInput}
                                                                    placeholder="Cerca calciatore..."
                                                                    placeholderTextColor="#64748b"
                                                                    value={searchPlayerObj}
                                                                    onChangeText={setSearchPlayerObj}
                                                                />
                                                                <View style={{ marginTop: 10 }}>
                                                                    {searchPlayerObj.length >= 2 && players
                                                                        .filter(p => p.name.toLowerCase().includes(searchPlayerObj.toLowerCase()))
                                                                        .slice(0, 5)
                                                                        .map(p => (
                                                                            <TouchableOpacity
                                                                                key={p.id}
                                                                                style={styles.bonusListItem}
                                                                                onPress={() => handleAssignBonusToPlayer(p.id)}
                                                                            >
                                                                                <Text style={[styles.bonusListPlayer, { flex: 1 }]}>{p.name}</Text>
                                                                                <Text style={[styles.primaryBtnText, { color: '#fbbf24', fontSize: 12 }]}>AGGIUNGI +</Text>
                                                                            </TouchableOpacity>
                                                                        ))
                                                                    }
                                                                </View>
                                                            </View>
                                                        )}

                                                        {showTeams && (
                                                            <View style={{ marginBottom: 20 }}>
                                                                <Text style={styles.label}>{showPlayers ? '4.' : '3.'} Cerca e Aggiungi Squadre:</Text>
                                                                <TextInput
                                                                    style={styles.searchInput}
                                                                    placeholder="Cerca squadra..."
                                                                    placeholderTextColor="#64748b"
                                                                    value={searchTeamObj}
                                                                    onChangeText={setSearchTeamObj}
                                                                />
                                                                <View style={{ marginTop: 10 }}>
                                                                    {searchTeamObj.length >= 2 && fantasyTeams
                                                                        .filter(t => t.name.toLowerCase().includes(searchTeamObj.toLowerCase()))
                                                                        .slice(0, 5)
                                                                        .map(t => (
                                                                            <TouchableOpacity
                                                                                key={t.id}
                                                                                style={styles.bonusListItem}
                                                                                onPress={() => handleAssignBonusToTeam(t.id)}
                                                                            >
                                                                                <Text style={[styles.bonusListPlayer, { flex: 1 }]}>{t.name}</Text>
                                                                                <Text style={[styles.primaryBtnText, { color: '#38bdf8', fontSize: 12 }]}>AGGIUNGI +</Text>
                                                                            </TouchableOpacity>
                                                                        ))
                                                                    }
                                                                </View>
                                                            </View>
                                                        )}
                                                    </View>
                                                );
                                            })()}
                                        </>
                                    )}
                                </View>
                            )}

                            {bonusSubTab === 'view' && (
                                <View style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <Info color="#fbbf24" size={24} />
                                        <Text style={styles.cardTitle}>Vista Riepilogativa (G{pBonusMatchday})</Text>
                                    </View>

                                    <View style={{ marginBottom: 15 }}>
                                        <Text style={styles.label}>Filtra per Giornata:</Text>
                                        <TextInput
                                            style={styles.input}
                                            keyboardType="numeric"
                                            value={pBonusMatchday}
                                            onChangeText={setPBonusMatchday}
                                        />
                                    </View>

                                    {(league.settings.customBonusDefinitions || []).map(def => {
                                        const playerAssignments = playerBonuses.filter(b =>
                                            b.leagueId === leagueId &&
                                            b.description === def.name &&
                                            b.matchday === parseInt(pBonusMatchday)
                                        );

                                        const teamAssignments = (league.settings.teamBonusAssignments || []).filter(a =>
                                            a.definitionId === def.id &&
                                            a.matchday === parseInt(pBonusMatchday)
                                        );

                                        return (
                                            <View key={def.id} style={{ marginBottom: 20 }}>
                                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 5, marginBottom: 10 }}>
                                                    <Text style={{ color: '#fbbf24', fontWeight: 'bold', flex: 1, marginRight: 10 }} numberOfLines={1}>{def.name.toUpperCase()} ({def.value > 0 ? '+' : ''}{def.value}pt)</Text>
                                                    <Text style={{ color: '#64748b', fontSize: 10 }}>{def.target.toUpperCase()}</Text>
                                                </View>

                                                {/* Player Assignments */}
                                                {playerAssignments.map(b => {
                                                    const player = players.find(p => p.id === b.playerId);
                                                    return (
                                                        <View key={b.id} style={[styles.bonusListItem, { paddingVertical: 8, opacity: 0.9 }]}>
                                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fbbf24', marginRight: 8 }} />
                                                            <Text style={[styles.bonusListPlayer, { flex: 1, fontSize: 13 }]}>{player?.name || 'Sconosciuto'}</Text>
                                                            <TouchableOpacity onPress={() => deletePlayerBonus(b.id)}>
                                                                <Trash2 size={16} color="#ef4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })}

                                                {/* Team Assignments */}
                                                {teamAssignments.map(a => {
                                                    const team = fantasyTeams.find(t => t.id === a.teamId);
                                                    return (
                                                        <View key={a.id} style={[styles.bonusListItem, { paddingVertical: 8, opacity: 0.9, backgroundColor: 'rgba(56, 189, 248, 0.05)' }]}>
                                                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#38bdf8', marginRight: 8 }} />
                                                            <Text style={[styles.bonusListPlayer, { flex: 1, fontSize: 13, color: '#e0f2fe' }]}>{team?.name || 'Squadra Sconosciuta'}</Text>
                                                            <TouchableOpacity onPress={() => handleDeleteTeamBonus(a.id)}>
                                                                <Trash2 size={16} color="#ef4444" />
                                                            </TouchableOpacity>
                                                        </View>
                                                    );
                                                })}

                                                {playerAssignments.length === 0 && teamAssignments.length === 0 && (
                                                    <Text style={[styles.emptyText, { textAlign: 'left', fontStyle: 'italic', fontSize: 12 }]}>Nessuna assegnazione.</Text>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    )}

                    {activeTab === 'settings' && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <SettingsIcon color="#fbbf24" size={24} />
                                <Text style={styles.cardTitle}>Regolamento Punteggi</Text>
                            </View>
                            <View style={{ marginTop: 10 }}>
                                {Object.entries({
                                    goal: '⭐ GOL',
                                    assist: '👣 ASSIST',
                                    yellow_card: '▮ AMMONIZIONE',
                                    red_card: '▮ ESPULSIONE',
                                    own_goal: '❌ AUTOGOL',
                                    mvp: '🌟 MVP',
                                    clean_sheet: '🧤 CLEAN SHEET'
                                }).map(([bonusType, label]) => {
                                    const categories = league.settings.useCustomRoles
                                        ? (league.settings.customRoles?.map(r => r.name) || [])
                                        : ['POR', 'DIF', 'CEN', 'ATT'];

                                    return (
                                        <View key={bonusType} style={{ marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12 }}>
                                            <Text style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: 10 }}>{label}</Text>
                                            <View style={styles.settingsGrid}>
                                                <View style={styles.settingItem}>
                                                    <Text style={[styles.label, { fontSize: 10, color: '#64748b' }]}>DEFAULT</Text>
                                                    <TextInput
                                                        style={styles.input}
                                                        keyboardType="decimal-pad"
                                                        value={(customBonuses[
                                                            (bonusType === 'yellow_card' ? 'yellowCard' :
                                                                bonusType === 'red_card' ? 'redCard' :
                                                                    bonusType === 'own_goal' ? 'ownGoal' :
                                                                        bonusType === 'clean_sheet' ? 'cleanSheet' :
                                                                            bonusType) as keyof typeof customBonuses
                                                        ] || 0).toString()}
                                                        onChangeText={newV => {
                                                            const key = (bonusType === 'yellow_card' ? 'yellowCard' :
                                                                bonusType === 'red_card' ? 'redCard' :
                                                                    bonusType === 'own_goal' ? 'ownGoal' :
                                                                        bonusType === 'clean_sheet' ? 'cleanSheet' :
                                                                            bonusType) as keyof typeof customBonuses;
                                                            setCustomBonuses({ ...customBonuses, [key]: parseFloat(newV) || 0 });
                                                        }}
                                                    />
                                                </View>
                                                {categories.map(cat => (
                                                    <View key={cat} style={styles.settingItem}>
                                                        <Text style={[styles.label, { fontSize: 10, color: '#38bdf8' }]}>{cat.toUpperCase()}</Text>
                                                        <TextInput
                                                            style={styles.input}
                                                            keyboardType="decimal-pad"
                                                            placeholder="Default"
                                                            placeholderTextColor="#475569"
                                                            value={categoryBonuses[bonusType]?.[cat]?.toString() || ''}
                                                            onChangeText={newV => {
                                                                const newVal = newV === '' ? undefined : parseFloat(newV);
                                                                const newCatBonuses = { ...categoryBonuses };
                                                                if (!newCatBonuses[bonusType]) newCatBonuses[bonusType] = {};
                                                                if (newVal === undefined) delete newCatBonuses[bonusType][cat];
                                                                else newCatBonuses[bonusType][cat] = newVal;
                                                                setCategoryBonuses(newCatBonuses);
                                                            }}
                                                        />
                                                    </View>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                            <TouchableOpacity style={styles.primaryBtn} onPress={handleSaveScoringRules}>
                                <Text style={styles.primaryBtnText}>Salva Regolamento</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {activeTab === 'calc' && (
                        <View style={styles.cardCenter}>
                            <Calculator color="#fbbf24" size={60} style={{ marginBottom: 20 }} />
                            <Text style={styles.cardTitle}>{isVariable ? 'Calcola Giornata Fantasy' : 'Aggiorna Classifica Generale'}</Text>
                            <Text style={styles.helpText}>Il calcolo processerà i voti e gli eventi per determinare i punteggi.</Text>
                            <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: isVariable ? '#fbbf24' : '#4ade80', width: '100%' }]} onPress={isVariable ? calculateMatchday : updateFixedRosterClassifica}>
                                <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 18 }}>{isVariable ? 'CALCOLA GIORNATA 🚀' : 'AGGIORNA CLASSIFICA 🔄'}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.primaryBtn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#64748b', width: '100%', marginTop: 12 }]}
                                onPress={recalculateAllTournament}
                            >
                                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>Ricalcola Totale (Fix Errori) 🛠️</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>

            {showDatePicker && (
                <DateTimePicker
                    value={tempDeadlineDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            const d = new Date(tempDeadlineDate || Date.now());
                            d.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                            setTempDeadlineDate(d);
                        }
                    }}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={tempDeadlineDate || new Date()}
                    mode="time"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) {
                            const d = new Date(tempDeadlineDate || Date.now());
                            d.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                            setTempDeadlineDate(d);
                        }
                    }}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    title: { fontSize: 24, fontWeight: 'bold', color: '#fbbf24' },
    subtitle: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
    tabsWrapper: { backgroundColor: '#1e293b' },
    tabsContainer: { flexDirection: 'row', padding: 12 },
    tabBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
    tabBtnActive: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: '#fbbf24' },
    tabText: { color: '#94a3b8', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
    tabTextActive: { color: '#fbbf24' },
    content: { padding: 16, paddingBottom: 40 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardCenter: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 30, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardTitle: { color: '#fbbf24', fontWeight: 'bold', fontSize: 18, marginLeft: 12 },
    helpText: { color: '#94a3b8', fontSize: 14, marginBottom: 16, lineHeight: 20, textAlign: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    label: { color: '#f8fafc', fontSize: 14, marginBottom: 8, fontWeight: '600' },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    primaryBtn: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'transparent' },
    itemCardActive: { borderColor: '#fbbf24', backgroundColor: 'rgba(251, 191, 36, 0.05)' },
    itemTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },
    itemSub: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#94a3b8' },
    checkboxActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    editBtn: { backgroundColor: 'rgba(56, 189, 248, 0.1)', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#38bdf8' },
    deleteBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ef4444' },
    deleteBtnText: { color: '#ef4444', fontWeight: 'bold', fontSize: 12, marginLeft: 6 },
    searchInput: { backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    miniChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.05)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
    miniChipActive: { backgroundColor: '#fbbf24', borderColor: '#fbbf24' },
    miniChipText: { color: '#fff', fontSize: 13, fontWeight: '600' },
    settingsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 10, gap: 8 },
    settingItem: { width: '47%', minWidth: 140, flexGrow: 1, marginBottom: 12 },
    sectionTitle: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 12 },
    bonusListItem: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    bonusListPlayer: { color: '#f8fafc', fontWeight: 'bold', fontSize: 14, flexShrink: 1 },
    bonusListDesc: { color: '#64748b', fontSize: 12, flexShrink: 1 },
    bonusListValue: { fontWeight: '900', fontSize: 16, marginLeft: 10 },
    subTabsWrapper: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 16 },
    subTabBtn: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 4, borderRadius: 8 },
    subTabBtnActive: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: '#fbbf24' },
    subTabText: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
    subTabTextActive: { color: '#fbbf24' }
});
