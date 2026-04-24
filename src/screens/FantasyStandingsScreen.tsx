import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { Trophy, Users, BarChart2, Star, ChevronRight, LayoutGrid, List, Award, Activity, RectangleVertical, CircleStar, Footprints, Calendar as CalendarIcon, Info } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

const SportShoe = ({ size = 24, color = '#000', style }: { size?: number; color?: string; style?: any }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={style}>
        <Path d="m15 10.42 4.8-5.07" />
        <Path d="M19 18h3" />
        <Path d="M9.5 22 21.414 9.415A2 2 0 0 0 21.2 6.4l-5.61-4.208A1 1 0 0 0 14 3v2a2 2 0 0 1-1.394 1.906L8.677 8.053A1 1 0 0 0 8 9c-.155 6.393-2.082 9-4 9a2 2 0 0 0 0 4h14" />
    </Svg>
);

export default function FantasyStandingsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';

    const users = useStore(state => state.users);
    const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === leagueId);
    const allPlayers = useStore(state => state.players).filter(p => p.leagueId === leagueId);
    const playerBonuses = useStore(state => state.playerBonuses).filter(b => b.leagueId === leagueId);
    const matches = useStore(state => state.matches).filter(m => m.leagueId === leagueId && (m.status === 'finished' || m.played));
    const fantasyLineups = useStore(state => state.fantasyLineups).filter(l => fantasyTeams.some(ft => ft.id === l.fantasyTeamId));

    const [mainTab, setMainTab] = useState<'squadre' | 'giocatori'>('squadre');
    const [viewMode, setViewMode] = useState<'totale' | number>('totale');
    const [playerRoleFilter, setPlayerRoleFilter] = useState<string>('TUTTI');
    const [selectedTeamForDetail, setSelectedTeamForDetail] = useState<any>(null);
    const [selectedPlayerForDetail, setSelectedPlayerForDetail] = useState<any>(null);



    const playedMatchdaysSet = new Set<number>();
    fantasyTeams.forEach(ft => {
        if (ft.matchdayPoints) {
            Object.keys(ft.matchdayPoints).forEach(d => playedMatchdaysSet.add(Number(d)));
        }
    });
    const matchdays = Array.from(playedMatchdaysSet).sort((a, b) => b - a);

    const teamLeaderboard = [...fantasyTeams].sort((a, b) => {
        if (viewMode === 'totale') {
            const ptsA = (a as any).totalPoints || 0;
            const ptsB = (b as any).totalPoints || 0;
            return ptsB - ptsA;
        } else {
            const ptsA = a.matchdayPoints?.[viewMode] || 0;
            const ptsB = b.matchdayPoints?.[viewMode] || 0;
            return ptsB - ptsA;
        }
    });

    const playerFantasyLeaderboard = useMemo(() => {
        const customBonus = league?.settings?.customBonus || { goal: 3, assist: 1, yellowCard: -0.5, redCard: -1, ownGoal: -2, mvp: 1 };
        const pStats = new Map<string, number>();
        
        allPlayers.forEach(p => {
            const bonuses = playerBonuses.filter(b => b.playerId === p.id);
            const totalBonus = bonuses.reduce((sum, b) => sum + b.value, 0);
            pStats.set(p.id, totalBonus);
        });

        matches.forEach(m => {
            const matchPlayers = allPlayers.filter(p => p.realTeamId === m.homeTeamId || p.realTeamId === m.awayTeamId);
            
            matchPlayers.forEach(p => {
                let baseVote = 0;
                if (league?.settings?.baseVoteType === 'manual') {
                    baseVote = m.playerVotes?.[p.id] || 0;
                } else {
                    const isHome = p.realTeamId === m.homeTeamId;
                    const diff = isHome ? (m.homeScore - m.awayScore) : (m.awayScore - m.homeScore);
                    const bands = league?.settings?.autoVoteBands || [];
                    const matchedBand = bands.find(b => diff >= b.minDiff && diff <= b.maxDiff);
                    baseVote = matchedBand ? matchedBand.points : 6;
                }

                if (baseVote > 0) {
                    const currentPts = pStats.get(p.id) || 0;
                    pStats.set(p.id, currentPts + baseVote);
                }
            });

            m.events?.forEach(ev => {
                const currentPts = pStats.get(ev.playerId) || 0;
                const player = allPlayers.find(p => p.id === ev.playerId);
                const category = player?.position || 'normale';
                const type = ev.type;

                let val = 0;
                // Try to get category-specific bonus first
                if (league?.settings?.categoryBonuses?.[type]?.[category] !== undefined) {
                    val = league.settings.categoryBonuses[type][category];
                } else {
                    if (type === 'goal') val = (customBonus.goal ?? 3);
                    if (type === 'assist') val = (customBonus.assist ?? 1);
                    if (type === 'yellow_card') val = -Math.abs(customBonus.yellowCard ?? 0.5);
                    if (type === 'red_card') val = -Math.abs(customBonus.redCard ?? 1);
                    if (type === 'own_goal') val = -Math.abs(customBonus.ownGoal ?? 2);
                    if (type === 'mvp') val = (customBonus.mvp ?? 1);
                    if (type === 'clean_sheet') val = (customBonus.cleanSheet ?? 1);
                }

                if (val !== 0) {
                    pStats.set(ev.playerId, currentPts + val);
                }
            });
        });
        const sorted = allPlayers.map(p => ({ ...p, fantasyPoints: pStats.get(p.id) || 0 }))
            .sort((a, b) => b.fantasyPoints - a.fantasyPoints);
        if (playerRoleFilter === 'TUTTI') return sorted;
        return sorted.filter(p => p.position === playerRoleFilter);
    }, [matches, allPlayers, playerBonuses, league?.settings?.customBonus, playerRoleFilter]);

    const roleOptions = ['TUTTI', ...(league?.settings?.useCustomRoles ? (league.settings.customRoles?.map(r => r.name) || []) : ['POR', 'DIF', 'CEN', 'ATT'])];

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

    const renderPlayerPhoto = (player: any) => {
        if (player.photo) {
            return <Image source={{ uri: player.photo }} style={styles.playerPhoto} />;
        }
        return (
            <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>{player.name.charAt(0)}</Text>
            </View>
        );
    };

    const renderPlayerDetailModal = () => {
        if (!selectedPlayerForDetail) return null;
        const player = selectedPlayerForDetail;
        
        // Calculate detailed history
        const history: { matchday: number; match: string; base: number; bonus: number; total: number; events: any[] }[] = [];
        const customBonus = league.settings.customBonus || { goal: 3, assist: 1, yellowCard: -0.5, redCard: -1, ownGoal: -2, mvp: 1 };

        matches.forEach(m => {
            if (player.realTeamId !== m.homeTeamId && player.realTeamId !== m.awayTeamId) return;
            
            let baseVote = 0;
            if (league.settings.baseVoteType === 'manual') {
                baseVote = m.playerVotes?.[player.id] || 0;
            } else {
                const isHome = player.realTeamId === m.homeTeamId;
                const diff = isHome ? (m.homeScore - m.awayScore) : (m.awayScore - m.homeScore);
                const bands = league.settings.autoVoteBands || [];
                const matchedBand = bands.find(b => diff >= b.minDiff && diff <= b.maxDiff);
                baseVote = matchedBand ? matchedBand.points : 6;
            }

            if (baseVote > 0) {
                const mEvents = m.events.filter(e => e.playerId === player.id);
                let bonusSum = 0;
                const eventSummary: any[] = [];

                mEvents.forEach(ev => {
                    let val = 0;
                    if (league.settings.categoryBonuses?.[ev.type]?.[player.position] !== undefined) {
                        val = league.settings.categoryBonuses[ev.type][player.position];
                    } else {
                        if (ev.type === 'goal') val = customBonus.goal;
                        if (ev.type === 'assist') val = customBonus.assist;
                        if (ev.type === 'yellow_card') val = -Math.abs(customBonus.yellowCard);
                        if (ev.type === 'red_card') val = -Math.abs(customBonus.redCard);
                        if (ev.type === 'own_goal') val = -Math.abs(customBonus.ownGoal);
                        if (ev.type === 'mvp') val = customBonus.mvp;
                    }
                    bonusSum += val;
                    eventSummary.push({ type: ev.type, value: val });
                });

                const homeT = useStore.getState().realTeams.find(rt => rt.id === m.homeTeamId);
                const awayT = useStore.getState().realTeams.find(rt => rt.id === m.awayTeamId);

                history.push({
                    matchday: m.matchday,
                    match: `${homeT?.name} - ${awayT?.name}`,
                    base: baseVote,
                    bonus: bonusSum,
                    total: baseVote + bonusSum,
                    events: eventSummary
                });
            }
        });

        const manualBonuses = playerBonuses.filter(b => b.playerId === player.id);
        const manualTotal = manualBonuses.reduce((s, b) => s + b.value, 0);

        return (
            <Modal visible={!!selectedPlayerForDetail} transparent animationType="slide" onRequestClose={() => setSelectedPlayerForDetail(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {renderPlayerPhoto(player)}
                                <View style={{ marginLeft: 12 }}>
                                    <Text style={styles.modalTitle}>{player.name}</Text>
                                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>{player.position} | {player.realPosition || 'Sconosciuto'}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedPlayerForDetail(null)}>
                                <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>Chiudi</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.sectionLabel}>Storico Prestazioni</Text>
                            
                            {history.length === 0 && manualBonuses.length === 0 && (
                                <Text style={styles.emptyTableText}>Nessun dato disponibile per questo calciatore.</Text>
                            )}

                            {history.sort((a, b) => b.matchday - a.matchday).map((h, i) => (
                                <View key={i} style={styles.breakdownCard}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                        <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>G{h.matchday} | {h.match}</Text>
                                        <Text style={{ color: '#f8fafc', fontWeight: '900', fontSize: 18 }}>{h.total.toFixed(1)}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', gap: 12 }}>
                                        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10 }}>
                                            <Text style={{ color: '#64748b', fontSize: 10 }}>Voto Base</Text>
                                            <Text style={{ color: '#f8fafc', fontWeight: 'bold' }}>{h.base.toFixed(1)}</Text>
                                        </View>
                                        <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 8, borderRadius: 10 }}>
                                            <Text style={{ color: '#64748b', fontSize: 10 }}>Bonus/Malus</Text>
                                            <Text style={{ color: h.bonus >= 0 ? '#4ade80' : '#ef4444', fontWeight: 'bold' }}>{h.bonus > 0 ? '+' : ''}{h.bonus.toFixed(1)}</Text>
                                        </View>
                                    </View>
                                    {h.events.length > 0 && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                                            {h.events.map((ev, ei) => (
                                                <View key={ei} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                                                    {ev.type === 'goal' && <CircleStar size={12} color="#fbbf24" style={{ marginRight: 4 }} />}
                                                    {ev.type === 'assist' && <SportShoe size={12} color="#38bdf8" style={{ marginRight: 4 }} />}
                                                    {(ev.type === 'yellow_card' || ev.type === 'red_card') && <RectangleVertical size={12} color={ev.type === 'yellow_card' ? '#fbbf24' : '#ef4444'} style={{ marginRight: 4 }} />}
                                                    <Text style={{ color: '#94a3b8', fontSize: 10 }}>{ev.type === 'goal' ? 'Gol' : ev.type === 'assist' ? 'Assist' : ev.type === 'yellow_card' ? 'Amm.' : ev.type === 'red_card' ? 'Esp.' : ev.type}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            ))}

                            {manualBonuses.length > 0 && (
                                <>
                                    <Text style={styles.sectionLabel}>Bonus Extra</Text>
                                    <View style={styles.breakdownCard}>
                                        {manualBonuses.map((mb, i) => (
                                            <View key={i} style={[styles.breakdownRow, { borderBottomWidth: i === manualBonuses.length - 1 ? 0 : 1 }]}>
                                                <Info size={14} color="#38bdf8" style={{ marginRight: 8 }} />
                                                <Text style={styles.breakdownName}>{mb.description} (G{mb.matchday})</Text>
                                                <Text style={styles.breakdownValuePositive}>{mb.value > 0 ? '+' : ''}{mb.value}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    const renderScoreBreakdownModal = () => {
        if (!selectedTeamForDetail) return null;
        
        const team = selectedTeamForDetail;
        const lineups = fantasyLineups.filter(l => l.fantasyTeamId === team.id);
        
        let playerScores: { name: string; points: number; role: string }[] = [];
        let teamBonusTotal = 0;
        let predictionTotal = 0;
        let manualAdj = team.manualPointsAdjustment || 0;
        
        if (viewMode === 'totale') {
            const playerMap = new Map<string, { name: string; points: number; role: string }>();
            lineups.forEach(l => {
                if (l.playerPointsDetails) {
                    Object.entries(l.playerPointsDetails).forEach(([pid, detail]: [string, any]) => {
                        const p = allPlayers.find(ap => ap.id === pid);
                        const existing = playerMap.get(pid);
                        if (existing) {
                            existing.points += detail.total;
                        } else {
                            playerMap.set(pid, { name: p?.name || 'Sconosciuto', points: detail.total, role: p?.position || '-' });
                        }
                    });
                }
            });
            playerScores = Array.from(playerMap.values()).sort((a, b) => b.points - a.points);
            
            const totalPoints = team.totalPoints || 0;
            const playerSum = playerScores.reduce((s, p) => s + p.points, 0);
            const extra = totalPoints - playerSum - manualAdj;
            teamBonusTotal = extra > 0 ? extra : 0;
        } else {
            const l = lineups.find(lineup => lineup.matchday === viewMode);
            if (l && l.playerPointsDetails) {
                Object.entries(l.playerPointsDetails).forEach(([pid, detail]: [string, any]) => {
                    const p = allPlayers.find(ap => ap.id === pid);
                    playerScores.push({ name: p?.name || 'Sconosciuto', points: detail.total, role: p?.position || '-' });
                });
            }
            playerScores.sort((a, b) => b.points - a.points);
            
            const totalPoints = team.matchdayPoints?.[viewMode] || 0;
            const playerSum = playerScores.reduce((s, p) => s + p.points, 0);
            teamBonusTotal = totalPoints - playerSum;
        }

        return (
            <Modal visible={!!selectedTeamForDetail} transparent animationType="slide" onRequestClose={() => setSelectedTeamForDetail(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{team.name}</Text>
                            <TouchableOpacity onPress={() => setSelectedTeamForDetail(null)}>
                                <Text style={{ color: '#fbbf24', fontWeight: 'bold' }}>Chiudi</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.sectionLabel}>Dettaglio Punti {viewMode === 'totale' ? 'Totali' : `G${viewMode}`}</Text>
                            
                            <View style={styles.breakdownCard}>
                                {playerScores.map((ps, i) => (
                                    <View key={i} style={styles.breakdownRow}>
                                        <View style={[styles.roleMiniBadge, { backgroundColor: getPosColor(ps.role) }]}>
                                            <Text style={styles.roleMiniText}>{ps.role.slice(0, 1)}</Text>
                                        </View>
                                        <Text style={styles.breakdownName}>{ps.name}</Text>
                                        <Text style={ps.points >= 6 ? styles.breakdownValuePositive : styles.breakdownValueNegative}>
                                            {ps.points.toFixed(1)}
                                        </Text>
                                    </View>
                                ))}
                                
                                {teamBonusTotal !== 0 && (
                                    <View style={[styles.breakdownRow, { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', marginTop: 8, paddingTop: 8 }]}>
                                        <Award size={14} color="#fbbf24" style={{ marginRight: 8 }} />
                                        <Text style={[styles.breakdownName, { color: '#fbbf24' }]}>Bonus & Pronostici</Text>
                                        <Text style={[styles.breakdownValuePositive, { color: '#fbbf24' }]}>+{teamBonusTotal.toFixed(1)}</Text>
                                    </View>
                                )}

                                {manualAdj !== 0 && viewMode === 'totale' && (
                                    <View style={styles.breakdownRow}>
                                        <Activity size={14} color="#38bdf8" style={{ marginRight: 8 }} />
                                        <Text style={[styles.breakdownName, { color: '#38bdf8' }]}>Aggiustamento Manuale</Text>
                                        <Text style={[styles.breakdownValuePositive, { color: '#38bdf8' }]}>{manualAdj > 0 ? '+' : ''}{manualAdj.toFixed(1)}</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.totalRow}>
                                <Text style={styles.totalLabel}>TOTALE</Text>
                                <Text style={styles.totalValue}>
                                    {(viewMode === 'totale' ? team.totalPoints : team.matchdayPoints?.[viewMode] || 0).toFixed(1)} pt
                                </Text>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        );
    };

    if (!league || !league.settings.hasFantasy) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Torneo non impostato o Fantacalcio disabilitato.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Classifiche Fantasy</Text>
            </View>

            {renderScoreBreakdownModal()}
            {renderPlayerDetailModal()}

            <View style={styles.mainTabsWrapper}>
                <TouchableOpacity
                    style={[styles.mainTabBtn, mainTab === 'squadre' && styles.mainTabBtnActive]}
                    onPress={() => setMainTab('squadre')}
                >
                    <Trophy size={18} color={mainTab === 'squadre' ? '#38bdf8' : '#64748b'} style={{ marginRight: 8 }} />
                    <Text style={[styles.mainTabText, mainTab === 'squadre' && styles.mainTabTextActive]}>Squadre</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.mainTabBtn, mainTab === 'giocatori' && styles.mainTabBtnActive]}
                    onPress={() => setMainTab('giocatori')}
                >
                    <Star size={18} color={mainTab === 'giocatori' ? '#38bdf8' : '#64748b'} style={{ marginRight: 8 }} />
                    <Text style={[styles.mainTabText, mainTab === 'giocatori' && styles.mainTabTextActive]}>Giocatori</Text>
                </TouchableOpacity>
            </View>

            {mainTab === 'squadre' && (
                <View style={styles.subTabsWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
                        <TouchableOpacity
                            style={[styles.subTabBtn, viewMode === 'totale' && styles.subTabBtnActive]}
                            onPress={() => setViewMode('totale')}
                        >
                            <Text style={[styles.subTabText, viewMode === 'totale' && styles.subTabTextActive]}>Classifica Generale</Text>
                        </TouchableOpacity>
                        {league.settings.rosterType === 'variable' && matchdays.map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.subTabBtn, viewMode === m && styles.subTabBtnActive]}
                                onPress={() => setViewMode(m)}
                            >
                                <Text style={[styles.subTabText, viewMode === m && styles.subTabTextActive]}>Giornata {m}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {mainTab === 'giocatori' && (
                <View style={styles.subTabsWrapper}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subTabsScroll}>
                        {roleOptions.map(pos => (
                            <TouchableOpacity
                                key={pos}
                                style={[styles.subTabBtn, playerRoleFilter === pos && styles.subTabBtnActive]}
                                onPress={() => setPlayerRoleFilter(pos)}
                            >
                                <Text style={[styles.subTabText, playerRoleFilter === pos && styles.subTabTextActive]}>{pos}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    {mainTab === 'squadre' ? (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.colPos, styles.headerText]}>#</Text>
                                <Text style={[styles.colName, styles.headerText]}>SQUADRA / UTENTE</Text>
                                <Text style={[styles.colPoints, styles.headerText]}>PUNTI</Text>
                            </View>
                            {fantasyTeams.length === 0 ? (
                                <Text style={styles.emptyTableText}>Nessuna fantasquadra creata.</Text>
                            ) : (
                                teamLeaderboard.map((team, idx) => {
                                    const isTop = idx === 0;
                                    let points = viewMode === 'totale' ? ((team as any).totalPoints || 0) : (team.matchdayPoints?.[viewMode] || 0);
                                    const user = users.find(u => u.id === team.userId);
                                    return (
                                        <TouchableOpacity key={team.id} style={styles.tableRow} onPress={() => setSelectedTeamForDetail(team)}>
                                            <Text style={[styles.colPos, isTop && styles.textGold]}>{idx + 1}</Text>
                                            <View style={styles.colName}>
                                                <Text style={styles.teamNameText} numberOfLines={1}>{team.name}</Text>
                                                {user && <Text style={styles.userNameText} numberOfLines={1}>👤 {user.firstName} {user.lastName}</Text>}
                                            </View>
                                            <View style={styles.pointsContainer}>
                                                <Text style={styles.pointsValue}>{points.toFixed(1)}</Text>
                                                <Text style={styles.pointsUnit}>pt</Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </>
                    ) : (
                        <>
                            <View style={styles.tableHeader}>
                                <Text style={[styles.colPos, styles.headerText]}>#</Text>
                                <Text style={[styles.colName, styles.headerText]}>CALCIATORE</Text>
                                <Text style={[styles.colPoints, styles.headerText]}>PUNTI TOT.</Text>
                            </View>
                            {playerFantasyLeaderboard.length === 0 ? (
                                <Text style={styles.emptyTableText}>Nessun giocatore trovato.</Text>
                            ) : (
                                playerFantasyLeaderboard.map((player, idx) => (
                                    <TouchableOpacity key={player.id} style={styles.tableRow} onPress={() => setSelectedPlayerForDetail(player)}>
                                        <Text style={[styles.colPos]}>{idx + 1}</Text>
                                        {renderPlayerPhoto(player)}
                                        <View style={[styles.colName, { flexDirection: 'column', alignItems: 'flex-start', marginLeft: 10 }]}>
                                            <View style={[styles.roleBadge, { backgroundColor: getPosColor(player.position) }]}>
                                                <Text style={styles.roleBadgeText}>{player.position.slice(0, 3)}</Text>
                                            </View>
                                            <Text style={styles.teamNameText} numberOfLines={1}>{player.name}</Text>
                                        </View>
                                        <View style={styles.pointsContainer}>
                                            <Text style={[styles.pointsValue, { color: '#4ade80' }]}>{player.fantasyPoints.toFixed(1)}</Text>
                                            <Text style={styles.pointsUnit}>pt</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </>
                    )}
                </View>
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    mainTabsWrapper: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.02)', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    mainTabBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    mainTabBtnActive: { borderBottomColor: '#38bdf8', backgroundColor: 'rgba(56, 189, 248, 0.05)' },
    mainTabText: { color: '#64748b', fontWeight: 'bold', fontSize: 14 },
    mainTabTextActive: { color: '#38bdf8' },
    subTabsWrapper: { backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    subTabsScroll: { paddingHorizontal: 16, paddingVertical: 12 },
    subTabBtn: { paddingHorizontal: 16, paddingVertical: 8, marginRight: 12, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'transparent' },
    subTabBtnActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.2)' },
    subTabText: { color: '#94a3b8', fontWeight: 'bold', fontSize: 13 },
    subTabTextActive: { color: '#38bdf8' },
    content: { padding: 16 },
    card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)', paddingBottom: 12, marginBottom: 8, paddingHorizontal: 4 },
    headerText: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', paddingHorizontal: 4 },
    colPos: { width: 35, fontWeight: '900', color: '#475569', fontSize: 16 },
    textGold: { color: '#fbbf24' },
    colName: { flex: 1, paddingRight: 10, justifyContent: 'center' },
    colPoints: { width: 90, textAlign: 'right' },
    teamNameText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16, marginBottom: 2 },
    userNameText: { color: '#64748b', fontSize: 12, fontWeight: '500' },
    pointsContainer: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end', width: 90 },
    pointsValue: { color: '#38bdf8', fontWeight: '900', fontSize: 20 },
    pointsUnit: { color: '#64748b', fontSize: 12, marginLeft: 4, fontWeight: 'bold' },
    emptyTableText: { color: '#475569', textAlign: 'center', paddingVertical: 30, fontSize: 15 },
    roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
    roleBadgeText: { color: '#000', fontSize: 10, fontWeight: '900' },
    playerPhoto: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)' },
    photoPlaceholder: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    photoPlaceholderText: { color: '#475569', fontWeight: 'bold', fontSize: 18 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold' },
    sectionLabel: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold', letterSpacing: 1, marginBottom: 12, textTransform: 'uppercase' },
    breakdownCard: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 16, marginBottom: 20 },
    breakdownRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.02)' },
    roleMiniBadge: { width: 24, height: 24, borderRadius: 6, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    roleMiniText: { color: '#000', fontSize: 10, fontWeight: 'bold' },
    breakdownName: { flex: 1, color: '#f8fafc', fontSize: 15 },
    breakdownValuePositive: { color: '#4ade80', fontWeight: 'bold', fontSize: 16 },
    breakdownValueNegative: { color: '#ef4444', fontWeight: 'bold', fontSize: 16 },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTopWidth: 2, borderTopColor: 'rgba(255,255,255,0.1)' },
    totalLabel: { color: '#f8fafc', fontSize: 18, fontWeight: 'bold' },
    totalValue: { color: '#fbbf24', fontSize: 24, fontWeight: '900' }
});
