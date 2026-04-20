import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

export default function AuthScreen({ navigation }: any) {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);

    const setCurrentUser = useStore(state => state.setCurrentUser);
    const signIn = useStore(state => state.signIn);
    const signUp = useStore(state => state.signUp);
    const loading = useStore(state => state.isLoading);
    const setLoading = useStore(state => state.setLoading);

    const handleLogin = async () => {
        if (!email || !password) { setMessage('Compila tutti i campi'); setIsSuccess(false); return; }
        try {
            await signIn(email, password);
            setMessage('');
            navigation.replace('Leagues');
        } catch (err: any) {
            // Error is already handled by store's handleError, 
            // but we might want to show a local message too
            setMessage(err.message || 'Errore durante l\'accesso');
            setIsSuccess(false);
        }
    };

    const handleRegister = async () => {
        if (!email || !password || !firstName || !lastName) {
            setMessage('Compila tutti i campi'); setIsSuccess(false); return;
        }
        try {
            await signUp({ email, password, firstName, lastName });
            setMessage('');
            navigation.replace('Leagues');
        } catch (err: any) {
            setMessage(err.message || 'Errore durante la registrazione');
            setIsSuccess(false);
        }
    };

    const handleRecover = async () => {
        if (!email) { setMessage("Inserisci un'email valida"); setIsSuccess(false); return; }
        setLoading(true);
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
        setLoading(false);
        if (error) { setMessage(error.message); setIsSuccess(false); return; }
        setMessage('Email di recupero inviata! Controlla la tua casella.');
        setIsSuccess(true);
        setMode('login');
    };

    const isError = !isSuccess && message.length > 0;

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.logoEmoji}>⚽</Text>
                    <Text style={styles.title}>Fantalega</Text>
                    <Text style={styles.subtitle}>
                        {mode === 'login' ? 'Accedi al tuo account' : mode === 'register' ? 'Crea un nuovo account' : 'Recupera la password'}
                    </Text>

                    {message ? (
                        <View style={[styles.messageBox, isError ? styles.messageError : styles.messageSuccess]}>
                            <Text style={[styles.messageText, isError ? styles.messageTextError : styles.messageTextSuccess]}>{message}</Text>
                        </View>
                    ) : null}

                    {mode === 'login' && (
                        <View style={styles.form}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput style={styles.input} placeholder="la@tua.email" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                            <Text style={styles.label}>Password</Text>
                            <TextInput style={styles.input} placeholder="••••••••" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry />
                            <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Accedi</Text>}
                            </TouchableOpacity>
                            <View style={styles.linksContainer}>
                                <TouchableOpacity onPress={() => { setMode('register'); setMessage(''); }}>
                                    <Text style={styles.linkText}>Nuovo utente? <Text style={styles.linkTextHighlight}>Registrati</Text></Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setMode('forgot'); setMessage(''); }}>
                                    <Text style={styles.linkText}>Hai dimenticato la password?</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {mode === 'register' && (
                        <View style={styles.form}>
                            <Text style={styles.label}>Nome</Text>
                            <TextInput style={styles.input} placeholder="Mario" placeholderTextColor="#475569" value={firstName} onChangeText={setFirstName} />
                            <Text style={styles.label}>Cognome</Text>
                            <TextInput style={styles.input} placeholder="Rossi" placeholderTextColor="#475569" value={lastName} onChangeText={setLastName} />
                            <Text style={styles.label}>Email</Text>
                            <TextInput style={styles.input} placeholder="mario@rossi.it" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                            <Text style={styles.label}>Password</Text>
                            <TextInput style={styles.input} placeholder="Almeno 6 caratteri" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry />
                            <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Registrati</Text>}
                            </TouchableOpacity>
                            <View style={styles.linksContainer}>
                                <TouchableOpacity onPress={() => { setMode('login'); setMessage(''); }}>
                                    <Text style={styles.linkText}>Hai già un account? <Text style={styles.linkTextHighlight}>Accedi</Text></Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {mode === 'forgot' && (
                        <View style={styles.form}>
                            <Text style={styles.helperText}>Inserisci la tua email e ti invieremo un link per reimpostare la password.</Text>
                            <Text style={styles.label}>Email</Text>
                            <TextInput style={styles.input} placeholder="la@tua.email" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                            <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleRecover} disabled={loading}>
                                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Invia Email di Recupero</Text>}
                            </TouchableOpacity>
                            <View style={styles.linksContainer}>
                                <TouchableOpacity onPress={() => { setMode('login'); setMessage(''); }}>
                                    <Text style={styles.linkText}>Torna al Login</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 28, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', width: '100%', maxWidth: 420, alignSelf: 'center' },
    logoEmoji: { textAlign: 'center', fontSize: 48, marginBottom: 8 },
    title: { fontSize: 34, fontWeight: 'bold', color: '#38bdf8', textAlign: 'center', marginBottom: 4 },
    subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', marginBottom: 24 },
    messageBox: { padding: 12, borderRadius: 10, marginBottom: 16, borderWidth: 1 },
    messageError: { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: '#ef4444' },
    messageSuccess: { backgroundColor: 'rgba(34,197,94,0.1)', borderColor: '#22c55e' },
    messageText: { textAlign: 'center', fontSize: 14 },
    messageTextError: { color: '#ef4444' },
    messageTextSuccess: { color: '#22c55e' },
    form: { width: '100%' },
    label: { color: '#94a3b8', fontSize: 13, fontWeight: '600', marginBottom: 6 },
    helperText: { color: '#94a3b8', textAlign: 'center', marginBottom: 20, lineHeight: 20 },
    input: { backgroundColor: 'rgba(15,23,42,0.8)', color: '#f8fafc', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 10, padding: 14, marginBottom: 16, fontSize: 16 },
    primaryButton: { backgroundColor: '#0ea5e9', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    linksContainer: { marginTop: 20, alignItems: 'center', gap: 10 },
    linkText: { color: '#64748b', fontSize: 14 },
    linkTextHighlight: { color: '#38bdf8', fontWeight: 'bold' },
});
