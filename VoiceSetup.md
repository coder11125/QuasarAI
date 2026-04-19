# 🎤 Web Speech API Setup & Troubleshooting

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| **Chrome/Chromium** | ✅ Full Support | Best performance |
| **Chrome (Android)** | ✅ Full Support | Uses `webkitSpeechRecognition` |
| **Edge** | ✅ Full Support | Chromium-based |
| **Opera** | ✅ Full Support | Chromium-based |
| **Safari** | ✅ Full Support | macOS & iOS 14.5+ |
| **Mobile Safari (iOS)** | ⚠️ Limited | iOS 14.5+ only |
| **Firefox** | ❌ Not Supported | Web Speech API removed in recent versions |
| **Internet Explorer** | ❌ Not Supported | Use a modern browser |

> The voice button is **automatically hidden** when the browser does not expose `SpeechRecognition` or `webkitSpeechRecognition`.

## Requirements

1. **HTTPS Connection** — Required for microphone access (`http://localhost` also works for local dev)
2. **Microphone Permission** — Browser will prompt for permission on first use
3. **Stable Internet** — Some browsers (Chrome) send audio to cloud services for transcription
4. **Modern Browser** — See support table above

## How It Works

1. Tap/click the **🎤 microphone button** in the chat input bar
2. Browser requests microphone access (first time only)
3. The button turns **red and pulses**, and a "🎤 Listening…" toast appears
4. Speak clearly — interim results are streamed into the input box in real-time
5. Recognition stops automatically when you finish speaking (`continuous = false`)
6. Tap/click the button again at any time to stop early
7. The final transcript is appended to whatever text is already in the input box

## Troubleshooting

### "Microphone permission denied"
- **Chrome/Edge**: Settings → Privacy & security → Site settings → Microphone → Allow for this site
- **Safari (macOS)**: System Settings → Privacy & Security → Microphone → enable your browser
- **Safari (iOS)**: Settings → [Browser] → Microphone → Allow
- **Android (Chrome)**: tap the lock icon in the address bar → Microphone → Allow

### "No speech detected"
- Check your microphone volume in system settings
- Speak clearly at a normal pace
- Reduce background noise
- Try again after a short pause

### "Network error"
- Check your internet connection (Chrome requires cloud access for transcription)
- Try a different browser

### Voice button not visible
- Your browser doesn't support the Web Speech API — the button is hidden automatically
- Switch to Chrome, Edge, or Safari

### Transcription quality is poor
- Speak more clearly and at a moderate pace
- Use a better quality microphone
- Reduce background noise

## Language Support

Defaults to **English (en-US)**. To change the language, edit the `recognition.lang` line in `js/attachments.js`:

```javascript
recognition.lang = 'es-ES'; // Spanish
recognition.lang = 'fr-FR'; // French
recognition.lang = 'de-DE'; // German
recognition.lang = 'ja-JP'; // Japanese
recognition.lang = 'zh-CN'; // Chinese (Simplified)
```

## Privacy & Security

- Chrome sends audio to Google's cloud for transcription; this is handled entirely by the browser
- Safari can process speech on-device on supported hardware
- Quasar AI does not store, log, or transmit voice recordings
- Check your browser's own privacy policy for details on how it processes audio

## Tips for Best Results

✅ Use a quiet environment  
✅ Speak at a natural pace  
✅ Keep the microphone 6–12 inches from your mouth  
✅ Ensure an HTTPS connection  
✅ Check the microphone is not muted in system settings  

## Still Having Issues?

1. Open browser DevTools (F12 / Cmd+Option+I)
2. Check the **Console** tab for errors beginning with `Speech recognition error`
3. Try a different browser
4. File an issue on GitHub with:
   - Browser name & version
   - Error message from the console
   - Microphone type (built-in / external / headset)
   - Environment (quiet/noisy, HTTPS/localhost)
