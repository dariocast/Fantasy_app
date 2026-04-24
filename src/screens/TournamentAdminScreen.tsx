import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Image, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';
import { 
    Shield, Calendar, Users, Trophy, Trash2, Edit3, Plus, 
    ChevronLeft, ChevronRight, Image as ImageIcon, CheckCircle, 
    Activity, LayoutGrid, UserPlus, Home, Plane, Clock, Info, Save, X, List, GitCommit
} from 'lucide-react-native';
import type { RealTeam, Player, Match } from '../types';
import MatchCenterModal from '../components/MatchCenterModal';

const { width } = Dimensions.get('window');

export default function TournamentAdminScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const activeLeagueId = useStore(state => state.activeLeagueId);
    const league = leagues.find(l => l.id === activeLeagueId);
    const leagueId = league?.id || '';
    const currentUser = useStore((state) => state.currentUser);
    const showNotification = useStore(state => state.showNotification);
    const updateTeam = useStore(state => state.updateTeam);
    const deleteTeamStore = useStore(state => state.deleteTeam);
    const updatePlayer = useStore(state => state.updatePlayer);
    const deletePlayerStore = useStore(state => state.deletePlayer);
    const updateMatch = useStore(state => state.updateMatch);
    const deleteMatchStore = useStore(state => state.deleteMatch);

    const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === leagueId);
    const players = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId);

    // Main Tabs State
    const [activeTab, setActiveTab] = useState<'teams' | 'matches' | 'live'>('teams');
    const [calendarSubTab, setCalendarSubTab] = useState<'campionato' | 'playout' | 'eliminazione'>('campionato');
    const [selectedLiveGroup, setSelectedLiveGroup] = useState<string | number>('all');
    
    // UI State
    const [selectedTeam, setSelectedTeam] = useState<RealTeam | null>(null);
    const [isMatchWizardOpen, setIsMatchWizardOpen] = useState(false);
    const [matchWizardStep, setMatchWizardStep] = useState(1);

    // Team state
    const [teamName, setTeamName] = useState('');
    const [teamLogo, setTeamLogo] = useState('');
    const [editingTeam, setEditingTeam] = useState<RealTeam | null>(null);
    const [editTeamName, setEditTeamName] = useState('');
    const [editTeamLogo, setEditTeamLogo] = useState('');
    const [teamGroupId, setTeamGroupId] = useState('');

    // Player state
    const [playerName, setPlayerName] = useState('');
    const [playerPos, setPlayerPos] = useState('POR');
    const [playerRealPos, setPlayerRealPos] = useState('');
    const [playerAge, setPlayerAge] = useState('25');
    const [playerPrice, setPlayerPrice] = useState('1');
    const [playerPhoto, setPlayerPhoto] = useState('');
    const [isPlayerModalVisible, setPlayerModalVisible] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

    const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

    // Match Wizard state
    const [matchday, setMatchday] = useState('1');
    const [homeTeamId, setHomeTeamId] = useState('');
    const [awayTeamId, setAwayTeamId] = useState('');
    const [matchType, setMatchType] = useState<'campionato' | 'gironi' | 'eliminazione' | 'playout'>('campionato');
    const [matchStage, setMatchStage] = useState('');
    const [phaseNumber, setPhaseNumber] = useState('1');
    const [matchDate, setMatchDate] = useState('');
    const [matchTime, setMatchTime] = useState('');

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

    // Match Center
    const [matchCenterMatch, setMatchCenterMatch] = useState<Match | null>(null);

    const isAdmin = league && currentUser && league.roles[currentUser.id] === 'admin';

    if (!league || !isAdmin) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
                </View>
            </SafeAreaView>
        );
    }

    // ---- HANDLERS ----
    const pickImage = async (setter: (uri: string) => void) => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });
        if (!result.canceled && result.assets && result.assets[0].base64) {
            setter(`data:image/jpeg;base64,${result.assets[0].base64}`);
        }
    };

    const handleCreateTeam = () => {
        if (!teamName) return;
        const t: RealTeam = {
            id: uuidv4(),
            leagueId,
            name: teamName,
            logo: teamLogo || `https://ui-avatars.com/api/?name=${encodeURIComponent(teamName)}&background=random`,
            groupId: typeof league?.settings?.groupCount === 'number' && typeof teamGroupId === 'string' && teamGroupId !== '' ? teamGroupId : undefined
        };
        updateTeam(t);
        setTeamName(''); setTeamLogo(''); setTeamGroupId('');
    };

    const handleSaveTeamEdit = () => {
        if (!editingTeam) return;
        updateTeam({ ...editingTeam, name: editTeamName, logo: editTeamLogo });
        setEditingTeam(null);
    };

    const handleSavePlayer = () => {
        if (!playerName || !selectedTeam) return;
        if (editingPlayer) {
            updatePlayer({
                ...editingPlayer, name: playerName, position: playerPos, realPosition: playerRealPos,
                age: parseInt(playerAge), price: parseInt(playerPrice), photo: playerPhoto || editingPlayer.photo
            });
        } else {
            updatePlayer({
                id: uuidv4(), leagueId, name: playerName, position: playerPos, realPosition: playerRealPos || 'Sconosciuto',
                age: parseInt(playerAge), price: parseInt(playerPrice), realTeamId: selectedTeam.id,
                careerId: uuidv4(), photo: playerPhoto || undefined
            });
        }
        setPlayerModalVisible(false);
    };

    const startCreateMatch = () => {
        setEditingMatchId(null);
        setMatchday('1');
        setHomeTeamId('');
        setAwayTeamId('');
        setMatchType('campionato');
        setMatchStage('');
        setPhaseNumber('1');
        setMatchDate('');
        setMatchTime('');
        setMatchWizardStep(1);
        setIsMatchWizardOpen(true);
    };

    const startEditMatch = (m: Match) => {
        setEditingMatchId(m.id);
        setMatchday(m.matchday.toString());
        setHomeTeamId(m.homeTeamId);
        setAwayTeamId(m.awayTeamId);
        setMatchType(m.matchType || 'campionato');
        setMatchStage(m.stage || '');
        setPhaseNumber((m.phaseNumber || 1).toString());
        setMatchDate(m.scheduledDate || '');
        setMatchTime(m.scheduledTime || '');
        setMatchWizardStep(1);
        setIsMatchWizardOpen(true);
    };

    const handleCreateMatchFinal = () => {
        if (!homeTeamId || !awayTeamId) {
            showNotification({ type: 'error', title: 'Errore', message: 'Seleziona due squadre.' });
            return;
        }

        const matchData: Match = {
            id: editingMatchId || uuidv4(),
            leagueId,
            matchday: parseInt(matchday) || 1,
            homeTeamId,
            awayTeamId,
            homeScore: editingMatchId ? matches.find(m => m.id === editingMatchId)?.homeScore || 0 : 0,
            awayScore: editingMatchId ? matches.find(m => m.id === editingMatchId)?.awayScore || 0 : 0,
            events: editingMatchId ? matches.find(m => m.id === editingMatchId)?.events || [] : [],
            playerVotes: editingMatchId ? matches.find(m => m.id === editingMatchId)?.playerVotes || {} : {},
            status: editingMatchId ? matches.find(m => m.id === editingMatchId)?.status || 'scheduled' : 'scheduled',
            isFantasyMatchday: false,
            matchType,
            stage: matchStage || undefined,
            phaseNumber: (matchType === 'eliminazione' || matchType === 'playout') ? parseInt(phaseNumber) : undefined,
            scheduledDate: matchDate || undefined,
            scheduledTime: matchTime || undefined
        };

        updateMatch(matchData);
        setIsMatchWizardOpen(false);
        setMatchWizardStep(1);
        showNotification({ 
            type: 'success', 
            title: 'Successo', 
            message: editingMatchId ? 'Partita aggiornata.' : 'Partita aggiunta al calendario.' 
        });
    };

    const handleChangeMatchStatus = (match: Match) => {
        const statuses: Match['status'][] = ['scheduled', 'in_progress', 'finished'];
        const nextIdx = (statuses.indexOf(match.status) + 1) % statuses.length;
        updateMatch({ ...match, status: statuses[nextIdx] });
    };

    // ---- RENDERERS ----
    const renderTabs = () => (
        <View style={styles.tabsContainer}>
            {[
                { id: 'teams', label: 'Squadre', icon: Users },
                { id: 'matches', label: 'Calendario', icon: Calendar },
                { id: 'live', label: 'Gestione Live', icon: Activity },
            ].map(tab => (
                <TouchableOpacity 
                    key={tab.id} 
                    style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]} 
                    onPress={() => { setActiveTab(tab.id as any); setSelectedTeam(null); }}
                >
                    <tab.icon size={18} color={activeTab === tab.id ? '#38bdf8' : '#64748b'} />
                    <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderTeamsTab = () => (
        <View>
            {!selectedTeam ? (
                <>
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Shield color="#38bdf8" size={20} />
                            <Text style={styles.cardTitle}>Nuova Squadra</Text>
                        </View>
                        <View style={styles.inputWrapper}>
                            <TextInput style={styles.input} placeholder="Nome Squadra" placeholderTextColor="#64748b" value={teamName} onChangeText={setTeamName} />
                            <TouchableOpacity style={styles.logoCircleBtn} onPress={() => pickImage(setTeamLogo)}>
                                {teamLogo ? <Image source={{ uri: teamLogo }} style={styles.uploadedLogo} /> : <ImageIcon color="#38bdf8" size={18} />}
                            </TouchableOpacity>
                        </View>
                        {league.settings.groupCount ? (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={styles.modalLabel}>Girone / Categoria</Text>
                                <View style={styles.chipGrid}>
                                    {(league.settings.groupNames || Array.from({ length: league.settings.groupCount }).map((_, i) => `Girone ${String.fromCharCode(65 + i)}`)).map((name, idx) => (
                                        <TouchableOpacity key={idx} style={[styles.miniChip, teamGroupId === name && styles.chipActive]} onPress={() => setTeamGroupId(name)}>
                                            <Text style={[styles.chipText, teamGroupId === name && styles.chipTextActive]}>{name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ) : null}
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleCreateTeam}>
                            <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
                            <Text style={styles.primaryBtnText}>Crea Squadra</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.sectionHeader}>
                        <LayoutGrid color="#38bdf8" size={18} />
                        <Text style={styles.sectionTitle}>Squadre ({realTeams.length})</Text>
                    </View>
                    <View style={styles.teamGrid}>
                        {realTeams.map(t => (
                            <TouchableOpacity key={t.id} style={styles.teamCard} onPress={() => setSelectedTeam(t)}>
                                <Image source={{ uri: t.logo }} style={styles.teamCardLogo} />
                                <Text style={styles.teamCardName} numberOfLines={1}>{t.name}</Text>
                                <View style={styles.teamCardStats}>
                                    <Users size={10} color="#64748b" />
                                    <Text style={styles.teamCardStatsText}>{players.filter(p => p.realTeamId === t.id).length}</Text>
                                </View>
                                <View style={styles.teamActions}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingTeam(t); setEditTeamName(t.name); setEditTeamLogo(t.logo); }}>
                                        <Edit3 size={14} color="#38bdf8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => deleteTeamStore(t.id)}>
                                        <Trash2 size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            ) : (
                <View>
                    <View style={styles.teamDetailHeader}>
                        <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedTeam(null)}>
                            <ChevronLeft color="#f8fafc" size={24} />
                        </TouchableOpacity>
                        <Image source={{ uri: selectedTeam.logo }} style={styles.detailLogo} />
                        <View>
                            <Text style={styles.detailName}>{selectedTeam.name}</Text>
                            <Text style={styles.detailSub}>Rosa Calciatori</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.addPlayerBtn} onPress={() => { setEditingPlayer(null); setPlayerName(''); setPlayerModalVisible(true); }}>
                        <UserPlus size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={styles.addPlayerBtnText}>Nuovo Calciatore</Text>
                    </TouchableOpacity>
                    <View style={styles.playerList}>
                        {players.filter(p => p.realTeamId === selectedTeam.id).map(p => (
                            <View key={p.id} style={styles.playerCard}>
                                <View style={[styles.playerPosBadge, { borderColor: getPosColor(p.position) }]}>
                                    <Text style={[styles.playerPosText, { color: getPosColor(p.position) }]}>{p.position}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.playerNameText}>{p.name}</Text>
                                    <Text style={styles.playerSubText}>{p.realPosition} • {p.age} anni</Text>
                                </View>
                                <View style={styles.playerActions}>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingPlayer(p); setPlayerName(p.name); setPlayerPos(p.position); setPlayerRealPos(p.realPosition || ''); setPlayerAge(p.age.toString()); setPlayerPrice((p.price || 1).toString()); setPlayerPhoto(p.photo || ''); setPlayerModalVisible(true); }}>
                                        <Edit3 size={16} color="#38bdf8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.iconBtn} onPress={() => deletePlayerStore(p.id)}>
                                        <Trash2 size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );    const renderMatchesTab = () => {
        const sortedMatches = [...matches].sort((a, b) => a.matchday - b.matchday);
        const campionatoMatches = sortedMatches.filter(m => !m.matchType || m.matchType === 'campionato' || m.matchType === 'gironi');
        const playoutMatches = sortedMatches.filter(m => m.matchType === 'playout');
        const eliminazioneMatches = sortedMatches.filter(m => m.matchType === 'eliminazione');

        // Group matches by phase number for bracket
        const groupedKnockout = eliminazioneMatches.reduce((acc, m) => {
            const key = m.stage || `Fase ${m.phaseNumber || '?'}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(m);
            return acc;
        }, {} as Record<string, Match[]>);

        return (
            <View>
                <TouchableOpacity style={styles.cardActionBtn} onPress={startCreateMatch}>
                    <Plus size={20} color="#fbbf24" style={{ marginRight: 10 }} />
                    <Text style={styles.cardActionBtnText}>Nuova Partita</Text>
                </TouchableOpacity>

                <View style={styles.viewModeContainer}>
                    <TouchableOpacity style={[styles.viewModeBtn, calendarSubTab === 'campionato' && styles.viewModeBtnActive]} onPress={() => setCalendarSubTab('campionato')}>
                        <Text style={[styles.viewModeText, calendarSubTab === 'campionato' && styles.viewModeTextActive, { marginLeft: 0 }]}>Campionato/Gironi</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.viewModeBtn, calendarSubTab === 'playout' && styles.viewModeBtnActive]} onPress={() => setCalendarSubTab('playout')}>
                        <Text style={[styles.viewModeText, calendarSubTab === 'playout' && styles.viewModeTextActive, { marginLeft: 0 }]}>Playout</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.viewModeBtn, calendarSubTab === 'eliminazione' && styles.viewModeBtnActive]} onPress={() => setCalendarSubTab('eliminazione')}>
                        <Text style={[styles.viewModeText, calendarSubTab === 'eliminazione' && styles.viewModeTextActive, { marginLeft: 0 }]}>Eliminazione</Text>
                    </TouchableOpacity>
                </View>

                {calendarSubTab === 'campionato' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Calendar color="#fbbf24" size={18} />
                            <Text style={styles.sectionTitle}>Campionato e Gironi</Text>
                        </View>
                        {campionatoMatches.length === 0 && <Text style={styles.emptyInfo}>Nessuna partita di campionato creata.</Text>}
                        {campionatoMatches.map(m => (
                            <View key={m.id} style={styles.matchItem}>
                                <Text style={styles.matchDayText}>G{m.matchday}</Text>
                                <Text style={styles.matchTeamsText} numberOfLines={1}>
                                    {realTeams.find(t => t.id === m.homeTeamId)?.name} - {realTeams.find(t => t.id === m.awayTeamId)?.name}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={() => startEditMatch(m)}>
                                        <Edit3 size={16} color="#38bdf8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => deleteMatchStore(m.id)}>
                                        <Trash2 size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {calendarSubTab === 'playout' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <Activity color="#f59e0b" size={18} />
                            <Text style={styles.sectionTitle}>Fase Playout</Text>
                        </View>
                        {playoutMatches.length === 0 && <Text style={styles.emptyInfo}>Nessuna partita playout creata.</Text>}
                        {playoutMatches.map(m => (
                            <View key={m.id} style={styles.matchItem}>
                                <Text style={styles.matchDayText}>F{m.phaseNumber || '?'}</Text>
                                <Text style={styles.matchTeamsText} numberOfLines={1}>
                                    {realTeams.find(t => t.id === m.homeTeamId)?.name} - {realTeams.find(t => t.id === m.awayTeamId)?.name}
                                </Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity onPress={() => startEditMatch(m)}>
                                        <Edit3 size={16} color="#38bdf8" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => deleteMatchStore(m.id)}>
                                        <Trash2 size={16} color="#ef4444" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {calendarSubTab === 'eliminazione' && (
                    <View>
                        <View style={styles.sectionHeader}>
                            <GitCommit color="#fbbf24" size={18} />
                            <Text style={styles.sectionTitle}>Tabellone Eliminazione Diretta</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bracketScroll}>
                            {Object.keys(groupedKnockout).length === 0 && <Text style={styles.emptyInfo}>Nessuna partita a eliminazione diretta creata.</Text>}
                            {Object.entries(groupedKnockout).map(([stage, phaseMatches]) => (
                                <View key={stage} style={styles.bracketColumn}>
                                    <View style={styles.bracketColHeader}>
                                        <Text style={[styles.bracketColTitle, { fontSize: 16 }]}>
                                            {stage.toUpperCase()}
                                        </Text>
                                    </View>
                                    {phaseMatches.map(m => (
                                        <View key={m.id} style={styles.bracketMatch}>
                                            <View style={styles.bracketMatchTeam}>
                                                <Text style={styles.bracketTeamName} numberOfLines={1}>{realTeams.find(t => t.id === m.homeTeamId)?.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.bracketScore}>{m.homeScore}</Text>
                                                    <TouchableOpacity onPress={() => startEditMatch(m)} style={{ marginLeft: 10 }}>
                                                        <Edit3 size={12} color="#38bdf8" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                            <View style={styles.bracketDivider} />
                                            <View style={styles.bracketMatchTeam}>
                                                <Text style={styles.bracketTeamName} numberOfLines={1}>{realTeams.find(t => t.id === m.awayTeamId)?.name}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.bracketScore}>{m.awayScore}</Text>
                                                    <TouchableOpacity onPress={() => deleteMatchStore(m.id)} style={{ marginLeft: 10 }}>
                                                        <Trash2 size={12} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ))}
                        </ScrollView>
                    </View>
                )}
            </View>
        );
    };

    const renderLiveTab = () => {
        const championshipMatches = matches.filter(m => !m.matchType || m.matchType === 'campionato' || m.matchType === 'gironi');
        const knockoutMatches = matches.filter(m => m.matchType === 'eliminazione' || m.matchType === 'playout');

        const championshipDays = Array.from(new Set(championshipMatches.map(m => m.matchday))).sort((a, b) => a - b);
        const knockoutStages = Array.from(new Set(knockoutMatches.map(m => m.stage || `Fase ${m.phaseNumber || '?'}`)));

        const filteredMatches = matches.filter(m => {
            if (selectedLiveGroup === 'all') return true;
            if (typeof selectedLiveGroup === 'number') return m.matchday === selectedLiveGroup && (m.matchType === 'campionato' || m.matchType === 'gironi');
            const stageName = m.stage || `Fase ${m.phaseNumber || '?'}`;
            return stageName === selectedLiveGroup;
        });

        const renderMatchCard = (m: Match) => {
            const ht = realTeams.find(t => t.id === m.homeTeamId);
            const at = realTeams.find(t => t.id === m.awayTeamId);
            return (
                <TouchableOpacity key={m.id} style={styles.managementCard} onPress={() => setMatchCenterMatch(m)}>
                    <View style={styles.matchCardTop}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.matchdayBadge}>
                                {m.matchType === 'campionato' || m.matchType === 'gironi' ? `G${m.matchday}` : m.stage?.toUpperCase() || `F${m.phaseNumber}`}
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => handleChangeMatchStatus(m)}>
                            <Text style={[styles.statusBadge, { color: statusColors[m.status], backgroundColor: statusColors[m.status] + '15' }]}>
                                {statusLabels[m.status]}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.scoreRow}>
                        <Text style={styles.teamName} numberOfLines={1}>{ht?.name}</Text>
                        <View style={styles.scoreBox}><Text style={styles.scoreTextMain}>{m.homeScore} - {m.awayScore}</Text></View>
                        <Text style={[styles.teamName, { textAlign: 'right' }]} numberOfLines={1}>{at?.name}</Text>
                    </View>
                </TouchableOpacity>
            );
        };

        return (
            <View>
                <View style={styles.sectionHeader}>
                    <Activity color="#4ade80" size={18} />
                    <Text style={styles.sectionTitle}>Match Center Live</Text>
                </View>

                {/* Sub-menu Horizontal Scroll */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20, gap: 10 }}>
                    <TouchableOpacity 
                        style={[styles.miniChip, selectedLiveGroup === 'all' && styles.chipActive]} 
                        onPress={() => setSelectedLiveGroup('all')}
                    >
                        <Text style={[styles.chipText, selectedLiveGroup === 'all' && styles.chipTextActive]}>TUTTI</Text>
                    </TouchableOpacity>
                    
                    {championshipDays.map(day => (
                        <TouchableOpacity 
                            key={day}
                            style={[styles.miniChip, selectedLiveGroup === day && styles.chipActive]} 
                            onPress={() => setSelectedLiveGroup(day)}
                        >
                            <Text style={[styles.chipText, selectedLiveGroup === day && styles.chipTextActive]}>G{day}</Text>
                        </TouchableOpacity>
                    ))}

                    {knockoutStages.map(stage => (
                        <TouchableOpacity 
                            key={stage}
                            style={[styles.miniChip, selectedLiveGroup === stage && styles.chipActiveYellow]} 
                            onPress={() => setSelectedLiveGroup(stage)}
                        >
                            <Text style={[styles.chipText, selectedLiveGroup === stage && { color: '#fbbf24' }]}>{stage.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {matches.length === 0 && <Text style={styles.emptyInfo}>Nessuna partita programmata.</Text>}
                
                <View style={{ gap: 12 }}>
                    {filteredMatches.sort((a, b) => a.matchday - b.matchday).map(renderMatchCard)}
                </View>
            </View>
        );
    };

    const renderMatchWizard = () => {
        const steps = ['Tipo Match', 'Squadre', 'Dettagli'];
        return (
            <Modal visible={isMatchWizardOpen} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.wizardContent}>
                        <View style={styles.wizardHeader}>
                            <Text style={styles.wizardTitle}>{editingMatchId ? 'Modifica Partita' : 'Creazione Partita'}</Text>
                            <TouchableOpacity onPress={() => setIsMatchWizardOpen(false)}><X size={24} color="#64748b" /></TouchableOpacity>
                        </View>
                        
                        <View style={styles.wizardProgress}>
                            {steps.map((s, i) => (
                                <React.Fragment key={i}>
                                    <View style={[styles.wizardStepDot, matchWizardStep > i && styles.wizardStepDotActive]} />
                                    {i < steps.length - 1 && <View style={[styles.wizardStepLine, matchWizardStep > i + 1 && styles.wizardStepLineActive]} />}
                                </React.Fragment>
                            ))}
                        </View>
                        <Text style={styles.wizardStepTitle}>Step {matchWizardStep}: {steps[matchWizardStep-1]}</Text>

                        <ScrollView style={{ maxHeight: 380 }}>
                            {matchWizardStep === 1 && (
                                <View>
                                    <Text style={styles.modalLabel}>Tipo Competizione</Text>
                                    <View style={styles.chipGrid}>
                                        {[
                                            { id: 'campionato', label: 'Campionato' },
                                            { id: 'gironi', label: 'Gironi' },
                                            { id: 'eliminazione', label: 'Eliminazione Diretta' },
                                            { id: 'playout', label: 'Playout' }
                                        ].map(item => (
                                            <TouchableOpacity key={item.id} style={[styles.miniChip, matchType === item.id && styles.chipActiveYellow]} onPress={() => setMatchType(item.id as any)}>
                                                <Text style={[styles.chipText, matchType === item.id && { color: '#fbbf24' }]}>{item.label.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    
                                    {(matchType === 'eliminazione' || matchType === 'playout') ? (
                                        <View>
                                            <Text style={styles.modalLabel}>Numero Fase (es. 1 per Playout, 2 per Quarti...)</Text>
                                            <TextInput style={styles.modalInput} keyboardType="numeric" value={phaseNumber} onChangeText={setPhaseNumber} />
                                            <Text style={styles.modalLabel}>Nome Fase (es. Semifinale)</Text>
                                            <TextInput style={styles.modalInput} placeholder="Es. Finale" placeholderTextColor="#64748b" value={matchStage} onChangeText={setMatchStage} />
                                        </View>
                                    ) : (
                                        <>
                                            <Text style={styles.modalLabel}>Giornata</Text>
                                            <TextInput style={styles.modalInput} keyboardType="numeric" value={matchday} onChangeText={setMatchday} />
                                        </>
                                    )}
                                </View>
                            )}

                            {matchWizardStep === 2 && (
                                <View>
                                    <View style={styles.wizardPickerContainer}>
                                        <View style={[styles.wizardTeamBox, homeTeamId && styles.wizardTeamBoxHome]}>
                                            <Home size={20} color={homeTeamId ? '#38bdf8' : '#64748b'} />
                                            <Text style={styles.wizardTeamText}>{realTeams.find(t => t.id === homeTeamId)?.name || 'Casa'}</Text>
                                        </View>
                                        <Text style={styles.vsText}>VS</Text>
                                        <View style={[styles.wizardTeamBox, awayTeamId && styles.wizardTeamBoxAway]}>
                                            <Plane size={20} color={awayTeamId ? '#ef4444' : '#64748b'} />
                                            <Text style={styles.wizardTeamText}>{realTeams.find(t => t.id === awayTeamId)?.name || 'Ospite'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.chipGrid}>
                                        {realTeams.map(t => (
                                            <TouchableOpacity 
                                                key={t.id} 
                                                style={[styles.miniChip, homeTeamId === t.id ? styles.chipActiveHome : (awayTeamId === t.id ? styles.chipActiveAway : null)]}
                                                onPress={() => {
                                                    if (homeTeamId === t.id) setHomeTeamId('');
                                                    else if (awayTeamId === t.id) setAwayTeamId('');
                                                    else if (!homeTeamId) setHomeTeamId(t.id);
                                                    else if (!awayTeamId) setAwayTeamId(t.id);
                                                }}
                                            >
                                                <Text style={styles.chipText}>{t.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {matchWizardStep === 3 && (
                                <View>
                                    <View style={styles.card}>
                                        <Text style={styles.confirmText}>{realTeams.find(t => t.id === homeTeamId)?.name} vs {realTeams.find(t => t.id === awayTeamId)?.name}</Text>
                                        <Text style={styles.confirmSub}>
                                            {matchType === 'eliminazione' ? 'ELIMINAZIONE DIRETTA' : matchType.toUpperCase()} 
                                            {matchType === 'eliminazione' || matchType === 'playout' ? ` - FASE ${phaseNumber}` : ` - G${matchday}`}
                                        </Text>
                                    </View>
                                    <View style={styles.row}>
                                        <TouchableOpacity style={[styles.modalInput, { flex: 1, marginRight: 5, flexDirection: 'row', alignItems: 'center' }]} onPress={() => setShowDatePicker(true)}>
                                            <Calendar size={14} color="#64748b" style={{ marginRight: 8 }} />
                                            <Text style={{ color: matchDate ? '#f8fafc' : '#64748b' }}>{matchDate || 'Data'}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.modalInput, { flex: 1, marginLeft: 5, flexDirection: 'row', alignItems: 'center' }]} onPress={() => setShowTimePicker(true)}>
                                            <Clock size={14} color="#64748b" style={{ marginRight: 8 }} />
                                            <Text style={{ color: matchTime ? '#f8fafc' : '#64748b' }}>{matchTime || 'Ora'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}
                        </ScrollView>

                        <View style={styles.wizardFooter}>
                            {matchWizardStep > 1 ? (
                                <TouchableOpacity style={styles.wizardBack} onPress={() => setMatchWizardStep(matchWizardStep - 1)}>
                                    <ChevronLeft size={20} color="#f8fafc" />
                                    <Text style={styles.wizardBackText}>Indietro</Text>
                                </TouchableOpacity>
                            ) : <View style={{ flex: 1 }} />}

                            {matchWizardStep < 3 ? (
                                <TouchableOpacity style={styles.wizardNext} onPress={() => setMatchWizardStep(matchWizardStep + 1)}>
                                    <Text style={styles.wizardNextText}>Avanti</Text>
                                    <ChevronRight size={20} color="#0f172a" />
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.wizardNext, { backgroundColor: '#fbbf24' }]} onPress={handleCreateMatchFinal}>
                                    <CheckCircle size={20} color="#0f172a" />
                                    <Text style={styles.wizardNextText}>{editingMatchId ? 'Salva' : 'Crea'}</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        );
    };

    const getPosColor = (pos: string) => {
        if (pos === 'POR') return '#fbbf24';
        if (pos === 'DIF') return '#3b82f6';
        if (pos === 'CEN') return '#22c55e';
        if (pos === 'ATT') return '#ef4444';
        return '#94a3b8';
    };

    const statusColors: Record<string, string> = { scheduled: '#94a3b8', in_progress: '#f59e0b', finished: '#4ade80' };
    const statusLabels: Record<string, string> = { scheduled: 'PROGR.', in_progress: 'LIVE', finished: 'FINITA' };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Gestione Torneo</Text>
            </View>

            {renderTabs()}

            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={100}>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {activeTab === 'teams' && renderTeamsTab()}
                    {activeTab === 'matches' && renderMatchesTab()}
                    {activeTab === 'live' && renderLiveTab()}
                </ScrollView>
            </KeyboardAvoidingView>

            {renderMatchWizard()}

            {/* Player Modal */}
            <Modal visible={isPlayerModalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{editingPlayer ? `Modifica ${editingPlayer.name}` : 'Nuovo Calciatore'}</Text>
                        <TextInput style={styles.modalInput} placeholder="Nome Cognome" placeholderTextColor="#94a3b8" value={playerName} onChangeText={setPlayerName} />
                        <View style={styles.chipGrid}>
                            {(league.settings.useCustomRoles ? (league.settings.customRoles?.map(r => r.name) || []) : ['POR', 'DIF', 'CEN', 'ATT']).map(pos => (
                                <TouchableOpacity key={pos} style={[styles.miniChip, playerPos === pos && styles.chipActive]} onPress={() => setPlayerPos(pos)}>
                                    <Text style={[styles.chipText, playerPos === pos && styles.chipTextActive]}>{pos}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.row}>
                            <TextInput style={[styles.modalInput, { flex: 1, marginRight: 5 }]} placeholder="Ruolo Reale" placeholderTextColor="#94a3b8" value={playerRealPos} onChangeText={setPlayerRealPos} />
                            <TextInput style={[styles.modalInput, { flex: 1, marginLeft: 5 }]} placeholder="Età" keyboardType="numeric" placeholderTextColor="#94a3b8" value={playerAge} onChangeText={setPlayerAge} />
                        </View>
                        <TextInput style={styles.modalInput} placeholder="Quotazione" keyboardType="numeric" placeholderTextColor="#94a3b8" value={playerPrice} onChangeText={setPlayerPrice} />
                        <TouchableOpacity style={styles.modalImageBtn} onPress={() => pickImage(setPlayerPhoto)}>
                            <ImageIcon color="#38bdf8" size={20} />
                            <Text style={styles.modalImageBtnText}>{playerPhoto ? 'Cambia Foto' : 'Aggiungi Foto'}</Text>
                        </TouchableOpacity>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setPlayerModalVisible(false)}><Text style={styles.modalCancelText}>Annulla</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={handleSavePlayer}><Text style={styles.modalConfirmText}>Salva</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Team Edit Modal */}
            <Modal visible={!!editingTeam} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Modifica Squadra</Text>
                        <TextInput style={styles.modalInput} placeholder="Nome Squadra" placeholderTextColor="#94a3b8" value={editTeamName} onChangeText={setEditTeamName} />
                        <TouchableOpacity style={styles.modalImageBtn} onPress={() => pickImage(setEditTeamLogo)}>
                            <ImageIcon color="#38bdf8" size={20} />
                            <Text style={styles.modalImageBtnText}>Cambia Logo</Text>
                        </TouchableOpacity>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingTeam(null)}><Text style={styles.modalCancelText}>Annulla</Text></TouchableOpacity>
                            <TouchableOpacity style={styles.modalConfirm} onPress={handleSaveTeamEdit}><Text style={styles.modalConfirmText}>Salva</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {showDatePicker && (
                <DateTimePicker value={tempDate} mode="date" display="default" onChange={(e, d) => { setShowDatePicker(false); if(d) setMatchDate(d.toISOString().split('T')[0]); }} />
            )}
            {showTimePicker && (
                <DateTimePicker value={tempDate} mode="time" display="default" onChange={(e, d) => { setShowTimePicker(false); if(d) setMatchTime(d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })); }} />
            )}
            {matchCenterMatch && (
                <MatchCenterModal match={matchCenterMatch} visible={!!matchCenterMatch} onClose={() => setMatchCenterMatch(null)} />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingVertical: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 15, gap: 10 },
    tabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'transparent' },
    tabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    tabText: { fontSize: 11, fontWeight: 'bold', color: '#64748b', marginLeft: 6 },
    tabTextActive: { color: '#38bdf8' },
    scrollContent: { padding: 16, paddingBottom: 100 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    cardTitle: { fontSize: 17, fontWeight: 'bold', color: '#38bdf8' },
    inputWrapper: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    input: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderRadius: 12, padding: 14, fontSize: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    logoCircleBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#38bdf8', borderStyle: 'dashed' },
    uploadedLogo: { width: '100%', height: '100%', borderRadius: 25 },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#38bdf8', padding: 15, borderRadius: 14 },
    primaryBtnText: { color: '#fff', fontWeight: 'bold' },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 8, paddingLeft: 4 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
    teamGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    teamCard: { width: '48%', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    teamCardLogo: { width: 45, height: 45, borderRadius: 10, marginBottom: 10 },
    teamCardName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
    teamCardStats: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    teamCardStatsText: { color: '#64748b', fontSize: 10, fontWeight: '600' },
    teamActions: { flexDirection: 'row', marginTop: 10, gap: 8 },
    iconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    teamDetailHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    detailLogo: { width: 45, height: 45, borderRadius: 10, marginRight: 12 },
    detailName: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
    detailSub: { color: '#64748b', fontSize: 12 },
    addPlayerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#38bdf8', padding: 14, borderRadius: 12, marginBottom: 15 },
    addPlayerBtnText: { color: '#fff', fontWeight: 'bold' },
    playerList: { gap: 10 },
    playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    playerPosBadge: { width: 34, height: 34, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 12, borderWidth: 1 },
    playerPosText: { fontSize: 10, fontWeight: '900' },
    playerNameText: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold' },
    playerSubText: { color: '#64748b', fontSize: 10 },
    playerActions: { flexDirection: 'row', gap: 6 },
    cardActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,191,36,0.08)', padding: 16, borderRadius: 16, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(251,191,36,0.15)' },
    cardActionBtnText: { color: '#fbbf24', fontWeight: 'bold', fontSize: 15 },
    matchItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 12, marginBottom: 8 },
    matchDayText: { color: '#fbbf24', fontSize: 12, fontWeight: '900', width: 30 },
    matchdayTitle: { color: '#64748b', fontSize: 12, fontWeight: '900', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, marginLeft: 4 },
    matchTeamsText: { color: '#f8fafc', fontSize: 13, flex: 1 },
    phaseBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 10 },
    phaseBadgeText: { color: '#fbbf24', fontSize: 9, fontWeight: 'bold' },
    viewModeContainer: { flexDirection: 'row', marginBottom: 20, gap: 10, justifyContent: 'center' },
    viewModeBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    viewModeBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    viewModeText: { color: '#64748b', fontSize: 12, fontWeight: 'bold', marginLeft: 8 },
    viewModeTextActive: { color: '#38bdf8' },
    bracketScroll: { paddingBottom: 20 },
    bracketColumn: { width: width * 0.75, marginRight: 20 },
    bracketColHeader: { alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.03)', paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    bracketColTitle: { color: '#fbbf24', fontWeight: '900', fontSize: 14 },
    bracketColSub: { color: '#64748b', fontSize: 10, textTransform: 'uppercase', marginTop: 2 },
    bracketMatch: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 15, marginBottom: 15, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    bracketMatchTeam: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    bracketTeamName: { color: '#f8fafc', fontWeight: 'bold', fontSize: 13, flex: 1 },
    bracketScore: { color: '#fbbf24', fontWeight: '900', fontSize: 15, marginLeft: 10 },
    bracketDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 6 },
    managementCard: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    matchCardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    matchdayBadge: { color: '#64748b', fontSize: 11, fontWeight: 'bold' },
    miniPhaseBadge: { backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    miniPhaseText: { color: '#fbbf24', fontSize: 8, fontWeight: '900' },
    statusBadge: { fontSize: 9, fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden' },
    scoreRow: { flexDirection: 'row', alignItems: 'center' },
    teamName: { flex: 1, color: '#f8fafc', fontSize: 15, fontWeight: 'bold' },
    scoreBox: { backgroundColor: 'rgba(15,23,42,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginHorizontal: 10 },
    scoreTextMain: { color: '#4ade80', fontSize: 16, fontWeight: '900' },
    modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.8)', padding: 20 },
    modalContent: { backgroundColor: '#1e293b', borderRadius: 24, padding: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 15 },
    modalInput: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderRadius: 10, padding: 12, fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 12 },
    modalLabel: { color: '#64748b', fontSize: 11, fontWeight: 'bold', marginBottom: 8, marginLeft: 2 },
    modalImageBtn: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', marginBottom: 15 },
    modalImageBtnText: { color: '#38bdf8', fontWeight: 'bold', marginLeft: 10 },
    modalActions: { flexDirection: 'row', gap: 10 },
    modalCancel: { flex: 1, padding: 12, alignItems: 'center' },
    modalCancelText: { color: '#64748b', fontWeight: 'bold' },
    modalConfirm: { flex: 2, backgroundColor: '#38bdf8', padding: 12, borderRadius: 12, alignItems: 'center' },
    modalConfirmText: { color: '#0f172a', fontWeight: 'bold' },
    wizardContent: { backgroundColor: '#1e293b', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    wizardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    wizardTitle: { fontSize: 18, fontWeight: 'bold', color: '#fbbf24' },
    wizardProgress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
    wizardStepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: 'rgba(255,255,255,0.1)' },
    wizardStepDotActive: { backgroundColor: '#fbbf24' },
    wizardStepLine: { width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 5 },
    wizardStepLineActive: { backgroundColor: '#fbbf24' },
    wizardStepTitle: { fontSize: 13, color: '#f8fafc', fontWeight: '700', textAlign: 'center', marginBottom: 20 },
    wizardPickerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, marginBottom: 15 },
    wizardTeamBox: { flex: 1, alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'transparent' },
    wizardTeamBoxHome: { borderColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.05)' },
    wizardTeamBoxAway: { borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
    wizardTeamText: { color: '#f8fafc', fontSize: 11, fontWeight: 'bold', marginTop: 5 },
    wizardFooter: { flexDirection: 'row', gap: 10, marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    wizardBack: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    wizardBackText: { color: '#94a3b8', fontWeight: 'bold', marginLeft: 5 },
    wizardNext: { flex: 2, backgroundColor: '#38bdf8', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    wizardNextText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15, marginRight: 5 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
    miniChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'transparent' },
    chipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    chipActiveYellow: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderColor: '#fbbf24' },
    chipActiveHome: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    chipActiveAway: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: '#ef4444' },
    chipText: { fontSize: 10, color: '#64748b', fontWeight: 'bold' },
    chipTextActive: { color: '#38bdf8' },
    confirmText: { fontSize: 16, color: '#f8fafc', fontWeight: 'bold', textAlign: 'center' },
    confirmSub: { fontSize: 11, color: '#fbbf24', textAlign: 'center', marginTop: 4 },
    vsText: { color: '#64748b', fontWeight: '900', marginHorizontal: 10 },
    row: { flexDirection: 'row', marginBottom: 10 },
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#475569', fontSize: 14, textAlign: 'center' },
    emptyInfo: { color: '#475569', fontSize: 13, textAlign: 'center', marginVertical: 20 },
});
