import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    PanResponder,
    Dimensions,
    ScrollView,
    Platform
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
    visible: boolean;
    currentColor: string;
    onSelect: (color: string) => void;
    onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PICKER_WIDTH = SCREEN_WIDTH - 48;
const PANEL_HEIGHT = 200;
const HUE_HEIGHT = 20;

// Utility per conversione colori
const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
};

const rgbToHsv = (r: number, g: number, b: number) => {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, v = max;
    const d = max - min;
    s = max === 0 ? 0 : d / max;
    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return { h: h * 360, s, v };
};

const hsvToRgb = (h: number, s: number, v: number) => {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v; g = t; b = p; break;
        case 1: r = q; g = v; b = p; break;
        case 2: r = p; g = v; b = t; break;
        case 3: r = p; g = q; b = v; break;
        case 4: r = t; g = p; b = v; break;
        case 5: r = v; g = p; b = q; break;
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
};

const rgbToHex = (r: number, g: number, b: number) => {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
};

export default function ColorPickerModal({ visible, currentColor, onSelect, onClose }: Props) {
    // Stato HSV
    const [hsv, setHsv] = useState({ h: 0, s: 1, v: 1 });

    // Sincronizza lo stato iniziale SOLO quando il modal viene aperto
    useEffect(() => {
        if (visible) {
            if (currentColor) {
                try {
                    const { r, g, b } = hexToRgb(currentColor);
                    setHsv(rgbToHsv(r, g, b));
                } catch (e) {
                    setHsv({ h: 0, s: 1, v: 1 });
                }
            } else {
                setHsv({ h: 0, s: 1, v: 1 });
            }
        }
    }, [visible]);

    const hexColor = useMemo(() => {
        const { r, g, b } = hsvToRgb(hsv.h, hsv.s, hsv.v);
        return rgbToHex(r, g, b);
    }, [hsv]);

    // Colore di base per il gradiente (piena saturazione e luminosità)
    const baseHueColor = useMemo(() => {
        const { r, g, b } = hsvToRgb(hsv.h, 1, 1);
        return rgbToHex(r, g, b);
    }, [hsv.h]);

    // PAN RESPONDER: Pannello 2D (Saturation & Value)
    const panPanel = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => handlePanelMove(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
            onPanResponderMove: (evt) => handlePanelMove(evt.nativeEvent.locationX, evt.nativeEvent.locationY),
        })
    ).current;

    const handlePanelMove = (x: number, y: number) => {
        const s = Math.max(0, Math.min(1, x / PICKER_WIDTH));
        const v = Math.max(0, Math.min(1, 1 - (y / PANEL_HEIGHT)));
        setHsv(prev => ({ ...prev, s, v }));
    };

    // PAN RESPONDER: Hue Slider
    const panHue = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => handleHueMove(evt.nativeEvent.locationX),
            onPanResponderMove: (evt) => handleHueMove(evt.nativeEvent.locationX),
        })
    ).current;

    const handleHueMove = (x: number) => {
        const h = Math.max(0, Math.min(360, (x / PICKER_WIDTH) * 360));
        setHsv(prev => ({ ...prev, h }));
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.container}>
                    <View style={s.header}>
                        <View style={s.headerAccent} />
                        <Text style={s.title}>Seleziona Colore</Text>
                    </View>

                    <ScrollView style={s.scrollView} showsVerticalScrollIndicator={false}>
                        {/* 1. PANNELLO 2D (SATURAZIONE & LUMINOSITÀ) */}
                        <Text style={s.label}>Saturazione e Luminosità</Text>
                        <View style={[s.panelContainer, { backgroundColor: baseHueColor }]} {...panPanel.panHandlers}>
                            <LinearGradient
                                colors={['#FFFFFF', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            <LinearGradient
                                colors={['transparent', '#000000']}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />
                            {/* Cursore del Pannello - pointerEvents="none" evita il salto delle coordinate */}
                            <View 
                                pointerEvents="none"
                                style={[s.cursor, {
                                    left: hsv.s * PICKER_WIDTH - 10,
                                    top: (1 - hsv.v) * PANEL_HEIGHT - 10,
                                    backgroundColor: hexColor
                                }]} 
                            />
                        </View>

                        {/* 2. SLIDER TONALITÀ (HUE) */}
                        <Text style={s.label}>Tonalità (Hue)</Text>
                        <View style={s.hueSliderContainer} {...panHue.panHandlers}>
                            <LinearGradient
                                colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={s.hueGradient}
                                pointerEvents="none"
                            />
                            {/* Cursore della Tonalità - pointerEvents="none" evita il salto delle coordinate */}
                            <View 
                                pointerEvents="none"
                                style={[s.hueCursor, {
                                    left: (hsv.h / 360) * PICKER_WIDTH - 10,
                                    backgroundColor: baseHueColor
                                }]} 
                            />
                        </View>

                        {/* 3. PREVIEW & HEX */}
                        <View style={s.previewCard}>
                            <View style={[s.colorPreview, { backgroundColor: hexColor }]} />
                            <View style={s.hexInfo}>
                                <Text style={s.hexTitle}>COLORE SELEZIONATO</Text>
                                <Text style={s.hexValue}>{hexColor}</Text>
                            </View>
                        </View>

                        <View style={{ height: 40 }} />
                    </ScrollView>

                    {/* 4. BOTTONI FISSI */}
                    <View style={s.footer}>
                        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                            <Text style={s.cancelBtnText}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.confirmBtn} onPress={() => { onSelect(hexColor); onClose(); }}>
                            <Text style={s.confirmBtnText}>Salva Colore</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'flex-end',
    },
    container: {
        backgroundColor: '#0f172a',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        height: SCREEN_HEIGHT * 0.8,
        width: '100%',
        paddingTop: 8,
    },
    header: {
        alignItems: 'center',
        paddingBottom: 16,
    },
    headerAccent: {
        width: 40,
        height: 4,
        backgroundColor: '#334155',
        borderRadius: 2,
        marginVertical: 12,
    },
    title: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 24,
    },
    label: {
        color: '#94a3b8',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        marginTop: 20,
    },
    panelContainer: {
        width: PICKER_WIDTH,
        height: PANEL_HEIGHT,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
    },
    cursor: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: '#ffffff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 3,
    },
    hueSliderContainer: {
        width: PICKER_WIDTH,
        height: HUE_HEIGHT,
        position: 'relative',
        justifyContent: 'center',
    },
    hueGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 10,
    },
    hueCursor: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 3,
        borderColor: '#ffffff',
        top: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 2,
        elevation: 3,
    },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1e293b',
        padding: 16,
        borderRadius: 16,
        marginTop: 30,
        gap: 16,
    },
    colorPreview: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    hexInfo: {
        flex: 1,
    },
    hexTitle: {
        color: '#64748b',
        fontSize: 10,
        fontWeight: 'bold',
    },
    hexValue: {
        color: '#f1f5f9',
        fontSize: 22,
        fontWeight: '800',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        gap: 12,
        backgroundColor: '#1e293b',
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.1)',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#475569',
    },
    cancelBtnText: {
        color: '#94a3b8',
        fontWeight: 'bold',
    },
    confirmBtn: {
        flex: 2,
        backgroundColor: '#0ea5e9',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#ffffff',
        fontWeight: 'bold',
    },
});
