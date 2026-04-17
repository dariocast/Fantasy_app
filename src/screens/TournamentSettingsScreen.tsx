import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useStore } from '../store';
import type { LeagueSettings } from '../types';
import ColorPickerModal from '../components/ColorPickerModal';

export default function TournamentSettingsScreen({ navigation }: any) {
    const leagues = useStore(state => state.leagues);
    const league = leagues.length > 0 ? leagues[0] : null;
    const leagueId = league?.id || '';
    const updateLeague = useStore(state => state.updateLeague);
    const currentUser = useStore((state) => state.currentUser);

    const isAdmin = currentUser && league ? league.roles[currentUser.id] === 'admin' : false;

    const [settings, setSettings] = useState<LeagueSettings | null>(league?.settings || null);
    const [coAdminEmail, setCoAdminEmail] = useState('');
    // Track numeric fields as strings for editable inputs
    const [budgetStr, setBudgetStr] = useState(league?.settings?.budget?.toString() || '0');
    const [squadSizeStr, setSquadSizeStr] = useState(league?.settings?.squadSize?.toString() || '0');

    // Color picker state
    const [colorPickerVisible, setColorPickerVisible] = useState(false);
    const [colorPickerIdx, setColorPickerIdx] = useState(-1);

    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [tempDate, setTempDate] = useState(new Date());

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
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>Accesso riservato agli amministratori del torneo.</Text>
            </View>
        );
    }

    const handleSaveSettings = () => {
        if (!settings) return;
        const finalSettings = {
            ...settings,
            budget: parseInt(budgetStr) || 0,
            squadSize: parseInt(squadSizeStr) || 0,
        };
        updateLeague({ ...league, settings: finalSettings });
        Alert.alert('Successo', 'Impostazioni aggiornate!');
    };

    const handleAddCoAdmin = () => {
        if (!coAdminEmail.trim()) return;
        useStore.getState().addLeagueOrganizer(leagueId, coAdminEmail.trim());
        Alert.alert('Inviato', `Co-Admin aggiunto se ${coAdminEmail} esiste.`);
        setCoAdminEmail('');
    };

    const handleAddCategory = () => {
        const newRoles = [...(settings.customRoles || []), { name: 'Nuova Categoria', minLimit: 0, maxLimit: 5, color: '#38bdf8' }];
        setSettings({ ...settings, customRoles: newRoles });
    };

    const handleRemoveCategory = (idx: number) => {
        const newRoles = (settings.customRoles || []).filter((_, i) => i !== idx);
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
        const bands = (settings.autoVoteBands || []).filter(b => b.id !== id);
        setSettings({ ...settings, autoVoteBands: bands });
    };

    const updateVoteBand = (id: string, field: 'minDiff' | 'maxDiff' | 'points', val: string) => {
        const bands = [...(settings.autoVoteBands || [])];
        const idx = bands.findIndex(b => b.id === id);
        if (idx !== -1) {
            bands[idx] = { ...bands[idx], [field]: parseFloat(val) || 0 };
            setSettings({ ...settings, autoVoteBands: bands });
        }
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
                        <>
                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Crediti Iniziali (Budget)</Text>
                                <TextInput
                                    style={[styles.input, styles.shortInput]}
                                    keyboardType="numeric"
                                    value={budgetStr}
                                    onChangeText={setBudgetStr}
                                />
                            </View>

                            <View style={styles.settingRow}>
                                <Text style={styles.settingLabel}>Scadenza Mercato</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity 
                                        style={[styles.input, { flex: 1, padding: 12, justifyContent: 'center' }]} 
                                        onPress={() => setShowDatePicker(true)}
                                    >
                                        <Text style={{ color: settings.fantasyMarketDeadline ? '#f8fafc' : '#94a3b8' }}>
                                            {settings.fantasyMarketDeadline ? new Date(settings.fantasyMarketDeadline).toLocaleDateString('it-IT') : 'Seleziona Data'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.input, { width: 80, padding: 12, justifyContent: 'center', alignItems: 'center' }]} 
                                        onPress={() => setShowTimePicker(true)}
                                    >
                                        <Text style={{ color: settings.fantasyMarketDeadline ? '#f8fafc' : '#94a3b8' }}>
                                            {settings.fantasyMarketDeadline ? new Date(settings.fantasyMarketDeadline).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 'Ora'}
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.input, { width: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)' }]} onPress={() => setSettings({ ...settings, fantasyMarketDeadline: undefined })}>
                                        <Text style={{ color: '#ef4444' }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Base Vote */}
                            <View style={{ marginTop: 10, marginBottom: 15 }}>
                                <Text style={[styles.settingLabel, { marginBottom: 10 }]}>Modalità Calcolo Voti Partita</Text>
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <TouchableOpacity 
                                        style={[styles.chip, settings.baseVoteType === 'manual' && styles.chipActive]} 
                                        onPress={() => setSettings({ ...settings, baseVoteType: 'manual' })}
                                    >
                                        <Text style={[styles.chipText, settings.baseVoteType === 'manual' && styles.chipTextActive]}>🖐 Manuale</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={[styles.chip, settings.baseVoteType !== 'manual' && styles.chipActive]} 
                                        onPress={() => setSettings({ ...settings, baseVoteType: 'automatic' })}
                                    >
                                        <Text style={[styles.chipText, settings.baseVoteType !== 'manual' && styles.chipTextActive]}>🤖 Automatico (Fasce Gol)</Text>
                                    </TouchableOpacity>
                                </View>

                                {settings.baseVoteType !== 'manual' && (
                                    <View style={{ marginTop: 15, padding: 12, backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 12 }}>
                                        <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 12 }}>Imposta i punti bonus (+ o -) da associare alla differenza reti della squadra del calciatore per calcolare automaticamente il voto base.</Text>
                                        
                                        {(settings.autoVoteBands || []).map((band, idx) => (
                                            <View key={band.id} style={{ flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' }}>
                                                <TextInput 
                                                    style={[styles.input, { width: 60, marginBottom: 0, textAlign: 'center' }]} 
                                                    keyboardType="numbers-and-punctuation" 
                                                    placeholder="Diff Min" 
                                                    placeholderTextColor="#94a3b8" 
                                                    value={band.minDiff.toString()} 
                                                    onChangeText={v => updateVoteBand(band.id, 'minDiff', v)} 
                                                />
                                                <Text style={{ color: '#64748b' }}>a</Text>
                                                <TextInput 
                                                    style={[styles.input, { width: 60, marginBottom: 0, textAlign: 'center' }]} 
                                                    keyboardType="numbers-and-punctuation" 
                                                    placeholder="Diff Max" 
                                                    placeholderTextColor="#94a3b8" 
                                                    value={band.maxDiff.toString()} 
                                                    onChangeText={v => updateVoteBand(band.id, 'maxDiff', v)} 
                                                />
                                                <Text style={{ color: '#64748b' }}>➡</Text>
                                                <TextInput 
                                                    style={[styles.input, { flex: 1, marginBottom: 0, textAlign: 'center' }]} 
                                                    keyboardType="numbers-and-punctuation" 
                                                    placeholder="Punti (es. 4.5)" 
                                                    placeholderTextColor="#94a3b8" 
                                                    value={band.points.toString()} 
                                                    onChangeText={v => updateVoteBand(band.id, 'points', v)} 
                                                />
                                                <TouchableOpacity onPress={() => handleRemoveVoteBand(band.id)}>
                                                    <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        ))}

                                        <TouchableOpacity style={styles.addCategoryBtn} onPress={handleAddVoteBand}>
                                            <Text style={styles.addCategoryText}>+ Aggiungi Fascia Diff. Reti</Text>
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
                        />
                    </View>

                    {/* Impostazioni Rigori Gironi */}
                    {(league.type === 'gironi' || league.type === 'gironi_eliminazione') && (
                        <View style={{ marginTop: 20, marginBottom: 10 }}>
                            <Text style={[styles.settingLabel, {marginBottom: 8, color: '#fbbf24'}]}>Gestione Rigori Pareggio</Text>
                            <TouchableOpacity 
                                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}
                                onPress={() => setSettings({ ...settings, groupPenaltiesEnabled: !settings.groupPenaltiesEnabled })}
                            >
                                <View style={[styles.checkbox, settings.groupPenaltiesEnabled && styles.checkboxActive]}>
                                        {settings.groupPenaltiesEnabled && <Text style={styles.checkmark}>✓</Text>}
                                </View>
                                <Text style={[styles.settingLabel, { marginBottom: 0 }]}>Rigori se pareggio (Gironi)</Text>
                            </TouchableOpacity>
                            
                            {settings.groupPenaltiesEnabled && (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.settingLabel, { fontSize: 12 }]}>Punti al Vincitore</Text>
                                        <TextInput 
                                            style={styles.input} 
                                            keyboardType="numeric" 
                                            value={settings.groupPenaltiesWinPoints?.toString() || '2'} 
                                            onChangeText={val => setSettings({ ...settings, groupPenaltiesWinPoints: parseInt(val) || 2 })} 
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.settingLabel, { fontSize: 12 }]}>Punti allo Sconfitto</Text>
                                        <TextInput 
                                            style={styles.input} 
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
                        <View style={{ marginTop: 10 }}>
                            <Text style={[styles.settingLabel, { marginBottom: 10 }]}>Categorie Personalizzate</Text>
                            {settings.customRoles?.map((cr, idx) => (
                                <View key={idx} style={styles.categoryRow}>
                                    <TouchableOpacity
                                        style={[styles.colorDot, { backgroundColor: cr.color || '#38bdf8' }]}
                                        onPress={() => { setColorPickerIdx(idx); setColorPickerVisible(true); }}
                                    />
                                    <TextInput
                                        style={[styles.input, { flex: 2, marginBottom: 0 }]}
                                        value={cr.name}
                                        onChangeText={val => {
                                            const newRoles = [...(settings.customRoles || [])];
                                            newRoles[idx] = { ...newRoles[idx], name: val };
                                            setSettings({ ...settings, customRoles: newRoles });
                                        }}
                                    />
                                    <TextInput
                                        style={[styles.input, { width: 50, marginBottom: 0, textAlign: 'center' }]}
                                        keyboardType="numeric"
                                        placeholder="Min"
                                        placeholderTextColor="#94a3b8"
                                        value={cr.minLimit?.toString() || ''}
                                        onChangeText={val => {
                                            const newRoles = [...(settings.customRoles || [])];
                                            newRoles[idx] = { ...newRoles[idx], minLimit: parseInt(val) || 0 };
                                            setSettings({ ...settings, customRoles: newRoles });
                                        }}
                                    />
                                    <Text style={{ color: '#64748b', fontSize: 10 }}>—</Text>
                                    <TextInput
                                        style={[styles.input, { width: 50, marginBottom: 0, textAlign: 'center' }]}
                                        keyboardType="numeric"
                                        placeholder="Max"
                                        placeholderTextColor="#94a3b8"
                                        value={cr.maxLimit?.toString() || ''}
                                        onChangeText={val => {
                                            const newRoles = [...(settings.customRoles || [])];
                                            newRoles[idx] = { ...newRoles[idx], maxLimit: parseInt(val) || 0 };
                                            setSettings({ ...settings, customRoles: newRoles });
                                        }}
                                    />
                                    <TouchableOpacity onPress={() => handleRemoveCategory(idx)}>
                                        <Text style={{ color: '#ef4444', fontSize: 16, fontWeight: 'bold' }}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                            <TouchableOpacity style={styles.addCategoryBtn} onPress={handleAddCategory}>
                                <Text style={styles.addCategoryText}>+ Aggiungi Categoria</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Tiebreaker Criteria */}
                    <View style={{ marginTop: 20 }}>
                        <Text style={[styles.settingLabel, { marginBottom: 10 }]}>Criteri di Parimerito (Ordina, aggiungi o rimuovi)</Text>
                        {(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for']).map((crit, idx, arr) => (
                            <View key={crit} style={styles.criteriaRow}>
                                <Text style={styles.criteriaText}>{idx + 1}. {tiebreakerLabels[crit] || crit}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                    <TouchableOpacity
                                        style={[styles.moveBtn, idx === 0 && { opacity: 0.3 }]}
                                        disabled={idx === 0}
                                        onPress={() => handleMoveTiebreaker(idx, 'up')}
                                    >
                                        <Text style={styles.moveBtnText}>↑</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.moveBtn, idx === arr.length - 1 && { opacity: 0.3 }]}
                                        disabled={idx === arr.length - 1}
                                        onPress={() => handleMoveTiebreaker(idx, 'down')}
                                    >
                                        <Text style={styles.moveBtnText}>↓</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.moveBtn, { backgroundColor: 'rgba(239,68,68,0.2)' }]}
                                        onPress={() => handleRemoveTiebreaker(idx)}
                                    >
                                        <Text style={[styles.moveBtnText, { color: '#ef4444' }]}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        {/* Add unused criteria */}
                        {(() => {
                            const unused = Object.keys(tiebreakerLabels).filter(k => !(settings.tiebreakerOrder || ['head_to_head', 'goal_difference', 'goals_for']).includes(k as any));
                            if (unused.length === 0) return null;
                            return (
                                <View style={{ marginTop: 12 }}>
                                    <Text style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>+ Aggiungi criterio:</Text>
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                        {unused.map(k => (
                                            <TouchableOpacity key={k} style={styles.missingCriteriaChip} onPress={() => handleAddTiebreaker(k)}>
                                                <Text style={{ color: '#ef4444', fontSize: 12 }}>{tiebreakerLabels[k]}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            );
                        })()}
                    </View>

                    <TouchableOpacity style={[styles.primaryBtn, { marginTop: 24 }]} onPress={handleSaveSettings}>
                        <Text style={styles.primaryBtnText}>Salva Modifiche</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Color Picker Modal */}
            <ColorPickerModal
                visible={colorPickerVisible}
                currentColor={colorPickerIdx >= 0 ? (settings.customRoles?.[colorPickerIdx]?.color || '#38bdf8') : '#38bdf8'}
                onSelect={handleColorSelect}
                onClose={() => { setColorPickerVisible(false); setColorPickerIdx(-1); }}
            />

            {/* Date Pickers */}
            {showDatePicker && (
                <DateTimePicker
                    value={tempDate}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowDatePicker(false);
                        if (selectedDate) {
                            setTempDate(selectedDate);
                            const d = new Date(settings.fantasyMarketDeadline || Date.now());
                            d.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
                            setSettings({ ...settings, fantasyMarketDeadline: d.toISOString() });
                        }
                    }}
                />
            )}
            {showTimePicker && (
                <DateTimePicker
                    value={tempDate}
                    mode="time"
                    display="default"
                    onChange={(event, selectedDate) => {
                        setShowTimePicker(false);
                        if (selectedDate) {
                            setTempDate(selectedDate);
                            const d = new Date(settings.fantasyMarketDeadline || Date.now());
                            d.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
                            setSettings({ ...settings, fantasyMarketDeadline: d.toISOString() });
                        }
                    }}
                />
            )}
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
    colorDot: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)' },
    categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'center' },
    checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: '#64748b', marginRight: 10, justifyContent: 'center', alignItems: 'center' },
    checkboxActive: { backgroundColor: '#38bdf8', borderColor: '#38bdf8' },
    checkmark: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    addCategoryBtn: { marginTop: 8, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: 'rgba(56, 189, 248, 0.1)', borderRadius: 10, borderWidth: 1, borderColor: '#38bdf8', alignItems: 'center' },
    addCategoryText: { color: '#38bdf8', fontSize: 14, fontWeight: 'bold' },
    criteriaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.6)', padding: 12, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    criteriaText: { color: '#f8fafc', fontSize: 14, fontWeight: '500' },
    moveBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    moveBtnText: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
    missingCriteriaChip: { backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ef4444' },
    chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: '#64748b' },
    chipActive: { backgroundColor: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8' },
    chipText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
    chipTextActive: { color: '#38bdf8' }
});
