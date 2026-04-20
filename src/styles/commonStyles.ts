import { StyleSheet, Platform } from 'react-native';

export const commonStyles = StyleSheet.create({
    // ═══ KEYBOARD AVOIDING ═══
    keyboardView: {
        flex: 1,
    },
    
    // ═══ CONTAINERS ═══
    scrollContainer: {
        flexGrow: 1,
        paddingBottom: 60,
    },
    
    // ═══ TEXT SAFETY ═══
    textWithEllipsis: {
        overflow: 'hidden',
    },
    
    singleLineText: {
        maxWidth: '90%',
    },
    
    // ═══ INPUT SAFETY ═══
    inputContainer: {
        marginBottom: 16,
    },
    
    focusedInput: {
        borderColor: '#38bdf8',
        borderWidth: 2,
    },
    
    // ═══ MODAL ═══
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20
    },
    modalContent: {
        backgroundColor: '#1e293b',
        borderRadius: 20,
        padding: 24,
        paddingBottom: 80,  // Extra space for keyboard
        maxHeight: '90%',
    },
    
    // ═══ RESPONSIVE ═══
    responsiveRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    // ═══ FORMATION FIELD ═══
    fieldGrid: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'space-around',
        paddingVertical: 15,
        paddingHorizontal: 10
    },
    playerSlot: {
        width: '20%',
        aspectRatio: 1,
        maxWidth: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '1.5%',
        overflow: 'hidden'
    }
});
