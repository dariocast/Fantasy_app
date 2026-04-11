import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useStore } from '../store';
import { v4 as uuidv4 } from 'uuid';

export default function AuthScreen({ navigation }: any) {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [message, setMessage] = useState('');

    const users = useStore(state => state.users);
    const addUser = useStore(state => state.addUser);
    const setCurrentUser = useStore(state => state.setCurrentUser);
    const updateUser = useStore(state => state.updateUser);

    const handleLogin = () => {
        if (!email || !password) {
            setMessage('Compila tutti i campi');
            return;
        }
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            setCurrentUser(user);
            setMessage('');
            navigation.replace('Leagues');
        } else {
            setMessage('Email o password errati');
        }
    };

    const handleRegister = () => {
        if (!email || !password || !firstName || !lastName) {
            setMessage('Compila tutti i campi');
            return;
        }
        if (users.some(u => u.email === email)) {
            setMessage('Email già in uso');
            return;
        }
        const newUser = {
            id: uuidv4(),
            email,
            firstName,
            lastName,
            password
        };
        addUser(newUser);
        setCurrentUser(newUser);
        setMessage('');
        navigation.replace('Leagues');
    };

    const handleRecover = () => {
        if (!email) {
            setMessage('Inserisci un\'email valida');
            return;
        }
        const user = users.find(u => u.email === email);
        if (user) {
            const code = Math.floor(100000 + Math.random() * 900000).toString();
            updateUser({ ...user, resetCode: code });
            setMessage(`Codice di recupero inviato. Il codice è: ${code}`);
            setMode('login');
        } else {
            setMessage('Email non trovata');
        }
    };

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.card}>
                    <Text style={styles.title}>FantaTorneo</Text>

                    {message ? (
                        <View style={[
                            styles.messageBox, 
                            (message.includes('errati') || message.includes('non trovata') || message.includes('compila') || message.includes('già')) ? styles.messageError : styles.messageSuccess
                        ]}>
                            <Text style={[
                                styles.messageText,
                                (message.includes('errati') || message.includes('non trovata') || message.includes('compila') || message.includes('già')) ? styles.messageTextError : styles.messageTextSuccess
                            ]}>{message}</Text>
                        </View>
                    ) : null}

                    {mode === 'login' && (
                        <View style={styles.form}>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#94a3b8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            <TouchableOpacity style={styles.primaryButton} onPress={handleLogin}>
                                <Text style={styles.primaryButtonText}>Accedi</Text>
                            </TouchableOpacity>

                            <View style={styles.linksContainer}>
                                <TouchableOpacity onPress={() => setMode('register')}>
                                    <Text style={styles.linkText}>Nuovo utente? Registrati</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setMode('forgot')}>
                                    <Text style={styles.linkText}>Hai dimenticato la password?</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {mode === 'register' && (
                        <View style={styles.form}>
                            <TextInput
                                style={styles.input}
                                placeholder="Nome"
                                placeholderTextColor="#94a3b8"
                                value={firstName}
                                onChangeText={setFirstName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Cognome"
                                placeholderTextColor="#94a3b8"
                                value={lastName}
                                onChangeText={setLastName}
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            <TextInput
                                style={styles.input}
                                placeholder="Password"
                                placeholderTextColor="#94a3b8"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                            />
                            <TouchableOpacity style={styles.primaryButton} onPress={handleRegister}>
                                <Text style={styles.primaryButtonText}>Registrati</Text>
                            </TouchableOpacity>

                            <View style={styles.linksContainer}>
                                <TouchableOpacity onPress={() => setMode('login')}>
                                    <Text style={styles.linkText}>Torna al Login</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {mode === 'forgot' && (
                        <View style={styles.form}>
                            <Text style={styles.helperText}>
                                Inserisci la tua email per ricevere un codice di ripristino
                            </Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Email"
                                placeholderTextColor="#94a3b8"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                            <TouchableOpacity style={styles.primaryButton} onPress={handleRecover}>
                                <Text style={styles.primaryButtonText}>Invia Codice</Text>
                            </TouchableOpacity>

                            <View style={styles.linksContainer}>
                                <TouchableOpacity onPress={() => setMode('login')}>
                                    <Text style={styles.linkText}>Annulla e torna al Login</Text>
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
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#38bdf8',
        textAlign: 'center',
        marginBottom: 24,
    },
    messageBox: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
    },
    messageError: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: '#ef4444',
    },
    messageSuccess: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderColor: '#22c55e',
    },
    messageText: {
        textAlign: 'center',
        fontSize: 14,
    },
    messageTextError: {
        color: '#ef4444',
    },
    messageTextSuccess: {
        color: '#22c55e',
    },
    form: {
        width: '100%',
    },
    helperText: {
        color: '#94a3b8',
        textAlign: 'center',
        marginBottom: 16,
    },
    input: {
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        color: '#f8fafc',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    primaryButton: {
        backgroundColor: '#0ea5e9',
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8,
    },
    primaryButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    linksContainer: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#94a3b8',
        fontSize: 14,
        marginBottom: 12,
    }
});
