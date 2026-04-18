import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, StatusBar, ScrollView, Dimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Shield, Settings, Users, ArrowLeft, Trophy, LayoutDashboard, Calendar, Flag, Eye, BarChart3, ChevronDown, ChevronUp, LogOut, X, Menu } from 'lucide-react-native';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

// Import all screens
import DashboardScreen from '../screens/DashboardScreen';
import StandingsScreen from '../screens/StandingsScreen';
import TeamsViewerScreen from '../screens/TeamsViewerScreen';
import StatsViewerScreen from '../screens/StatsViewerScreen';
import CalendarScreen from '../screens/CalendarScreen';

import SquadScreen from '../screens/SquadScreen';
import FormationScreen from '../screens/FormationScreen';
import LineupsScreen from '../screens/LineupsScreen';
import FantasyStandingsScreen from '../screens/FantasyStandingsScreen';

import TournamentAdminScreen from '../screens/TournamentAdminScreen';
import FantasyAdminScreen from '../screens/FantasyAdminScreen';
import TournamentSettingsScreen from '../screens/TournamentSettingsScreen';


const Drawer = createDrawerNavigator();

function CustomDrawerContent(props: any) {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const currentUser = useStore(state => state.currentUser);
    const leagues = useStore(state => state.leagues);
    const setCurrentUser = useStore(state => state.setCurrentUser);

    const league = leagues && leagues.length > 0 ? leagues[0] : null; 
    const resetStore = useStore(state => state.resetStore);

    const [openTorneo, setOpenTorneo] = useState(true);
    const [openFantasy, setOpenFantasy] = useState(true);
    const [openGestione, setOpenGestione] = useState(true);

    if (!currentUser || !league) return null;

    const userRole = league.roles[currentUser.id] || 'user';
    const isAdmin = userRole === 'admin';
    const isOrganizer = userRole === 'organizer' || isAdmin;

    const handleLogout = async () => {
        await supabase.auth.signOut();
        resetStore();
        navigation.navigate('Auth');
    };

    const closeDrawer = () => {
        props.navigation.closeDrawer();
    };

    // Get current active route name
    const activeRoute = props.state?.routeNames?.[props.state?.index] || '';

    const navItem = (label: string, icon: any, screen: string) => {
        const isActive = activeRoute === screen;
        return (
            <TouchableOpacity
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => {
                    props.navigation.navigate(screen);
                }}
                activeOpacity={0.7}
            >
                <View style={styles.navIconContainer}>
                    {icon}
                </View>
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]} numberOfLines={1}>
                    {label}
                </Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTopRow}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Leagues')}>
                        <ArrowLeft size={16} color="#94a3b8" />
                        <Text style={styles.backText}>Torna a Home</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.closeButton} onPress={closeDrawer}>
                        <X size={22} color="#94a3b8" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.leagueName} numberOfLines={2}>{league.name}</Text>
                <Text style={styles.inviteCode}>
                    Codice invito: <Text style={{ fontWeight: 'bold' }}>{league.joinCode}</Text>
                </Text>
            </View>

            {/* Navigation */}
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* HOME */}
                <View style={styles.navGroupFirst}>
                    {navItem('Home', <LayoutDashboard size={20} color="#e2e8f0" />, 'Dashboard')}
                </View>

                {/* TORNEO */}
                <View style={styles.navGroup}>
                    <TouchableOpacity style={styles.groupHeader} onPress={() => setOpenTorneo(!openTorneo)} activeOpacity={0.7}>
                        <Text style={styles.groupTitle}>TORNEO</Text>
                        {openTorneo ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                    </TouchableOpacity>
                    {openTorneo && (
                        <View style={styles.groupContent}>
                            {navItem('Classifica', <Trophy size={18} color="#e2e8f0" />, 'Standings')}
                            {navItem('Squadre', <Flag size={18} color="#e2e8f0" />, 'TeamsViewer')}
                            {navItem('Statistiche', <BarChart3 size={18} color="#e2e8f0" />, 'StatsViewer')}
                            {navItem('Calendario', <Calendar size={18} color="#e2e8f0" />, 'Calendar')}
                        </View>
                    )}
                </View>

                {/* FANTASY */}
                {league.settings.hasFantasy && (
                    <View style={styles.navGroup}>
                        <TouchableOpacity style={styles.groupHeader} onPress={() => setOpenFantasy(!openFantasy)} activeOpacity={0.7}>
                            <Text style={styles.groupTitle}>FANTASY</Text>
                            {openFantasy ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                        </TouchableOpacity>
                        {openFantasy && (
                            <View style={styles.groupContent}>

                                {navItem('Mercato & Rosa', <Users size={18} color="#e2e8f0" />, 'Squad')}
                                {navItem('Schiera Formazione', <Calendar size={18} color="#e2e8f0" />, 'Formation')}
                                {navItem('Formazioni', <Eye size={18} color="#e2e8f0" />, 'Lineups')}
                                {navItem('Classifica Fantasy', <Trophy size={18} color="#e2e8f0" />, 'FantasyStandings')}
                            </View>
                        )}
                    </View>
                )}

                {/* GESTIONE */}
                {isOrganizer && (
                    <View style={styles.navGroup}>
                        <TouchableOpacity style={styles.groupHeader} onPress={() => setOpenGestione(!openGestione)} activeOpacity={0.7}>
                            <Text style={styles.groupTitle}>GESTIONE</Text>
                            {openGestione ? <ChevronUp size={16} color="#64748b" /> : <ChevronDown size={16} color="#64748b" />}
                        </TouchableOpacity>
                        {openGestione && (
                            <View style={styles.groupContent}>
                                {navItem('Gestione Torneo', <Shield size={18} color="#e2e8f0" />, 'TournamentAdmin')}
                                {isAdmin && league.settings.hasFantasy && navItem('Gestione Fantasy', <Settings size={18} color="#e2e8f0" />, 'FantasyAdmin')}
                                {isAdmin && navItem('Impostazioni', <Settings size={18} color="#e2e8f0" />, 'TournamentSettings')}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={styles.footerUserInfo}>
                    <Text style={styles.footerName} numberOfLines={1}>{currentUser.firstName} {currentUser.lastName}</Text>
                    <Text style={styles.footerRole}>{userRole}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
                    <LogOut size={16} color="#ef4444" />
                    <Text style={styles.logoutText}>Esci</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function DashboardDrawer() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerStyle: { backgroundColor: '#1e293b' },
                headerTintColor: '#e0f2fe',
                headerTitleStyle: { fontWeight: 'bold', fontSize: 16 },
                headerShadowVisible: false,
                drawerStyle: {
                    backgroundColor: '#1e293b',
                    width: '82%',
                    maxWidth: 340,
                },
                sceneStyle: { backgroundColor: '#0f172a' },
            }}
        >
            <Drawer.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Home' }} />
            <Drawer.Screen name="Standings" component={StandingsScreen} options={{ title: 'Classifica' }} />
            <Drawer.Screen name="TeamsViewer" component={TeamsViewerScreen} options={{ title: 'Squadre' }} />
            <Drawer.Screen name="StatsViewer" component={StatsViewerScreen} options={{ title: 'Statistiche' }} />
            <Drawer.Screen name="Calendar" component={CalendarScreen} options={{ title: 'Calendario' }} />


            <Drawer.Screen name="Squad" component={SquadScreen} options={{ title: 'La Mia Rosa' }} />

            <Drawer.Screen name="Formation" component={FormationScreen} options={{ title: 'Schiera Formazione' }} />
            <Drawer.Screen name="Lineups" component={LineupsScreen} options={{ title: 'Formazioni Altrui' }} />
            <Drawer.Screen name="FantasyStandings" component={FantasyStandingsScreen} options={{ title: 'Classifica Fantasy' }} />

            <Drawer.Screen name="TournamentAdmin" component={TournamentAdminScreen} options={{ title: 'Gestione Torneo' }} />
            <Drawer.Screen name="FantasyAdmin" component={FantasyAdminScreen} options={{ title: 'Gestione Fantasy' }} />
            <Drawer.Screen name="TournamentSettings" component={TournamentSettingsScreen} options={{ title: 'Impostazioni' }} />
        </Drawer.Navigator>
    );
}

const styles = StyleSheet.create({
    drawerContainer: {
        flex: 1,
        backgroundColor: '#1e293b',
    },
    // ─── Header ──────────────────────────────────
    header: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    headerTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    backText: {
        color: '#94a3b8',
        marginLeft: 6,
        fontSize: 13,
    },
    closeButton: {
        padding: 4,
    },
    leagueName: {
        color: '#38bdf8',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
        lineHeight: 24,
    },
    inviteCode: {
        color: '#64748b',
        fontSize: 11,
    },
    // ─── Navigation ──────────────────────────────
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 12,
        paddingTop: 4,
        paddingBottom: 8,
    },
    navGroupFirst: {
        marginTop: 8,
        marginBottom: 4,
    },
    navGroup: {
        marginTop: 8,
    },
    groupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginBottom: 2,
    },
    groupTitle: {
        color: '#64748b',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
    },
    groupContent: {
        paddingLeft: 4,
    },
    navItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginBottom: 1,
    },
    navItemActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
    },
    navIconContainer: {
        width: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    navLabel: {
        color: '#cbd5e1',
        marginLeft: 10,
        fontSize: 14,
        flex: 1,
    },
    navLabelActive: {
        color: '#38bdf8',
        fontWeight: '600',
    },
    // ─── Footer ──────────────────────────────────
    footer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    footerUserInfo: {
        marginBottom: 10,
    },
    footerName: {
        color: '#e2e8f0',
        fontWeight: 'bold',
        fontSize: 14,
    },
    footerRole: {
        color: '#64748b',
        fontSize: 12,
        marginTop: 2,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        paddingVertical: 10,
        borderRadius: 8,
    },
    logoutText: {
        color: '#ef4444',
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 14,
    },
});
