import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Timer, Calendar, ChevronRight, Users, Trophy, ShieldAlert, Sparkles, Settings, Flag, BarChart3 } from 'lucide-react-native';
import { useStore } from '../store';
import type { League, FantasyTeam, RealTeam, Match } from '../types';

export default function DashboardScreen({ navigation }: any) {
  const leagues = useStore(state => state.leagues);
  const activeLeagueId = useStore(state => state.activeLeagueId);
  const league = leagues.find(l => l.id === activeLeagueId) || (leagues.length > 0 ? leagues[0] : null);
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
          const dTime = new Date(dateStr).getTime();
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
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>Nessun torneo disponibile.</Text>
      </View>
    );
  }

  // Identify all played matchdays that have points
  const playedMatchdaysSet = new Set<number>();
  fantasyTeams.forEach(ft => {
    if (ft.matchdayPoints) {
      Object.keys(ft.matchdayPoints).forEach(d => playedMatchdaysSet.add(Number(d)));
    }
  });
  const playedMatchdays = Array.from(playedMatchdaysSet).sort((a, b) => b - a);

  // Calculate fantasy leaderboard
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

  // Calculate real standings
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
        if (m.homeScore > m.awayScore) {
          points += 3;
        } else if (m.homeScore === m.awayScore) {
          if (league.settings.groupPenaltiesEnabled && m.homePenalties !== undefined && m.awayPenalties !== undefined && m.homePenalties !== m.awayPenalties) {
            if (m.homePenalties > m.awayPenalties) points += (league.settings.groupPenaltiesWinPoints ?? 2);
            else points += (league.settings.groupPenaltiesLossPoints ?? 1);
          } else {
            points += 1;
          }
        }
      } else if (m.awayTeamId === t.id) {
        played++;
        gf += m.awayScore;
        gs += m.homeScore;
        if (m.awayScore > m.homeScore) {
          points += 3;
        } else if (m.awayScore === m.homeScore) {
          if (league.settings.groupPenaltiesEnabled && m.homePenalties !== undefined && m.awayPenalties !== undefined && m.homePenalties !== m.awayPenalties) {
            if (m.awayPenalties > m.homePenalties) points += (league.settings.groupPenaltiesWinPoints ?? 2);
            else points += (league.settings.groupPenaltiesLossPoints ?? 1);
          } else {
            points += 1;
          }
        }
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Panoramica Torneo</Text>
        <Text style={styles.subtitle}>Benvenuto in {league.name}</Text>
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
            <View style={[styles.card, { backgroundColor: isFirst ? 'rgba(251, 191, 36, 0.1)' : 'rgba(14, 165, 233, 0.1)', borderColor: isFirst ? '#fbbf24' : '#0ea5e9' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ backgroundColor: isFirst ? '#fbbf24' : '#0ea5e9', padding: 12, borderRadius: 12, marginRight: 16 }}>
                  <Trophy color={isFirst ? '#000' : '#fff'} size={24} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: isFirst ? '#fbbf24' : '#0ea5e9', fontSize: 13, fontWeight: 'bold', textTransform: 'uppercase' }}>La tua Fantasquadra</Text>
                  <Text style={{ color: '#f8fafc', fontSize: 20, fontWeight: 'bold' }}>{myFantasyPosition}º Posto</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#f8fafc', fontSize: 22, fontWeight: 'bold' }}>{points.toFixed(1)}</Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12 }}>Punti Tot.</Text>
                </View>
              </View>
            </View>
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
              <Text style={styles.countdownTitle}>Schiera la Formazione!</Text>
              <Text style={styles.countdownSub}>
                Formazione: {countdown.label}
              </Text>
              <Text style={styles.countdownTime}>
                Scade tra: <Text style={[styles.timeBold, countdown.isExpiring && styles.textError]}>{countdown.time}</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate('Formation')}
          >
            <Text style={styles.actionBtnText}>Schiera Ora</Text>
            <ChevronRight color="#fff" size={18} />
          </TouchableOpacity>
        </View>
      )}

      {/* Classifica Fantasy */}
      {league.settings.hasFantasy && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {fantasyViewMode === 'totale' ? 'Classifica Fantasy' : `Giornata ${fantasyViewMode}`}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('FantasyStandings')}>
              <Text style={{ color: '#38bdf8', fontSize: 14 }}>Vedi tutta &gt;</Text>
            </TouchableOpacity>
          </View>

          {/* Matchday Selector */}
          {playedMatchdays.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <TouchableOpacity
                style={[styles.matchdayChip, fantasyViewMode === 'totale' && styles.matchdayChipActive]}
                onPress={() => setFantasyViewMode('totale')}
              >
                <Text style={[styles.matchdayChipText, fantasyViewMode === 'totale' && styles.matchdayChipTextActive]}>Generale</Text>
              </TouchableOpacity>
              {playedMatchdays.map(md => (
                <TouchableOpacity
                  key={md}
                  style={[styles.matchdayChip, fantasyViewMode === md && styles.matchdayChipActive]}
                  onPress={() => setFantasyViewMode(md)}
                >
                  <Text style={[styles.matchdayChipText, fantasyViewMode === md && styles.matchdayChipTextActive]}>G{md}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <View style={styles.table}>
            {fantasyTeams.length === 0 ? (
              <Text style={styles.emptyTable}>Nessuna fantasquadra creata.</Text>
            ) : (
              fantasyLeaderboard.slice(0, 5).map((team: any, idx: number) => {
                const points = fantasyViewMode === 'totale'
                  ? (team.totalPoints || 0)
                  : (team.matchdayPoints?.[fantasyViewMode] || 0);
                return (
                  <View key={team.id} style={styles.tableRow}>
                    <Text style={[styles.colPos, idx === 0 && styles.textGold]}>{idx + 1}</Text>
                    <Text style={styles.colName} numberOfLines={1}>{team.name}</Text>
                    <Text style={styles.colPoints}>{points} pt</Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {/* Classifica Reale */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Classifica Torneo Reale</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Standings')}>
            <Text style={{ color: '#38bdf8', fontSize: 14 }}>Vedi tutta &gt;</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.table}>
          {realStandings.length === 0 ? (
            <Text style={styles.emptyTable}>Nessuna squadra iscritta.</Text>
          ) : (
            realStandings.slice(0, 5).map((team, idx) => (
              <View key={team.id} style={styles.tableRow}>
                <Text style={[styles.colPos, idx === 0 && styles.textGold]}>{idx + 1}</Text>
                <Text style={styles.colName} numberOfLines={1}>{team.name}</Text>
                <Text style={styles.colPlayed}>{team.played} pg</Text>
                <Text style={styles.colPoints}>{team.points} pt</Text>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Calendario')}>
          <View style={styles.actionHeader}>
            <Calendar color="#38bdf8" size={20} />
            <Text style={styles.actionTitle}>Prossime Partite</Text>
          </View>
          <Text style={styles.actionDesc}>Il calendario delle sfide dirette.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('TeamsViewer')}>
          <View style={styles.actionHeader}>
            <Flag color="#38bdf8" size={20} />
            <Text style={styles.actionTitle}>Squadre</Text>
          </View>
          <Text style={styles.actionDesc}>Tutte le squadre e le rose.</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('StatsViewer')}>
          <View style={styles.actionHeader}>
            <BarChart3 color="#38bdf8" size={20} />
            <Text style={styles.actionTitle}>Statistiche</Text>
          </View>
          <Text style={styles.actionDesc}>Classifiche marcatori e assist.</Text>
        </TouchableOpacity>

        {league.settings.hasFantasy && (
          <>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Squad')}
            >
              <View style={styles.actionHeader}>
                <Users color="#38bdf8" size={20} />
                <Text style={styles.actionTitle}>Mercato & Rosa</Text>
              </View>
              <Text style={styles.actionDesc}>Acquista, svincola e gestisci la rosa.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Formation')}
            >
              <View style={styles.actionHeader}>
                <Timer color="#38bdf8" size={20} />
                <Text style={styles.actionTitle}>Schiera Formazione</Text>
              </View>
              <Text style={styles.actionDesc}>Prepara la tattica per la giornata.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Lineups')}
            >
              <View style={styles.actionHeader}>
                <Users color="#38bdf8" size={20} />
                <Text style={styles.actionTitle}>Formazioni Schierate</Text>
              </View>
              <Text style={styles.actionDesc}>Vedi le scelte degli altri giocatori.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('FantasyStandings')}
            >
              <View style={styles.actionHeader}>
                <Trophy color="#38bdf8" size={20} />
                <Text style={styles.actionTitle}>Classifica Fantasy</Text>
              </View>
              <Text style={styles.actionDesc}>Controlla i punteggi del fantacalcio.</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {isAdmin && (
        <View style={{ marginTop: 24 }}>
          <Text style={styles.sectionHeading}>Pannello Amministratore</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity
              style={[styles.actionCard, { borderColor: '#ef4444', borderWidth: 1 }]}
              onPress={() => navigation.navigate('TournamentAdmin')}
            >
              <View style={styles.actionHeader}>
                <ShieldAlert color="#ef4444" size={20} />
                <Text style={styles.actionTitle}>Gestione Torneo</Text>
              </View>
              <Text style={styles.actionDesc}>Modifica squadre e partite.</Text>
            </TouchableOpacity>

            {league.settings.hasFantasy && (
              <TouchableOpacity
                style={[styles.actionCard, { borderColor: '#fbbf24', borderWidth: 1 }]}
                onPress={() => navigation.navigate('FantasyAdmin')}
              >
                <View style={styles.actionHeader}>
                  <Sparkles color="#fbbf24" size={20} />
                  <Text style={styles.actionTitle}>Pannello Fantasy</Text>
                </View>
                <Text style={styles.actionDesc}>Bonus e calcolo giornata.</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionCard, { borderColor: '#94a3b8', borderWidth: 1 }]}
              onPress={() => navigation.navigate('TournamentSettings')}
            >
              <View style={styles.actionHeader}>
                <Settings color="#94a3b8" size={20} />
                <Text style={styles.actionTitle}>Impostazioni</Text>
              </View>
              <Text style={styles.actionDesc}>Regole e co-admin.</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#94a3b8',
    fontSize: 16,
  },
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#38bdf8', // primary-light
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardExpiring: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  countdownTexts: {
    flex: 1,
  },
  countdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 4,
  },
  countdownSub: {
    color: '#94a3b8',
    fontSize: 14,
  },
  countdownTime: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  timeBold: {
    fontWeight: 'bold',
    color: '#38bdf8',
  },
  textError: {
    color: '#ef4444',
  },
  actionBtn: {
    backgroundColor: '#0ea5e9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  table: {
    width: '100%',
  },
  emptyTable: {
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  colPos: {
    width: 30,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  textGold: {
    color: '#fbbf24',
  },
  colName: {
    flex: 1,
    color: '#f8fafc',
    fontWeight: '500',
    marginRight: 8,
  },
  colPlayed: {
    width: 50,
    color: '#94a3b8',
    textAlign: 'right',
    fontSize: 13,
  },
  colPoints: {
    width: 50,
    color: '#38bdf8',
    fontWeight: 'bold',
    textAlign: 'right',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    color: '#f8fafc',
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 15,
  },
  actionDesc: {
    color: '#94a3b8',
    fontSize: 13,
  },
  matchdayChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  matchdayChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderColor: '#38bdf8',
  },
  matchdayChipText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  matchdayChipTextActive: {
    color: '#38bdf8',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  }
});
