import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../store';
import type { LeagueSettings } from '../types';
import { Settings as SettingsIcon, Users, ShieldCheck, Trophy, Palette, Info, ChevronRight, Plus, Trash2, ArrowUp, ArrowDown, Target, Calendar } from 'lucide-react-native';
import ColorPickerModal from '../components/ColorPickerModal';

export default function TournamentSettingsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const activeLeagueId = useStore(state => state.activeLeagueId);
    const league = leagues.find(l => l.id === activeLeagueId);
    const leagueId = league?.id || '';
    const updateLeague = useStore(state => state.updateLeague);
    const currentUser = useStore((state) => state.currentUser);
    const showNotification = useStore(state => state.showNotification);

    const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

    const [settings, setSettings] = useState<LeagueSettings | null>(league?.settings || null);
    const [coAdminEmail, setCoAdminEmail] = useState('');
    const [budgetStr, setBudgetStr] = useState(league?.settings?.budget?.toString() || '0');
    const [squadSizeStr, setSquadSizeStr] = useState(league?.settings?.squadSize?.toString() || '0');
    const [maxPlayersPerRealTeamStr, setMaxPlayersPerRealTeamStr] = useState(league?.settings?.maxPlayersPerRealTeam?.toString() || '3');

    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [colorPickerIdx, setColorPickerIdx] = useState(-1);

    const scrollRef = useRef<ScrollView>(null);

    const handleInputFocus = (inputName: string, yOffset: number) => {
        setTimeout(() => {
            scrollRef.current?.scrollTo({
                y: yOffset,
                animated: true
            });
        }, 100);
    };

    const tiebreakerLabels: Record<string, string> = {
        'head_to_head': 'Scontro Diretto',
        'goal_difference': 'Differenza Reti',
        'goals_for': 'Gol Fatti',
        'goals_against': 'Gol Subiti (minori)',
        'wins': 'Vittorie',
        'fairplay': 'Fair Play (meno cartellini)'
    };

    if (!league || !isAdmin || !settings) {
        return (
            <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
                <View style={styles.centerContainer}>
                    <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
                </View>
            </SafeAreaView>
        );
    }

    const handleSaveSettings = () => {
        if (!settings) return;
        const finalSettings = {
            ...settings,
            budget: parseInt(budgetStr) || 0,
            squadSize: parseInt(squadSizeStr) || 0,
            maxPlayersPerRealTeam: parseInt(maxPlayersPerRealTeamStr) || 3,
        };
        updateLeague({ ...league, settings: finalSettings });
        showNotification({
            type: 'success',
            title: 'Successo',
            message: 'Configurazione salvata con successo!'
        });
    };

    const handleAddCoAdmin = () => {
        if (!coAdminEmail.trim()) return;
        useStore.getState().addLeagueOrganizer(leagueId, coAdminEmail.trim());
        showNotification({
            type: 'success',
            title: 'Inviato',
            message: `Richiesta inviata a ${coAdminEmail}.`
        });
        setCoAdminEmail('');
    };

    const handleAddCategory = () => {
        const newRoles = [...(settings.customRoles || []), { name: 'Nuova Categoria', minLimit: 0, maxLimit: 5, color: '#38bdf8' }];
        setSettings({ ...settings, customRoles: newRoles });
    };

    const handleRemoveCategory = (idx: number) => {
        const newRoles = (settings.customRoles || []).filter((_: any, i: number) => i !== idx);
        setSettings({ ...settings, customRoles: newRoles });
    };

    const handleMoveTiebreaker = (idx: number, direction: 'up' | 'down') => {
        const order = [...(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for'])];
        if (direction === 'up' && idx > 0) {
            [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
        } else if (direction === 'down' && idx < order.length - 1) {
            [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        }
        setSettings({ ...settings, tiebreakerOrder: order as any });
    };

    const handleRemoveTiebreaker = (idx: number) => {
        const order = [...(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for'])];
        order.splice(idx, 1);
        setSettings({ ...settings, tiebreakerOrder: order as any });
    };

    const handleAddTiebreaker = (crit: string) => {
        const order = [...(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for'])];
        if (!order.includes(crit as any)) {
            order.push(crit as any);
            setSettings({ ...settings, tiebreakerOrder: order as any });
        }
    };

    const handleColorSelect = (color: string) => {
        if (colorPickerIdx < 0) return;
        const newRoles = [...(settings.customRoles || [])];
        newRoles[colorPickerIdx] = { ...newRoles[colorPickerIdx], color };
        setSettings({ ...settings, customRoles: newRoles });
    };

    const handleAddVoteBand = () => {
        const bands = [...(settings.autoVoteBands || [])];
        bands.push({ id: Math.random().toString(36).substr(2, 9), minDiff: 0, maxDiff: 0, points: 0 });
        setSettings({ ...settings, autoVoteBands: bands });
    };

    const handleRemoveVoteBand = (id: string) => {
        const bands = (settings.autoVoteBands || []).filter((b: any) => b.id !== id);
        setSettings({ ...settings, autoVoteBands: bands });
    };

    const updateVoteBand = (id: string, field: 'minDiff' | 'maxDiff' | 'points', val: string) => {
        const bands = [...(settings.autoVoteBands || [])];
        const idx = bands.findIndex((b: any) => b.id === id);
        if (idx !== -1) {
            bands[idx] = { ...bands[idx], [field]: parseFloat(val) || 0 };
            setSettings({ ...settings, autoVoteBands: bands });
        }
    };

    return (
        <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Impostazioni Torneo</Text>
            </View>

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 120 : 0}
            >
                <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <Users color="#ef4444" size={22} />
                            <Text style={styles.cardTitle}>Gestione Accessi</Text>
                        </View>
                        <Text style={styles.helpText}>Aggiungi co-amministratori tramite la loro email.</Text>
                        
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                                placeholder="Email utente..."
                                placeholderTextColor="#64748b"
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
                        <View style={styles.cardHeader}>
                            <ShieldCheck color="#ef4444" size={22} />
                            <Text style={styles.cardTitle}>Regole Generali</Text>
                        </View>

                        {league.settings.hasFantasy && (
                            <>
                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>Tipo di Rose</Text>
                                    <View style={{ flexDirection: 'row', gap: 10, flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                        <TouchableOpacity
                                            style={[styles.chip, settings.rosterType === 'fixed' && styles.chipActive, { flex: 1, minWidth: 100 }]}
                                            onPress={() => setSettings({ ...settings, rosterType: 'fixed' })}
                                        >
                                            <Text style={[styles.chipText, settings.rosterType === 'fixed' && styles.chipTextActive]} numberOfLines={1}>Rose Fisse</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.chip, (settings.rosterType === 'variable' || !settings.rosterType) && styles.chipActive, { flex: 1, minWidth: 100 }]}
                                            onPress={() => setSettings({ ...settings, rosterType: 'variable' })}
                                        >
                                            <Text style={[styles.chipText, (settings.rosterType === 'variable' || !settings.rosterType) && styles.chipTextActive]} numberOfLines={1}>Rose Variabili</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.settingRow}>
                                    <Text style={styles.settingLabel}>Crediti Iniziali (Budget)</Text>
                                    <TextInput
                                        style={[styles.input, styles.shortInput]}
                                        keyboardType="numeric"
                                        value={budgetStr}
                                        onChangeText={setBudgetStr}
                                        onFocus={() => handleInputFocus('budget', 300)}
                                    />
                                </View>


                                <View style={{ marginTop: 10, marginBottom: 15 }}>
                                    <Text style={[styles.settingLabel, { marginBottom: 10 }]}>Modalità Calcolo Voti Partita</Text>
                                    <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                                        <TouchableOpacity
                                            style={[styles.chip, settings.baseVoteType === 'manual' && styles.chipActive, { flex: 1, minWidth: 120 }]}
                                            onPress={() => setSettings({ ...settings, baseVoteType: 'manual' })}
                                        >
                                            <Text style={[styles.chipText, settings.baseVoteType === 'manual' && styles.chipTextActive]} numberOfLines={1}>🖐 Manuale</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.chip, settings.baseVoteType !== 'manual' && styles.chipActive, { flex: 1, minWidth: 120 }]}
                                            onPress={() => setSettings({ ...settings, baseVoteType: 'automatic' })}
                                        >
                                            <Text style={[styles.chipText, settings.baseVoteType !== 'manual' && styles.chipTextActive]} numberOfLines={1}>🤖 Automatico (Fasce Gol)</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {settings.baseVoteType !== 'manual' && (
                                        <View style={styles.subCard}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 6 }}>
                                                <Info size={14} color="#38bdf8" />
                                                <Text style={{ color: '#94a3b8', fontSize: 13 }}>Fasce Differenza Reti</Text>
                                            </View>

                                            {(settings.autoVoteBands || []).map((band: any, idx: number) => (
                                                <View key={band.id} style={styles.rowItem}>
                                                    <TextInput
                                                        style={[styles.shortInput, { width: 55 }]}
                                                        keyboardType="numbers-and-punctuation"
                                                        placeholder="Min"
                                                        placeholderTextColor="#64748b"
                                                        value={band.minDiff.toString()}
                                                        onChangeText={v => updateVoteBand(band.id, 'minDiff', v)}
                                                    />
                                                    <Text style={{ color: '#475569' }}>→</Text>
                                                    <TextInput
                                                        style={[styles.shortInput, { width: 55 }]}
                                                        keyboardType="numbers-and-punctuation"
                                                        placeholder="Max"
                                                        placeholderTextColor="#64748b"
                                                        value={band.maxDiff.toString()}
                                                        onChangeText={v => updateVoteBand(band.id, 'maxDiff', v)}
                                                    />
                                                    <Text style={{ color: '#475569' }}>=</Text>
                                                    <TextInput
                                                        style={[styles.shortInput, { flex: 1 }]}
                                                        keyboardType="numbers-and-punctuation"
                                                        placeholder="Punti"
                                                        placeholderTextColor="#64748b"
                                                        value={band.points.toString()}
                                                        onChangeText={v => updateVoteBand(band.id, 'points', v)}
                                                    />
                                                    <TouchableOpacity onPress={() => handleRemoveVoteBand(band.id)} style={styles.deleteIconBtn}>
                                                        <Trash2 size={16} color="#ef4444" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}

                                            <TouchableOpacity style={styles.addButton} onPress={handleAddVoteBand}>
                                                <Plus size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                                                <Text style={styles.addButtonText}>Aggiungi Fascia</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}

                        <View style={styles.settingRow}>
                            <Text style={styles.settingLabel}>Limite Calciatori in Rosa</Text>
                            <TextInput
                                style={[styles.input, styles.shortInput]}
                                keyboardType="numeric"
                                value={squadSizeStr}
                                onChangeText={setSquadSizeStr}
                                onFocus={() => handleInputFocus('squadSize', 1000)}
                            />
                        </View>

                        <View style={{ marginBottom: 15 }}>
                            <TouchableOpacity
                                style={styles.checkRow}
                                onPress={() => setSettings({ ...settings, maxPlayersPerRealTeamEnabled: !settings.maxPlayersPerRealTeamEnabled })}
                            >
                                <View style={[styles.customCheckbox, settings.maxPlayersPerRealTeamEnabled && styles.customCheckboxActive]}>
                                    {settings.maxPlayersPerRealTeamEnabled && <ShieldCheck size={14} color="#fff" />}
                                </View>
                                <Text style={styles.checkText}>Limite calciatori stessa squadra reale</Text>
                            </TouchableOpacity>

                            {settings.maxPlayersPerRealTeamEnabled && (
                                <View style={styles.subCard}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 14 }}>Massimo per squadra:</Text>
                                        <TextInput
                                            style={[styles.input, styles.shortInput, { marginBottom: 0 }]}
                                            keyboardType="numeric"
                                            value={maxPlayersPerRealTeamStr}
                                            onChangeText={setMaxPlayersPerRealTeamStr}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>

                        <View style={{ marginTop: 20 }}>
                            <View style={styles.cardHeader}>
                                <Calendar color="#fbbf24" size={20} />
                                <Text style={styles.cardTitle}>Pronostici Risultati</Text>
                            </View>
                            
                            <TouchableOpacity
                                style={styles.checkRow}
                                onPress={() => setSettings({ ...settings, predictionsEnabled: !settings.predictionsEnabled })}
                            >
                                <View style={[styles.customCheckbox, settings.predictionsEnabled && styles.customCheckboxActive]}>
                                    {settings.predictionsEnabled && <ShieldCheck size={14} color="#fff" />}
                                </View>
                                <Text style={styles.checkText}>Abilita Pronostici per gli utenti</Text>
                            </TouchableOpacity>

                            {settings.predictionsEnabled && (
                                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.miniLabel}>Punti Esito (1X2)</Text>
                                        <TextInput
                                            style={styles.shortInput}
                                            keyboardType="numeric"
                                            value={settings.predictionPointsOutcome?.toString() || '0'}
                                            onChangeText={val => setSettings({ ...settings, predictionPointsOutcome: parseInt(val) || 0 })}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.miniLabel}>Punti Ris. Esatto</Text>
                                        <TextInput
                                            style={styles.shortInput}
                                            keyboardType="numeric"
                                            value={settings.predictionPointsExact?.toString() || '0'}
                                            onChangeText={val => setSettings({ ...settings, predictionPointsExact: parseInt(val) || 0 })}
                                        />
                                    </View>
                                </View>
                            )}
                        </View>

                        {(league.type === 'gironi' || league.type === 'gironi_eliminazione') && (
                            <View style={{ marginTop: 10, marginBottom: 10 }}>
                                <Text style={[styles.settingLabel, { color: '#fbbf24', marginBottom: 12 }]}>Rigori Pareggio (Gironi)</Text>
                                
                                <TouchableOpacity
                                    style={styles.checkRow}
                                    onPress={() => setSettings({ ...settings, groupPenaltiesEnabled: !settings.groupPenaltiesEnabled })}
                                >
                                    <View style={[styles.customCheckbox, settings.groupPenaltiesEnabled && styles.customCheckboxActive]}>
                                        {settings.groupPenaltiesEnabled && <ShieldCheck size={14} color="#fff" />}
                                    </View>
                                    <Text style={styles.checkText}>Abilita Rigori in caso di parità</Text>
                                </TouchableOpacity>

                                {settings.groupPenaltiesEnabled && (
                                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 5 }}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.miniLabel}>Punti Vincitore</Text>
                                            <TextInput
                                                style={styles.shortInput}
                                                keyboardType="numeric"
                                                value={settings.groupPenaltiesWinPoints?.toString() || '2'}
                                                onChangeText={val => setSettings({ ...settings, groupPenaltiesWinPoints: parseInt(val) || 2 })}
                                            />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.miniLabel}>Punti Sconfitto</Text>
                                            <TextInput
                                                style={styles.shortInput}
                                                keyboardType="numeric"
                                                value={settings.groupPenaltiesLossPoints?.toString() || '1'}
                                                onChangeText={val => setSettings({ ...settings, groupPenaltiesLossPoints: parseInt(val) || 1 })}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}

                        {settings.useCustomRoles && (
                            <View style={{ marginTop: 15 }}>
                                <View style={styles.cardHeader}>
                                    <Palette color="#38bdf8" size={18} />
                                    <Text style={styles.cardTitle}>Categorie Rosa</Text>
                                </View>
                                {settings.customRoles?.map((cr: any, idx: number) => (
                                    <View key={idx} style={styles.rowItem}>
                                        <TouchableOpacity
                                            style={[styles.colorIndicator, { backgroundColor: cr.color || '#38bdf8' }]}
                                            onPress={() => { setColorPickerIdx(idx); setColorPickerVisible(true); }}
                                        />
                                        <TextInput
                                            style={[styles.shortInput, { flex: 1.5, textAlign: 'left', paddingLeft: 10 }]}
                                            value={cr.name}
                                            onChangeText={val => {
                                                const newRoles = [...(settings.customRoles || [])];
                                                newRoles[idx] = { ...newRoles[idx], name: val };
                                                setSettings({ ...settings, customRoles: newRoles });
                                            }}
                                        />
                                        <TextInput
                                            style={[styles.shortInput, { width: 45 }]}
                                            keyboardType="numeric"
                                            placeholder="Min"
                                            placeholderTextColor="#64748b"
                                            value={cr.minLimit?.toString() || ''}
                                            onChangeText={val => {
                                                const newRoles = [...(settings.customRoles || [])];
                                                newRoles[idx] = { ...newRoles[idx], minLimit: parseInt(val) || 0 };
                                                setSettings({ ...settings, customRoles: newRoles });
                                            }}
                                        />
                                        <TextInput
                                            style={[styles.shortInput, { width: 45 }]}
                                            keyboardType="numeric"
                                            placeholder="Max"
                                            placeholderTextColor="#64748b"
                                            value={cr.maxLimit?.toString() || ''}
                                            onChangeText={val => {
                                                const newRoles = [...(settings.customRoles || [])];
                                                newRoles[idx] = { ...newRoles[idx], maxLimit: parseInt(val) || 0 };
                                                setSettings({ ...settings, customRoles: newRoles });
                                            }}
                                        />
                                        <TouchableOpacity onPress={() => handleRemoveCategory(idx)} style={styles.deleteIconBtn}>
                                            <Trash2 size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                                <TouchableOpacity style={styles.addButton} onPress={handleAddCategory}>
                                    <Plus size={14} color="#38bdf8" style={{ marginRight: 6 }} />
                                    <Text style={styles.addButtonText}>Nuova Categoria</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={{ marginTop: 25 }}>
                            <View style={styles.cardHeader}>
                                <Trophy color="#fbbf24" size={18} />
                                <Text style={styles.cardTitle}>Parimerito</Text>
                            </View>
                            <Text style={styles.helpText}>Trascina o sposta i criteri per definire l'ordine della classifica.</Text>
                            
                            {(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for']).map((crit: any, idx: number, arr: any[]) => (
                                <View key={crit} style={styles.tieRow}>
                                    <Text style={styles.tieText}>{idx + 1}. {tiebreakerLabels[crit] || crit}</Text>
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            style={[styles.iconAction, idx === 0 && { opacity: 0.2 }]}
                                            disabled={idx === 0}
                                            onPress={() => handleMoveTiebreaker(idx, 'up')}
                                        >
                                            <ArrowUp size={16} color="#fff" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.iconAction, idx === arr.length - 1 && { opacity: 0.2 }]}
                                            disabled={idx === arr.length - 1}
                                            onPress={() => handleMoveTiebreaker(idx, 'down')}
                                        >
                                            <ArrowDown size={16} color="#fff" />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.iconAction, { backgroundColor: 'rgba(239,68,68,0.1)' }]}
                                            onPress={() => handleRemoveTiebreaker(idx)}
                                        >
                                            <Trash2 size={16} color="#ef4444" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}

                            {(() => {
                                const unused = Object.keys(tiebreakerLabels).filter(k => !(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for']).includes(k as any));
                                if (unused.length === 0) return null;
                                return (
                                    <View style={{ marginTop: 15 }}>
                                        <Text style={styles.miniLabel}>Disponibili:</Text>
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {unused.map(k => (
                                                <TouchableOpacity key={k} style={styles.missingChip} onPress={() => handleAddTiebreaker(k)}>
                                                    <Plus size={12} color="#4ade80" style={{ marginRight: 4 }} />
                                                    <Text style={styles.missingText}>{tiebreakerLabels[k]}</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>

                        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 30 }]} onPress={handleSaveSettings}>
                            <Text style={styles.primaryBtnText}>Salva Configurazione</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <ColorPickerModal
                visible={colorPickerVisible}
                currentColor={colorPickerIdx >= 0 ? (settings.customRoles?.[colorPickerIdx]?.color || '#38bdf8') : '#38bdf8'}
                onSelect={handleColorSelect}
                onClose={() => { setColorPickerVisible(false); setColorPickerIdx(-1); }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    centerContainer: { flex: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
    emptyText: { color: '#64748b', fontSize: 16, textAlign: 'center' },
    container: { flex: 1, backgroundColor: '#0f172a' },
    header: { paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#0f172a' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
    content: { padding: 16, paddingBottom: 60 },
    card: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, gap: 10 },
    cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#f8fafc' },
    helpText: { color: '#64748b', fontSize: 13, marginBottom: 16, marginLeft: 4 },
    input: { backgroundColor: 'rgba(15, 23, 42, 0.6)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, fontSize: 15, marginBottom: 16 },
    shortInput: { backgroundColor: 'rgba(15, 23, 42, 0.8)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 8, fontSize: 14, textAlign: 'center', minWidth: 60 },
    settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)', paddingBottom: 18 },
    settingLabel: { color: '#f8fafc', fontSize: 15, fontWeight: '700', flex: 1 },
    primaryBtn: { backgroundColor: '#ef4444', padding: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
    primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    chipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    chipText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
    chipTextActive: { color: '#38bdf8' },
    subCard: { marginTop: 10, padding: 15, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)' },
    rowItem: { flexDirection: 'row', gap: 10, marginBottom: 10, alignItems: 'center' },
    addButton: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, backgroundColor: 'rgba(56, 189, 248, 0.05)', borderRadius: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: '#38bdf8' },
    addButtonText: { color: '#38bdf8', fontSize: 13, fontWeight: 'bold' },
    deleteIconBtn: { padding: 6 },
    colorIndicator: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    checkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    customCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#475569', marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    customCheckboxActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
    checkText: { color: '#f8fafc', fontSize: 14, fontWeight: '500' },
    miniLabel: { color: '#64748b', fontSize: 11, marginBottom: 6, marginLeft: 4 },
    tieRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    tieText: { color: '#f8fafc', fontSize: 14, fontWeight: '600', flex: 1, marginRight: 10 },
    iconAction: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
    missingChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(74, 222, 128, 0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.2)' },
    missingText: { color: '#4ade80', fontSize: 12, fontWeight: '600', flexShrink: 1 }
});
