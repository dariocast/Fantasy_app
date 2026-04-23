import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Timer, Calendar, ChevronRight, Users, Trophy, ShieldAlert, Sparkles, Settings, Flag, BarChart3, Star, Zap, Info, LayoutGrid } from 'lucide-react-native';
import { useStore } from '../store';
import type { League, FantasyTeam, RealTeam, Match } from '../types';

export default function DashboardScreen({ navigation }: any) {
  const leagues = useStore(state => state.leagues);
  const activeLeagueId = useStore(state => state.activeLeagueId);
  const league = leagues.find(l => l.id === activeLeagueId);
  const id = league?.id;

  const fantasyTeams = useStore(state => state.fantasyTeams).filter(f => f.leagueId === id);
  const realTeams = useStore(state => state.realTeams).filter(t => t.leagueId === id);
  const matches = useStore(state => state.matches).filter(m => m.leagueId === id && m.status === 'finished');

  const currentUser = useStore(state => state.currentUser);
  const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

  const [countdown, setCountdown] = useState<{ label: string; time: string; isExpiring: boolean } | null>(null);
  const [fantasyViewMode, setFantasyViewMode] = useState<'totale' | number>('totale');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date().getTime();
      let nextDeadline = Infinity;
      let matchdayLabel = '';
      const isVariable = league?.settings.rosterType === 'variable';

      if (isVariable && league?.settings.matchdayDeadlines) {
        Object.entries(league.settings.matchdayDeadlines).forEach(([md, dateStr]) => {
          const dTime = new Date(dateStr as string).getTime();
          if (dTime > now && dTime < nextDeadline) {
            nextDeadline = dTime;
            matchdayLabel = `G${md}`;
          }
        });
      } else if (!isVariable && league?.settings.fantasyMarketDeadline) {
        const dTime = new Date(league.settings.fantasyMarketDeadline).getTime();
        if (dTime > now) {
          nextDeadline = dTime;
          matchdayLabel = 'Unica';
        }
      }

      if (nextDeadline !== Infinity) {
        const distance = nextDeadline - now;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const timeStr = `${days > 0 ? days + 'g ' : ''}${hours}h ${minutes}m ${seconds}s`;
        setCountdown({
          label: matchdayLabel,
          time: timeStr,
          isExpiring: distance < (1000 * 60 * 60 * 2)
        });
      } else {
        setCountdown(null);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [league?.settings.matchdayDeadlines, league?.settings.fantasyMarketDeadline, league?.settings.rosterType, id]);

  if (!league) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Nessun torneo disponibile.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const playedMatchdaysSet = new Set<number>();
  fantasyTeams.forEach(ft => {
    if (ft.matchdayPoints) {
      Object.keys(ft.matchdayPoints).forEach(d => playedMatchdaysSet.add(Number(d)));
    }
  });
  const playedMatchdays = Array.from(playedMatchdaysSet).sort((a, b) => b - a);

  const fantasyLeaderboard = [...fantasyTeams].sort((a, b) => {
    if (fantasyViewMode === 'totale') {
      const ptsA = (a as any).totalPoints || 0;
      const ptsB = (b as any).totalPoints || 0;
      return ptsB - ptsA;
    } else {
      const ptsA = a.matchdayPoints?.[fantasyViewMode] || 0;
      const ptsB = b.matchdayPoints?.[fantasyViewMode] || 0;
      return ptsB - ptsA;
    }
  });

  const realStandings = [...realTeams].map(t => {
    let points = 0;
    let played = 0;
    let gf = 0;
    let gs = 0;

    matches.forEach(m => {
      if (m.matchType && m.matchType !== 'campionato' && m.matchType !== 'gironi') return;
      if (m.homeTeamId === t.id) {
        played++;
        gf += m.homeScore;
        gs += m.awayScore;
        if (m.homeScore > m.awayScore) points += 3;
        else if (m.homeScore === m.awayScore) points += 1;
      } else if (m.awayTeamId === t.id) {
        played++;
        gf += m.awayScore;
        gs += m.homeScore;
        if (m.awayScore > m.homeScore) points += 3;
        else if (m.awayScore === m.homeScore) points += 1;
      }
    });
    return { ...t, points, played, gf, gs, dr: gf - gs };
  }).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const drA = a.gf - a.gs;
    const drB = b.gf - b.gs;
    if (drB !== drA) return drB - drA;
    return b.gf - a.gf;
  });

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>{league.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Zap size={14} color="#fbbf24" style={{ marginRight: 6 }} />
            <Text style={styles.subtitle}>Dashboard Torneo</Text>
          </View>
        </View>

        {league.settings.hasFantasy && currentUser && (
          (() => {
            const myFantasyTeamIndex = fantasyLeaderboard.findIndex((t: any) => t.userId === currentUser.id);
            const myFantasyTeam = myFantasyTeamIndex >= 0 ? fantasyLeaderboard[myFantasyTeamIndex] : null;
            if (!myFantasyTeam) return null;
            const isFirst = myFantasyTeamIndex === 0;
            const myFantasyPosition = myFantasyTeamIndex + 1;
            const points = fantasyViewMode === 'totale' ? (myFantasyTeam as any).totalPoints || 0 : myFantasyTeam.matchdayPoints?.[fantasyViewMode] || 0;
            return (
              <TouchableOpacity 
                style={[styles.premiumCard, isFirst && styles.cardFirst]}
                onPress={() => navigation.navigate('Squad')}
              >
                <View style={styles.row}>
                  <View style={[styles.posCircle, isFirst && { backgroundColor: '#fbbf24' }]}>
                    <Trophy color={isFirst ? '#000' : '#38bdf8'} size={24} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTag, isFirst && { color: '#fbbf24' }]}>La tua Fantasquadra</Text>
                    <Text style={styles.cardMainText}>{myFantasyPosition}º Posto</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.cardValueText}>{points.toFixed(1)}</Text>
                    <Text style={styles.cardValueSub}>Punti</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })()
        )}

        {countdown && (
          <View style={[styles.card, countdown.isExpiring && styles.cardExpiring]}>
            <View style={styles.countdownRow}>
              <View style={styles.iconContainer}>
                <Timer color={countdown.isExpiring ? '#ef4444' : '#38bdf8'} size={28} />
              </View>
              <View style={styles.countdownTexts}>
                <Text style={styles.countdownTitle} numberOfLines={1}>Schiera la Formazione!</Text>
                <Text style={styles.countdownSub}>Formazione: {countdown.label}</Text>
                <Text style={styles.countdownTime}>Scade tra: <Text style={[styles.timeBold, countdown.isExpiring && styles.textError]}>{countdown.time}</Text></Text>
              </View>
            </View>
            <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Formation')}>
              <Text style={styles.actionBtnText}>Schiera Ora</Text>
              <ChevronRight color="#fff" size={18} />
            </TouchableOpacity>
          </View>
        )}

        {league.settings.hasFantasy && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Star color="#fbbf24" size={20} />
                <Text style={styles.cardTitle}>{fantasyViewMode === 'totale' ? 'Top Fantasy' : `Classifica G${fantasyViewMode}`}</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('FantasyStandings')}>
                <Text style={styles.seeMoreBtn}>Classifica &gt;</Text>
              </TouchableOpacity>
            </View>
            
            {league.settings.rosterType === 'variable' && playedMatchdays.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginBottom: 15 }}>
                <TouchableOpacity style={[styles.miniChip, fantasyViewMode === 'totale' && styles.miniChipActive]} onPress={() => setFantasyViewMode('totale')}>
                  <Text style={[styles.miniChipText, fantasyViewMode === 'totale' && styles.miniChipTextActive]}>Generale</Text>
                </TouchableOpacity>
                {playedMatchdays.map(md => (
                  <TouchableOpacity key={md} style={[styles.miniChip, fantasyViewMode === md && styles.miniChipActive]} onPress={() => setFantasyViewMode(md)}>
                    <Text style={[styles.miniChipText, fantasyViewMode === md && styles.miniChipTextActive]}>G{md}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.table}>
              {fantasyLeaderboard.slice(0, 5).map((team: any, idx: number) => {
                const points = fantasyViewMode === 'totale' ? (team.totalPoints || 0) : (team.matchdayPoints?.[fantasyViewMode] || 0);
                return (
                  <View key={team.id} style={styles.tableRow}>
                    <View style={[styles.rankBadge, idx === 0 && { backgroundColor: '#fbbf24' }]}>
                      <Text style={[styles.rankText, idx === 0 && { color: '#000' }]}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.colName} numberOfLines={1}>{team.name}</Text>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsText}>{points.toFixed(1)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <LayoutGrid color="#38bdf8" size={20} />
              <Text style={styles.cardTitle}>Campionato Reale</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Standings')}>
              <Text style={styles.seeMoreBtn}>Classifica &gt;</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.table}>
            {realStandings.slice(0, 5).map((team, idx) => (
              <View key={team.id} style={styles.tableRow}>
                <View style={[styles.rankBadge, idx === 0 && { backgroundColor: '#fbbf24' }]}>
                  <Text style={[styles.rankText, idx === 0 && { color: '#000' }]}>{idx + 1}</Text>
                </View>
                <Text style={styles.colName} numberOfLines={1}>{team.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>{team.played} pg</Text>
                  <View style={[styles.pointsBadge, { backgroundColor: 'rgba(56, 189, 248, 0.1)' }]}>
                    <Text style={[styles.pointsText, { color: '#38bdf8' }]}>{team.points}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Calendario')}>
            <View style={styles.actionHeader}><Calendar color="#38bdf8" size={20} /><Text style={styles.actionTitle} numberOfLines={1}>Partite</Text></View>
            <Text style={styles.actionDesc} numberOfLines={2}>Il calendario delle sfide.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('TeamsViewer')}>
            <View style={styles.actionHeader}><Flag color="#38bdf8" size={20} /><Text style={styles.actionTitle} numberOfLines={1}>Squadre</Text></View>
            <Text style={styles.actionDesc} numberOfLines={2}>Tutte le rose.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('StatsViewer')}>
            <View style={styles.actionHeader}><BarChart3 color="#38bdf8" size={20} /><Text style={styles.actionTitle} numberOfLines={1}>Stats</Text></View>
            <Text style={styles.actionDesc} numberOfLines={2}>Marcatori e assist.</Text>
          </TouchableOpacity>
          {league.settings.hasFantasy && (
            <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Squad')}>
              <View style={styles.actionHeader}><Users color="#38bdf8" size={20} /><Text style={styles.actionTitle} numberOfLines={1}>Mercato</Text></View>
              <Text style={styles.actionDesc} numberOfLines={2}>Gestisci la rosa.</Text>
            </TouchableOpacity>
          )}
        </View>

        {isAdmin && (
          <View style={{ marginTop: 8 }}>
            <Text style={styles.sectionHeading}>Amministrazione</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={[styles.actionCard, { borderColor: '#ef4444', borderWidth: 1 }]} onPress={() => navigation.navigate('TournamentAdmin')}>
                <View style={styles.actionHeader}><ShieldAlert color="#ef4444" size={18} /><Text style={styles.actionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Gestione Torneo</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionCard, { borderColor: '#fbbf24', borderWidth: 1 }]} onPress={() => navigation.navigate('FantasyAdmin')}>
                <View style={styles.actionHeader}><Sparkles color="#fbbf24" size={18} /><Text style={styles.actionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Gestione Fantasy</Text></View>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionCard, { borderColor: '#94a3b8', borderWidth: 1 }]} onPress={() => navigation.navigate('TournamentSettings')}>
                <View style={styles.actionHeader}><Settings color="#94a3b8" size={18} /><Text style={styles.actionTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>Impostazioni Torneo</Text></View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#94a3b8' },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 25, paddingHorizontal: 4 },
  title: { fontSize: 28, fontWeight: '900', color: '#f8fafc', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: '#64748b', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 },
  premiumCard: { backgroundColor: 'rgba(56, 189, 248, 0.05)', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(56, 189, 248, 0.1)' },
  cardFirst: { backgroundColor: 'rgba(251, 191, 36, 0.05)', borderColor: 'rgba(251, 191, 36, 0.2)' },
  posCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(56, 189, 248, 0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  cardTag: { color: '#38bdf8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  cardMainText: { color: '#f8fafc', fontSize: 22, fontWeight: '900' },
  cardValueText: { color: '#f8fafc', fontSize: 24, fontWeight: '900' },
  cardValueSub: { color: '#64748b', fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.04)', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.06)' },
  cardExpiring: { borderLeftWidth: 4, borderLeftColor: '#ef4444' },
  row: { flexDirection: 'row', alignItems: 'center' },
  countdownRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  iconContainer: { width: 55, height: 55, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.03)', alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  countdownTexts: { flex: 1 },
  countdownTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc', marginBottom: 2 },
  countdownSub: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold' },
  countdownTime: { color: '#64748b', fontSize: 13, marginTop: 4 },
  timeBold: { fontWeight: '900', color: '#f8fafc' },
  textError: { color: '#ef4444' },
  actionBtn: { backgroundColor: '#38bdf8', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 15 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16, marginRight: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: '#f8fafc' },
  seeMoreBtn: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold' },
  table: { width: '100%' },
  tableRow: { flexDirection: 'row', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  rankBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  rankText: { color: '#94a3b8', fontSize: 12, fontWeight: 'bold' },
  colName: { flex: 1, color: '#f8fafc', fontWeight: '600', fontSize: 15 },
  pointsBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: 'rgba(251, 191, 36, 0.1)' },
  pointsText: { color: '#fbbf24', fontWeight: '900', fontSize: 13 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  actionCard: { flex: 1, minWidth: '48%', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.05)' },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  actionTitle: { color: '#f8fafc', fontWeight: 'bold', marginLeft: 8, fontSize: 13 },
  actionDesc: { color: '#64748b', fontSize: 12, lineHeight: 16 },
  miniChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255, 255, 255, 0.04)', marginRight: 8, borderWidth: 1, borderColor: 'transparent' },
  miniChipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
  miniChipText: { color: '#64748b', fontSize: 12, fontWeight: 'bold' },
  miniChipTextActive: { color: '#38bdf8' },
  sectionHeading: { fontSize: 18, fontWeight: '900', color: '#f8fafc', marginBottom: 15, marginTop: 25, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
});
