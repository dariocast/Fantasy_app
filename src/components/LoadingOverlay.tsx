import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Modal } from 'react-native';

interface LoadingOverlayProps {
    visible: boolean;
    message?: string;
}

/**
 * Global Loading Overlay with Glassmorphism effect.
 */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ visible, message = 'Caricamento...' }) => {
    if (!visible) return null;

    return (
        <Modal transparent animationType="fade" visible={visible}>
            <View style={styles.container}>
                <View style={styles.card}>
                    <ActivityIndicator size="large" color="#38bdf8" />
                    <Text style={styles.text}>{message}</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
    },
    card: {
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        padding: 30,
        borderRadius: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    text: {
        marginTop: 15,
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
});
