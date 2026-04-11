import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useStore } from '../store';
import type { LeagueSettings } from '../types';

export default function TournamentSettingsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';
    const currentUser = useStore((state) => state.currentUser);

    const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

    const [settings, setSettings] = useState<LeagueSettings | null>(league?.settings || null);
    const [coAdminEmail, setCoAdminEmail] = useState('');

    if (!league || !isAdmin || !settings) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
            </View>
        );
    }

    const handleSaveSettings = () => {
        useStore.setState(state => ({
            leagues: state.leagues.map(l =>
                l.id === leagueId ? { ...l, settings } : l
            )
        }));
        Alert.alert('Successo', 'Impostazioni aggiornate!');
    };

    const handleAddCoAdmin = () => {
        if (!coAdminEmail.trim()) return;
        useStore.getState().addLeagueOrganizer(leagueId, coAdminEmail.trim());
        Alert.alert('Inviato', `Co-Admin aggiunto se ${coAdminEmail} esiste.`);
        setCoAdminEmail('');
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ paddingRight: 15 }}>
                    <Text style={styles.backBtnText}>&lt;</Text>
                </TouchableOpacity>
                <Text style={styles.title}>Impostazioni Torneo</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Gestione Accessi (Co-Admin)</Text>
                    <Text style={styles.helpText}>Aggiungi utenti tramite email per dar loro poteri amministrativi limitati.</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <TextInput 
                            style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                            placeholder="Email utente..." 
                            placeholderTextColor="#94a3b8" 
                            autoCapitalize="none"
                            keyboardType="email-address"
                            value={coAdminEmail} 
                            onChangeText={setCoAdminEmail} 
                        />
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleAddCoAdmin}>
                            <Text style={styles.primaryBtnText}>Aggiungi</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Regole Torneo</Text>
                    
                    {league.settings.hasFantasy && (
                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>Crediti Iniziali (Budget)</Text>
                            <TextInput 
                                style={[styles.input, styles.shortInput]} 
                                keyboardType="numeric" 
                                value={settings.budget?.toString()} 
                                onChangeText={val => setSettings({ ...settings, budget: parseInt(val) || 0 })} 
                            />
                        </View>
                    )}

                    <View style={styles.settingRow}>
                        <Text style={styles.settingLabel}>Limite Calciatori in Rosa</Text>
                        <TextInput 
                            style={[styles.input, styles.shortInput]} 
                            keyboardType="numeric" 
                            value={settings.squadSize?.toString()} 
                            onChangeText={val => setSettings({ ...settings, squadSize: parseInt(val) || 0 })} 
                        />
                    </View>

                    {settings.useCustomRoles && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={[styles.settingLabel, {marginBottom: 10}]}>Categorie Personalizzate</Text>
                            {settings.customRoles?.map((cr, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                                    <View style={[styles.colorDot, { backgroundColor: cr.color || '#38bdf8' }]} />
                                    <TextInput 
                                        style={[styles.input, { flex: 2, marginBottom: 0 }]} 
                                        value={cr.name} 
                                        onChangeText={val => {
                                            const newRoles = [...(settings.customRoles || [])];
                                            newRoles[idx].name = val;
                                            setSettings({ ...settings, customRoles: newRoles });
                                        }} 
                                    />
                                    <TextInput 
                                        style={[styles.input, { flex: 1, marginBottom: 0 }]} 
                                        keyboardType="numeric" 
                                        placeholder="Max limit"
                                        placeholderTextColor="#94a3b8" 
                                        value={cr.maxLimit?.toString() || ''} 
                                        onChangeText={val => {
                                            const newRoles = [...(settings.customRoles || [])];
                                            newRoles[idx].maxLimit = parseInt(val) || 0;
                                            setSettings({ ...settings, customRoles: newRoles });
                                        }} 
                                    />
                                </View>
                            ))}
                        </View>
                    )}

                    <TouchableOpacity style={[styles.primaryBtn, { marginTop: 20 }]} onPress={handleSaveSettings}>
                        <Text style={styles.primaryBtnText}>Salva Modifiche</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    container: { flex: 1, backgroundColor: '#0f172a' },
    emptyText: { color: '#94a3b8', fontSize: 16, textAlign: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: '#1e293b', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtnText: { color: '#ef4444', fontSize: 24, fontWeight: 'bold' },
    title: { fontSize: 20, fontWeight: 'bold', color: '#f8fafc' },
    content: { padding: 16 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#ef4444', marginBottom: 12 },
    helpText: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16 },
    shortInput: { width: 80, textAlign: 'center', marginBottom: 0 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingBottom: 16 },
    settingLabel: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    primaryBtn: { backgroundColor: '#ef4444', padding: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    colorDot: { width: 20, height: 20, borderRadius: 10 }
});
