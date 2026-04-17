import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import ColorPicker, { HueCircular, Panel1, Swatches, Preview } from 'reanimated-color-picker';

interface Props {
    visible: boolean;
    currentColor: string;
    onSelect: (color: string) => void;
    onClose: () => void;
}

export default function ColorPickerModal({ visible, currentColor, onSelect, onClose }: Props) {
    const [selectedColor, setSelectedColor] = useState(currentColor);

    const onColorComplete = (color: any) => {
        setSelectedColor(color.hex);
    };

    const handleConfirm = () => {
        onSelect(selectedColor);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.overlay}>
                <View style={s.container}>
                    <Text style={s.title}>Scegli un Colore</Text>

                    <ColorPicker
                        value={currentColor}
                        onComplete={onColorComplete}
                        style={s.picker}
                    >
                        <Preview style={s.preview} />
                        <HueCircular
                            containerStyle={s.hueCircle}
                            thumbShape="circle"
                            thumbSize={28}
                        >
                            <Panel1 style={s.panel} />
                        </HueCircular>
                        <Swatches
                            style={s.swatches}
                            swatchStyle={s.swatch}
                            colors={[
                                '#FFD700', '#00E5FF', '#4CAF50', '#ef4444',
                                '#8b5cf6', '#f97316', '#ec4899', '#14b8a6',
                                '#3b82f6', '#a855f7', '#f43f5e', '#84cc16'
                            ]}
                        />
                    </ColorPicker>

                    <View style={s.btnRow}>
                        <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
                            <Text style={s.cancelBtnText}>Annulla</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.confirmBtn} onPress={handleConfirm}>
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
    },
    container: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    title: {
        color: '#f8fafc',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    picker: {
        width: '100%',
        alignItems: 'center',
        gap: 16,
    },
    preview: {
        width: '100%',
        height: 40,
        borderRadius: 12,
        marginBottom: 8,
    },
    hueCircle: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 240,
        height: 240,
    },
    panel: {
        width: '65%',
        height: '65%',
        borderRadius: 12,
    },
    swatches: {
        marginTop: 8,
        justifyContent: 'center',
    },
    swatch: {
        width: 28,
        height: 28,
        borderRadius: 14,
        margin: 4,
    },
    btnRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
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
