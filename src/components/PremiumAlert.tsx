import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertTriangle, Info, XCircle, AlertCircle } from 'lucide-react-native';
import { useStore } from '../store';

export default function PremiumAlert() {
    const notification = useStore(state => state.notification);
    const showNotification = useStore(state => state.showNotification);
    const [fadeAnim] = React.useState(new Animated.Value(0));

    React.useEffect(() => {
        if (notification) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            fadeAnim.setValue(0);
        }
    }, [notification]);

    if (!notification) return null;

    const { type, title, message, actions } = notification;

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 size={40} color="#22c55e" />;
            case 'error': return <XCircle size={40} color="#ef4444" />;
            case 'confirm': return <AlertTriangle size={40} color="#fbbf24" />;
            default: return <Info size={40} color="#38bdf8" />;
        }
    };

    const handleAction = (onPress?: () => void) => {
        if (onPress) onPress();
        showNotification(null);
    };

    const defaultActions = actions || [{ text: 'Chiudi', style: 'default' }];

    return (
        <Modal transparent visible={!!notification} animationType="fade">
            <View style={styles.overlay}>
                <TouchableOpacity 
                    activeOpacity={1} 
                    style={styles.backdrop} 
                    onPress={() => type !== 'confirm' && showNotification(null)} 
                />
                <Animated.View style={[styles.alertContainer, { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }] }]}>
                    <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint="dark" style={styles.blurWrapper}>
                        <View style={styles.content}>
                            <View style={styles.iconContainer}>
                                {getIcon()}
                            </View>
                            
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.message}>{message}</Text>
                            
                            <View style={styles.actionsContainer}>
                                {defaultActions.map((action, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.button,
                                            action.style === 'destructive' && styles.buttonDestructive,
                                            action.style === 'cancel' && styles.buttonCancel,
                                            index > 0 && styles.buttonMargin
                                        ]}
                                        onPress={() => handleAction(action.onPress)}
                                    >
                                        <Text style={[
                                            styles.buttonText,
                                            action.style === 'cancel' && styles.buttonTextCancel
                                        ]}>
                                            {action.text}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </BlurView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    alertContainer: {
        width: '85%',
        maxWidth: 400,
        borderRadius: 30,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    blurWrapper: {
        padding: 25,
    },
    content: {
        alignItems: 'center',
    },
    iconContainer: {
        marginBottom: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 15,
        borderRadius: 25,
    },
    title: {
        fontSize: 20,
        fontWeight: '900',
        color: '#f8fafc',
        textAlign: 'center',
        marginBottom: 10,
    },
    message: {
        fontSize: 15,
        color: '#94a3b8',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 25,
    },
    actionsContainer: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
    },
    button: {
        flex: 1,
        backgroundColor: '#38bdf8',
        paddingVertical: 14,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonMargin: {
        marginLeft: 10,
    },
    buttonDestructive: {
        backgroundColor: '#ef4444',
    },
    buttonCancel: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    buttonTextCancel: {
        color: '#94a3b8',
    }
});
