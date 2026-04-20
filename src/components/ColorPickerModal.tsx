import React, { useState, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    Modal, 
    TouchableOpacity,
    Dimensions,
    GestureResponderEvent,
} from 'react-native';

interface Props {
    visible: boolean;
    currentColor: string;
    onSelect: (color: string) => void;
    onClose: () => void;
}

export default function ColorPickerModal({ 
    visible, 
    currentColor, 
    onSelect, 
    onClose 
}: Props) {
    const [selectedColor, setSelectedColor] = useState(currentColor);
    const [saturation, setSaturation] = useState(100);
    const [brightness, setBrightness] = useState(100);

    // Predefined colors palette (più affidabile)
    const presetColors = [
        '#FFD700', '#00E5FF', '#4CAF50', '#ef4444',
        '#8b5cf6', '#f97316', '#ec4899', '#14b8a6',
        '#3b82f6', '#a855f7', '#f43f5e', '#84cc16',
        '#06b6d4', '#f59e0b', '#10b981', '#6366f1',
    ];

    // HSL to RGB converter
    const hslToRgb = (h: number, s: number, l: number): string => {
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;

        if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
        else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
        else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
        else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
        else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
        else if (h >= 300 && h < 360) [r, g, b] = [c, 0, x];

        const toHex = (val: number) => {
            const hex = Math.round((val + m) * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    };

    // RGB to HSL converter
    const rgbToHsl = (hex: string): [number, number, number] => {
        if (!hex) return [0, 0, 100];
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const l = (max + min) / 2;

        if (max === min) return [0, 0, l * 100];

        const d = max - min;
        const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        let h = 0;
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }

        return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
    };

    const handleConfirm = useCallback(() => {
        try {
            if (!selectedColor || selectedColor.length === 0) {
                onSelect(currentColor);
            } else {
                onSelect(selectedColor);
            }
            onClose();
        } catch (error) {
            console.error('Color selection error:', error);
            onClose();
        }
    }, [selectedColor, currentColor, onSelect, onClose]);

    const handleHueChange = useCallback((event: GestureResponderEvent) => {
        try {
            const { locationX, locationY } = event.nativeEvent;
            const centerX = 120;
            const centerY = 120;
            const radius = 110;

            const dx = locationX - centerX;
            const dy = locationY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < radius) {
                let hue = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                if (hue < 0) hue += 360;

                const [, s, l] = rgbToHsl(selectedColor);
                const newColor = hslToRgb(hue, s / 100, l / 100);
                setSelectedColor(newColor);
            }
        } catch (error) {
            console.error('Hue change error:', error);
        }
    }, [selectedColor]);

    const handleSaturationChange = useCallback((event: GestureResponderEvent) => {
        try {
            const { locationX } = event.nativeEvent;
            const width = Dimensions.get('window').width - 80;
            const sat = Math.max(0, Math.min(100, (locationX / width) * 100));
            setSaturation(sat);

            const [h, , l] = rgbToHsl(selectedColor);
            const newColor = hslToRgb(h, sat / 100, l / 100);
            setSelectedColor(newColor);
        } catch (error) {
            console.error('Saturation change error:', error);
        }
    }, [selectedColor]);

    const handleBrightnessChange = useCallback((event: GestureResponderEvent) => {
        try {
            const { locationX } = event.nativeEvent;
            const width = Dimensions.get('window').width - 80;
            const bright = Math.max(0, Math.min(100, (locationX / width) * 100));
            setBrightness(bright);

            const [h, s] = rgbToHsl(selectedColor);
            const newColor = hslToRgb(h, s / 100, bright / 100);
            setSelectedColor(newColor);
        } catch (error) {
            console.error('Brightness change error:', error);
        }
    }, [selectedColor]);

    if (!visible) return null;

    const [hue] = rgbToHsl(selectedColor);

    return (
        <Modal 
            visible={visible} 
            transparent 
            animationType="fade" 
            onRequestClose={onClose}
        >
            <View style={s.overlay}>
                <View style={s.container}>
                    <Text style={s.title}>Scegli un Colore</Text>

                    {/* Color Preview */}
                    <View 
                        style={[
                            s.preview, 
                            { backgroundColor: selectedColor }
                        ]} 
                    />
                    <Text style={s.colorText}>{selectedColor}</Text>

                    {/* Hue Circle Picker */}
                    <TouchableOpacity 
                        style={s.hueContainer}
                        onPress={handleHueChange}
                        activeOpacity={1}
                    >
                        <View 
                            style={[
                                s.hueCircle,
                                { 
                                    backgroundColor: `hsl(${hue}, 100%, 50%)`,
                                }
                            ]} 
                        />
                    </TouchableOpacity>

                    {/* Saturation Slider */}
                    <View style={s.sliderContainer}>
                        <Text style={s.sliderLabel}>Saturazione</Text>
                        <TouchableOpacity 
                            style={s.slider}
                            onPress={handleSaturationChange}
                            activeOpacity={0.8}
                        >
                            <View 
                                style={[
                                    s.sliderThumb,
                                    { left: `${saturation}%` }
                                ]} 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Brightness Slider */}
                    <View style={s.sliderContainer}>
                        <Text style={s.sliderLabel}>Luminosità</Text>
                        <TouchableOpacity 
                            style={s.slider}
                            onPress={handleBrightnessChange}
                            activeOpacity={0.8}
                        >
                            <View 
                                style={[
                                    s.sliderThumb,
                                    { left: `${brightness}%` }
                                ]} 
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Preset Colors */}
                    <View style={s.presetsContainer}>
                        <Text style={s.presetsTitle}>Colori Suggeriti</Text>
                        <View style={s.presetsGrid}>
                            {presetColors.map((color, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    style={[
                                        s.presetColor,
                                        { backgroundColor: color },
                                        selectedColor === color && s.presetColorSelected
                                    ]}
                                    onPress={() => setSelectedColor(color)}
                                />
                            ))}
                        </View>
                    </View>

                    {/* Buttons */}
                    <View style={s.btnRow}>
                        <TouchableOpacity 
                            style={s.cancelBtn} 
                            onPress={onClose}
                        >
                            <Text style={s.cancelBtnText}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={s.confirmBtn} 
                            onPress={handleConfirm}
                        >
                            <Text style={s.confirmBtnText}>Conferma</Text>
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
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 20,
        alignItems: 'center',
    },
    container: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
    },
    title: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    preview: {
        width: '100%',
        height: 50,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#94a3b8',
    },
    colorText: {
        color: '#94a3b8',
        fontSize: 13,
        marginBottom: 16,
        fontWeight: 'bold',
    },
    hueContainer: {
        width: 240,
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderRadius: 120,
        overflow: 'hidden',
    },
    hueCircle: {
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    sliderContainer: {
        width: '100%',
        marginBottom: 16,
    },
    sliderLabel: {
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    slider: {
        width: '100%',
        height: 30,
        backgroundColor: '#334155',
        borderRadius: 15,
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#475569',
    },
    sliderThumb: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#38bdf8',
        position: 'absolute',
    },
    presetsContainer: {
        width: '100%',
        marginBottom: 20,
    },
    presetsTitle: {
        color: '#f8fafc',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    presetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },
    presetColor: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    presetColorSelected: {
        borderColor: '#38bdf8',
        borderWidth: 3,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#94a3b8',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    cancelBtnText: {
        color: '#94a3b8',
        fontWeight: 'bold',
        fontSize: 15,
    },
    confirmBtn: {
        flex: 1,
        backgroundColor: '#0ea5e9',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    confirmBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
});
