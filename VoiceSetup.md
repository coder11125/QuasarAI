# 🎤 Web Speech API Setup & Troubleshooting

## Browser Support

| Browser | Status | Notes |
|---------|--------|-------|
| **Chrome/Chromium** | ✅ Full Support | Best performance |
| **Firefox** | ✅ Full Support | Requires extension in some versions |
| **Safari** | ✅ Full Support | Works on macOS & iOS 14.5+ |
| **Edge** | ✅ Full Support | Based on Chromium |
| **Opera** | ✅ Full Support | Chromium-based |
| **Internet Explorer** | ❌ Not Supported | Use modern browser |
| **Mobile Safari (iOS)** | ⚠️ Limited | iOS 14.5+ only |

## Requirements

1. **HTTPS Connection** — Required for microphone access (local `http://localhost` works)
2. **Microphone Permission** — Browser will prompt for permission on first use
3. **Stable Internet** — Some browsers require cloud-based processing
4. **Modern Browser** — Released in last 2 years

## How It Works

1. Click the **🎤 microphone icon** in the chat input
2. Browser requests microphone access (first time only)
3. Speak clearly into your microphone
4. Speech is transcribed in real-time (interim results)
5. Final transcript is added to the input box
6. Click again to stop, or it auto-stops after 5-10 seconds of silence

## Troubleshooting

### "Microphone permission denied"
- **Chrome/Edge**: Settings → Privacy → Site settings → Microphone → Allow
- **Firefox**: Click 🔒 lock icon → Edit → Allow microphone
- **Safari**: System Preferences → Security & Privacy → Microphone → Check Quasar AI

### "No speech detected"
- Check microphone volume
- Speak clearly and at normal pace
- Avoid background noise
- Try again after a short pause

### "Network error"
- Check internet connection
- Some providers require cloud connection (Google, Firefox)
- Try a different browser

### Voice button not appearing
- Your browser doesn't support Web Speech API
- Try Chrome, Firefox, Safari, or Edge
- Update to the latest browser version

### Transcription quality is poor
- Speak more clearly
- Use a better microphone
- Reduce background noise
- Try English (en-US) language setting

## Language Support

Currently defaults to **English (en-US)**. To add more languages, modify `script.js`:

```javascript
recognition.lang = 'es-ES'; // Spanish
recognition.lang = 'fr-FR'; // French
recognition.lang = 'de-DE'; // German
recognition.lang = 'ja-JP'; // Japanese
recognition.lang = 'zh-CN'; // Chinese (Simplified)
```

## Privacy & Security

- Speech is processed locally in your browser (when supported)
- Some browsers may send audio to cloud services for processing
- Check your browser's privacy settings
- Quasar AI doesn't store or log voice data

## Tips for Best Results

✅ Use a quiet environment  
✅ Speak at a natural pace  
✅ Use clear pronunciation  
✅ Keep microphone at 6-12 inches away  
✅ Use a decent quality microphone  
✅ Check microphone isn't muted  
✅ Ensure HTTPS connection  

## Still Having Issues?

1. Open browser DevTools (F12)
2. Check the Console tab for errors
3. Look for "Speech recognition error" messages
4. Try a different browser
5. File an issue on GitHub with:
   - Browser & version
   - Error message from console
   - Microphone type
   - Your environment (quiet/noisy, HTTPS/localhost)