import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { isValidEmail, isNonEmptyString } from '../lib/validation';
import { logger } from '../utils/logger';
import { Mail, Lock, User, ArrowRight, ShieldCheck, ChevronLeft, Info, CheckCircle2, Star, Hexagon } from 'lucide-react-native';

const SoccerBallLogo = () => {
    return (
        <View style={styles.logoContainer}>
            <View style={styles.ballOuter}>
                <Svg width="160" height="160" viewBox="0 0 100 100">
                    <Circle cx="50" cy="50" r="50" fill="#0f172a" />
                    <G transform="translate(50, 50) scale(1.20) translate(-95.5, -52)">
                        <G fill="#ffffff" fillRule="evenodd" clipRule="evenodd">
                            <Path d="M83.924 25.642c-4.657.951-9.611 3.037-9.611 3.037 2.453-3.341 7.432-7.434 7.432-7.434-1.37-2.574-2.583-6.385-2.583-6.385s5.758.316 10.265 1.779c0 0 7.657-4.197 15.591-4.326 0 0-5.783 3.339-8.24 6.448.652.343 5.277 1.727 8.879 3.85 0 0-6.512.184-12.488 1.002 0 0-2.104 2.968-3.883 9.723-.001 0-3.065-3.375-5.362-7.694z"/>
                            <Path d="M114.861 31.235c-3.943-4.386-9.205-8.624-9.205-8.624 4.84.069 12.023 2.925 12.023 2.925 1.404-2.654 2.387-6.306 2.387-6.306s2.748 4.651 3.996 9.794c0 0 5.705 3.416 10.01 9.133 0 0-4.492-.937-7.799-.921-.01.738 1.213 6.806.947 10.978 0 0-3.662-5.951-7.098-10.908 0 0-5.523.1-11.326 1.686.001 0 3.251-3.754 6.065-7.757zM121.18 59.824c2.908-4.903 6.041-11.609 6.041-11.609.961 4.485 1.047 10.207 1.047 10.207 2.885-.608 7.992-3.058 7.992-3.058s-2.275 6.06-7.375 10.707c0 0 .516 3.631.576 8.422 0 0-3.607-1.607-6.598-3.404-.637.371-4.252 2.83-10.359 4.094 0 0 2.586-4.04 4.725-7.986 0 0-4.258-2.805-7.631-7.402 0-.001 6.558.827 11.582.029z"/>
                            <Path d="M100.609 49.819c4.461 5.526 8.988 9.976 8.988 9.976-7.396-1.099-13.401-3.173-13.401-3.173-3.004 4.816-6.282 10.415-6.282 10.415s-1.833-6.074-2.143-12.968c0 0-3.715-1.3-10.562-3.996 0 0 4.723-2.932 10.439-4.531-.334-.659.542-8.855 1.638-12.205 0 0 3.333 5.403 6.047 9.375 0 0 5.312-1.802 13.465-3.72-.001 0-4.462 5.661-8.189 10.827zM60 70.721a39.903 39.903 0 0 1-1.255-2.581c.078-2.931.34-6.706 1.09-9.634 0 0-2.149-1.491-4.371-3.429-.025-.337-.054-.677-.073-1.018 1.276-.476 3.985-1.433 6.351-1.981.271-.689 1.744-5.436 4.591-8.711 0 0 .192 3.227.966 7.523 0 0 4.494-1.018 9.909-.819 0 0-5.018 3.952-8.178 7.967 1.146 4.629 3.452 9.072 3.452 9.072-3.446-1.95-7.091-4.533-7.091-4.533-1.28 1.522-3.853 5.628-5.391 8.144zM88.667 91.74a34.091 34.091 0 0 1-1.665-.343c-1.881-2.017-4.75-5.31-6.941-8.771 0 0-8.082-.652-13.777-3.146 0 0 4.71-.885 9.882-3.552-.334-.659-2.306-4.295-3.685-8.816 0 0 4.94 3.991 8.6 6.327 0 0 4.651-2.676 8.832-6.402 0 0-1.06 5.15-1.647 11.032a319.505 319.505 0 0 0 8.17 4.509c-4.217.614-8.368.485-8.368.485-.164 3.266.275 6.699.599 8.677zM123.828 81.238s-5.574 1.473-11.014 1.677c0 0-.041-3.711-.311-7.732 0 0-2.889 4.1-6.66 8.043-4.453-.064-9.407-.647-9.407-.647a127.8 127.8 0 0 0 5.241 5.039c-3.354 2.851-6.454 4.756-6.454 4.756.44.006.888.009 1.331.003 10.587-.173 20.155-4.387 27.274-11.139z"/><Path d="M55.881 45.093s2.978-3.714 6.454-6.73c0 0 1.162 2.146 3.998 5.005 0 0 .021-3.494.427-8.976 3.176-2.808 7.553-5.713 7.553-5.713-3.63-.231-6.339-.054-6.339-.054.842-4.16 2.744-8.624 2.744-8.624-7.718 6.12-13.15 14.991-14.837 25.092z"/>
                        </G>
                    </G>
                </Svg>
            </View>
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
                            <SoccerBallLogo />
                            <Text style={styles.title}>Caruotto Cup</Text>
                            <Text style={styles.subtitle}>
                                {mode === 'login' ? 'Bentornato! Accedi per continuare.' : mode === 'register' ? 'Inizia la tua sfida oggi.' : 'Reimposta la tua password.'}
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
    container: { flex: 1, backgroundColor: '#0f172a' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 10 },
    card: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 30, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', width: '100%', maxWidth: 500, alignSelf: 'center' },
    heroSection: { alignItems: 'center', marginBottom: 35 },
    logoContainer: { marginBottom: 20, alignItems: 'center', justifyContent: 'center' },
    ballOuter: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', position: 'relative', shadowColor: '#38bdf8', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.4, shadowRadius: 25, elevation: 15 },
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
    backLinkText: { color: '#64748b', fontSize: 14, fontWeight: 'bold', marginLeft: 6 }
});
