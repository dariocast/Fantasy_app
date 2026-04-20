# 🏆 Fantasy Football Mobile

App mobile completa per la gestione di tornei di fantacalcio personalizzati.

## 🚀 Caratteristiche principali
- **Gestione Leghe**: Crea o partecipa a leghe con regole personalizzate.
- **Mercato Dinamico**: Compravendita giocatori con gestione del budget.
- **Formazioni**: Schiera la tua rosa su un campo interattivo.
- **Punteggi Automatici**: Calcolo automatico basato su voti reali e fasce gol.
- **Admin Panel**: Strumenti completi per gli organizzatori (gestione match, voti, co-admin).
- **Design Moderno**: Interfaccia scura, glassmorphism e animazioni fluide.

## 🛠 Tech Stack
- **Framework**: [React Native](https://reactnative.dev/) via [Expo](https://expo.dev/)
- **Linguaggio**: [TypeScript](https://www.typescriptlang.org/)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Local Storage**: [AsyncStorage](https://react-native-async-storage.github.io/async-storage/)
- **Navigation**: [React Navigation](https://reactnavigation.org/)

## 📦 Installazione e Setup

1. **Clona il repository**:
   ```bash
   git clone <repo-url>
   cd fantalega-mobile
   ```

2. **Installa le dipendenze**:
   ```bash
   npm install
   ```

3. **Configura Supabase**:
   Crea un file `.env` basato su `.env.example` e inserisci le tue chiavi:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Avvia il server di sviluppo**:
   ```bash
   npm start
   ```
   Usa l'app **Expo Go** sul tuo smartphone per testare l'applicazione.

## 🧪 Testing e Qualità
- **Linting**: `npm run lint`
- **Formatting**: `npm run format`
- **Tests**: `npm test`

---
Realizzato con ❤️ dal team di sviluppo Fantalega.
