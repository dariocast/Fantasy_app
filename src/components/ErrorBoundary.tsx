import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { logger } from '../utils/logger';

interface Props {
    children: ReactNode;
    fallback?: (error: Error, retry: () => void) => ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global Error Boundary to catch UI crashes and prevent the app from completely disappearing.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI.
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        logger.error('Uncaught Error in UI:', error, errorInfo);
    }

    private handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback(this.state.error!, this.handleRetry);
            }

            return (
                <View style={styles.container}>
                    <View style={styles.card}>
                        <Text style={styles.title}>Oops! Qualcosa è andato storto.</Text>
                        <Text style={styles.message}>
                            L'applicazione ha riscontrato un errore imprevisto.
                        </Text>
                        {__DEV__ && (
                            <Text style={styles.errorText}>
                                {this.state.error?.message}
                            </Text>
                        )}
                        <TouchableOpacity style={styles.button} onPress={this.handleRetry}>
                            <Text style={styles.buttonText}>Riprova</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.7)',
        borderRadius: 24,
        padding: 32,
        width: '100%',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#f8fafc',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 24,
        textAlign: 'center',
    },
    errorText: {
        fontSize: 12,
        fontFamily: 'Courier',
        color: '#ef4444',
        backgroundColor: 'rgba(0,0,0,0.3)',
        padding: 12,
        borderRadius: 8,
        width: '100%',
        marginBottom: 24,
    },
    button: {
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 16,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
