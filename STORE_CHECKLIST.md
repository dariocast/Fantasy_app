# Store Publication Checklist

Questa checklist contiene le azioni manuali e gli elementi "non-codice" che devi preparare per pubblicare l'app sugli Store Apple e Google.

## Documentazione Legale
- [x] **Privacy Policy URL**: [Visualizza Privacy Policy](https://www.iubenda.com/privacy-policy/75178620) (Completato)
- [x] **Terms of Service URL**: [Visualizza Terms of Service](https://docs.google.com/document/d/1vi0dHfxkSuaKGzhaaWpvcXPejp_qZppY3WwOjUzXSWw/edit?usp=sharing) (Completato)

## Store Listing (Scheda App)
- [ ] **Icona ad alta risoluzione**: Prepara un'icona di dimensioni esatte `1024x1024` pixel (senza trasparenze per iOS).
- [ ] **Screenshot App Store (iOS)**: Screenshot da 6.5 pollici (iPhone Pro Max) e 5.5 pollici (iPhone Plus). Almeno 3 screenshot.
- [ ] **Screenshot Play Store (Android)**: Screenshot del telefono e un'immagine in evidenza (Feature Graphic) di `1024x500` pixel.
- [ ] **Descrizione Completa**: Il testo descrittivo dell'app per gli store.
- [ ] **Sottotitolo / Breve Descrizione**: Una frase promozionale breve (es. "L'app per creare il tuo fantacalcio").

## Sicurezza e Account
- [ ] **Apple Developer Program**: Iscrizione completata ($99/anno).
- [ ] **Google Play Console**: Iscrizione completata ($25 una tantum).
- [ ] **Supabase RLS Attivato**: Verifica di aver incollato ed eseguito lo script SQL delle policy RLS nel tuo database di produzione.
- [ ] **Variabili d'ambiente Sicure**: Assicurati che `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` siano corretti. Non committare MAI altre chiavi segrete come la `SERVICE_ROLE_KEY` (che non dovrebbe essere nell'app mobile).

## Testing
- [ ] Crea un account fittizio nell'app per i revisori di Apple e Google (scrivi le credenziali di test nelle note della revisione quando invii l'app).
