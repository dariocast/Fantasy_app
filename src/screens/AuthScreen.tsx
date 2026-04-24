import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking, Image } from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { isValidEmail, isNonEmptyString } from '../lib/validation';
import { logger } from '../utils/logger';
import { Mail, Lock, User, ArrowRight, ShieldCheck, ChevronLeft, Info, CheckCircle2, Star, Hexagon } from 'lucide-react-native';

const Logo = () => {
    return (
        <View style={styles.logoContainer}>
            <Image 
                source={require('../../assets/auth-logo.jpg')} 
                style={styles.logoImage}
                resizeMode="contain"
            />
        </View>
    );
};


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
        if (!isValidEmail(email)) {
            setMessage('Inserisci un indirizzo email valido');
            setIsSuccess(false);
            return;
        }
        if (!password || password.length < 6) {
            setMessage('La password deve essere di almeno 6 caratteri');
            setIsSuccess(false);
            return;
        }

        try {
            logger.debug('Attempting login for:', email);
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
        if (!isValidEmail(email)) {
            setMessage('Inserisci un indirizzo email valido');
            setIsSuccess(false);
            return;
        }
        if (password.length < 8) {
            setMessage('La password deve essere di almeno 8 caratteri per la registrazione');
            setIsSuccess(false);
            return;
        }
        if (!isNonEmptyString(firstName) || !isNonEmptyString(lastName)) {
            setMessage('Nome e Cognome sono richiesti');
            setIsSuccess(false);
            return;
        }

        try {
            logger.debug('Attempting registration for:', email);
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
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.card}>
                        <View style={styles.heroSection}>
                            <Logo />
                            <Text style={styles.title}>Fantasy</Text>
                            <Text style={styles.subtitle}>
                                {mode === 'login' ? "L'app per creare il tuo fantacalcio" : mode === 'register' ? 'Inizia la tua sfida oggi.' : 'Reimposta la tua password.'}
                            </Text>
                        </View>

                        {message ? (
                            <View style={[styles.messageBox, isError ? styles.messageError : styles.messageSuccess]}>
                                {isError ? <Info size={16} color="#ef4444" /> : <CheckCircle2 size={16} color="#22c55e" />}
                                <Text style={[styles.messageText, isError ? styles.messageTextError : styles.messageTextSuccess]}>{message}</Text>
                            </View>
                        ) : null}

                        {mode === 'login' && (
                            <View style={styles.form}>
                                <View style={styles.inputWrapper}>
                                    <Mail size={18} color="#64748b" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email"
                                        placeholderTextColor="#475569"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Lock size={18} color="#64748b" style={styles.inputIcon} />
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Password"
                                        placeholderTextColor="#475569"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                    />
                                </View>
                                <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleLogin} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : (
                                        <>
                                            <Text style={styles.primaryButtonText}>Accedi</Text>
                                            <ArrowRight size={18} color="#fff" style={{ marginLeft: 10 }} />
                                        </>
                                    )}
                                </TouchableOpacity>
                                <View style={styles.linksContainer}>
                                    <TouchableOpacity onPress={() => { setMode('register'); setMessage(''); }}>
                                        <Text style={styles.linkText}>Non hai un account? <Text style={styles.linkTextHighlight}>Registrati</Text></Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => { setMode('forgot'); setMessage(''); }}>
                                        <Text style={styles.forgotText}>Hai dimenticato la password?</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {mode === 'register' && (
                            <View style={styles.form}>
                                <View style={styles.nameRow}>
                                    <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0 }]}>
                                        <User size={18} color="#64748b" style={styles.inputIcon} />
                                        <TextInput style={styles.input} placeholder="Nome" placeholderTextColor="#475569" value={firstName} onChangeText={setFirstName} />
                                    </View>
                                    <View style={[styles.inputWrapper, { flex: 1, marginBottom: 0, marginLeft: 10 }]}>
                                        <TextInput style={styles.input} placeholder="Cognome" placeholderTextColor="#475569" value={lastName} onChangeText={setLastName} />
                                    </View>
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Mail size={18} color="#64748b" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                                </View>
                                <View style={styles.inputWrapper}>
                                    <Lock size={18} color="#64748b" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Password (min. 8 car.)" placeholderTextColor="#475569" value={password} onChangeText={setPassword} secureTextEntry />
                                </View>
                                <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleRegister} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Crea Account</Text>}
                                </TouchableOpacity>
                                <Text style={styles.privacyConsentText}>
                                    Registrandoti, accetti i nostri{' '}
                                    <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://docs.google.com/document/d/1vi0dHfxkSuaKGzhaaWpvcXPejp_qZppY3WwOjUzXSWw/edit?usp=sharing')}>
                                        Termini di Servizio
                                    </Text>
                                    {' '}e la{' '}
                                    <Text style={styles.privacyLink} onPress={() => Linking.openURL('https://www.iubenda.com/privacy-policy/75178620')}>
                                        Privacy Policy
                                    </Text>
                                </Text>
                                <View style={styles.linksContainer}>
                                    <TouchableOpacity onPress={() => { setMode('login'); setMessage(''); }}>
                                        <Text style={styles.linkText}>Hai già un account? <Text style={styles.linkTextHighlight}>Accedi</Text></Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {mode === 'forgot' && (
                            <View style={styles.form}>
                                <Text style={styles.helperText}>Inserisci la tua email e ti invieremo un link per il ripristino.</Text>
                                <View style={styles.inputWrapper}>
                                    <Mail size={18} color="#64748b" style={styles.inputIcon} />
                                    <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#475569" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
                                </View>
                                <TouchableOpacity style={[styles.primaryButton, loading && { opacity: 0.6 }]} onPress={handleRecover} disabled={loading}>
                                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Invia Link</Text>}
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => { setMode('login'); setMessage(''); }} style={styles.backLink}>
                                    <ChevronLeft size={16} color="#64748b" />
                                    <Text style={styles.backLinkText}>Torna al Login</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#070c1f' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 10 },
    card: { backgroundColor: '#070c1f', borderRadius: 30, padding: 24, width: '100%', maxWidth: 500, alignSelf: 'center' },
    heroSection: { alignItems: 'center', marginBottom: 35 },
    logoContainer: { marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    logoImage: { width: 200, height: 200 },

    title: { fontSize: 42, fontWeight: '900', color: '#f8fafc', textAlign: 'center', marginBottom: 8, letterSpacing: -1 },
    subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', fontWeight: '500', lineHeight: 22 },
    messageBox: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 15, marginBottom: 25, borderWidth: 1 },
    messageError: { backgroundColor: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)' },
    messageSuccess: { backgroundColor: 'rgba(34,197,94,0.05)', borderColor: 'rgba(34,197,94,0.2)' },
    messageText: { flex: 1, textAlign: 'center', fontSize: 13, fontWeight: 'bold', marginLeft: 10 },
    messageTextError: { color: '#ef4444' },
    messageTextSuccess: { color: '#22c55e' },
    form: { width: '100%' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 15 },
    inputIcon: { marginRight: 12 },
    input: { flex: 1, color: '#f8fafc', paddingVertical: 16, fontSize: 16, fontWeight: '500' },
    nameRow: { flexDirection: 'row', marginBottom: 16 },
    primaryButton: { backgroundColor: '#38bdf8', padding: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
    primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    linksContainer: { marginTop: 25, alignItems: 'center', gap: 15 },
    linkText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
    linkTextHighlight: { color: '#38bdf8', fontWeight: '900' },
    forgotText: { color: '#475569', fontSize: 13, fontWeight: 'bold' },
    helperText: { color: '#64748b', textAlign: 'center', marginBottom: 25, lineHeight: 22, fontSize: 14 },
    backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    backLinkText: { color: '#64748b', fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
    privacyConsentText: {
        color: '#475569',
        fontSize: 11,
        textAlign: 'center',
        marginTop: 15,
        lineHeight: 16,
    },
    privacyLink: {
        color: '#38bdf8',
        textDecorationLine: 'underline',
    },
});
