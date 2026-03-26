# 📱 Mobile Controls & Gestures Guide

Quasar AI is fully optimized for mobile devices with intuitive touch controls and responsive design. This guide covers everything you need to know about using Quasar AI on your phone or tablet.

---

## 🎮 Touch Controls

### **Header Controls**
- **☰ Menu Button** (top-left) — Toggle sidebar open/close
- **⚙️ Settings** (top-right) — Open settings modal
- **Model Selector** (hidden on small screens, swipe up on input to access on some devices)

### **Chat Area**
- **Tap message** — Select/highlight message
- **Hover (long-press)** — Reveal copy button
- **Copy button** — One-tap copy to clipboard
- **Scroll** — Natural scrolling through chat history

### **Input Controls**
- **📎 Attach** — Tap to upload image from device
- **🎤 Voice** — Tap to start/stop voice input
- **Send ↑** — Submit message (disabled until text or file is added)

### **Sidebar (Chat List)**
- **Tap chat** — Switch to that conversation
- **Long-press chat name** — Reveal rename/delete options
- **✏️ Rename** — Edit chat title
- **🗑️ Delete** — Remove conversation

---

## 📲 Gesture Controls

### **Scroll Chat**
- **Swipe Up/Down** → Scroll through messages
- **Double-tap** → Jump to latest message

### **Close Modals**
- **Swipe Down** → Close settings modal (on some devices)
- **Tap outside modal** → Close modal
- **Tap ✕ button** → Close modal

### **Long-Press (Context Menu)**
- **Long-press message** → Highlight message, reveal copy button
- **Long-press chat** → Reveal rename/delete options
- **Long-press attachment preview** → Options to view or remove

---

## 🎨 Responsive Layout

### **Small Screens (< 640px)**
- Sidebar **hidden by default** (tap ☰ to open)
- Model selector **hidden** (tap Settings → API Management to change)
- Full-width chat area
- Bottom input bar with touch-friendly buttons
- Stacked layout for settings modal

### **Medium Screens (640px - 1024px)**
- Sidebar **always visible** (can collapse)
- Model selector **visible** (compact dropdown)
- Optimal spacing for tablet use

### **Large Screens (> 1024px)**
- Sidebar **permanently visible** (can be collapsed)
- Model selector **full-featured**
- Spacious chat layout

---

## 📍 Touch-Friendly Features

### **Button Sizes**
- All buttons are **minimum 44x44px** (recommended by Apple & Google)
- Touch targets have adequate spacing to prevent accidental taps
- Interactive elements have visual feedback (hover effects, animations)

### **Input Optimization**
- Textarea **auto-expands** as you type (up to 48 lines)
- Keyboard dismisses automatically after sending
- Input maintains focus for continuous typing
- Voice button **clearly visible** and easy to tap

### **Scrolling Behavior**
- Smooth scroll-to-bottom after new messages
- Momentum scrolling enabled
- Pull-to-refresh (when supported by browser)
- Passive event listeners for better scroll performance

---

## 🔊 Voice Input on Mobile

### **iOS (Safari)**
1. Tap 🎤 microphone button
2. Allow microphone access when prompted
3. Speak naturally
4. Tap 🎤 again or wait for auto-stop
5. Transcript appears in input box

### **Android (Chrome)**
1. Tap 🎤 microphone button
2. Grant microphone permission if needed
3. Speak clearly
4. Tap 🎤 again to finish
5. Text is inserted into input

### **Common Issues on Mobile**
- **"No microphone found"** → Check device microphone isn't muted (check mute switch on side)
- **"Permission denied"** → Allow microphone in browser settings
- **No transcription** → Ensure stable internet connection
- **Slow transcription** → Some devices use cloud processing, may be slower

---

## 🖼️ Image Attachments on Mobile

### **Upload Image**
1. Tap 📎 paperclip button
2. Select "Camera" (take photo) or "Photos" (from gallery)
3. Choose or take image
4. Image preview appears with file name
5. Type your question about the image
6. Tap Send ↑

### **Remove Image**
- Tap **✕** on image preview to remove attachment
- Upload new image to replace

### **Supported Formats**
- JPEG (.jpg, .jpeg) ✅
- PNG (.png) ✅
- WebP (.webp) ✅
- GIF (.gif) ✅ (static only, no animation)

---

## 🌙 Theme Toggle on Mobile

### **Light/Dark Mode**
1. Tap ⚙️ Settings (top-right)
2. Tap **General** tab
3. Find **Theme Preference**
4. Tap button to toggle Light ↔️ Dark
5. Changes apply instantly

### **Auto-Detection**
- On first visit, Quasar AI detects your device's theme preference
- Respects system dark mode setting
- Can be manually overridden anytime in Settings

---

## ⚙️ Settings on Mobile

### **Accessing Settings**
- Tap **⚙️ Settings** button (top-right header)
- Settings open in full-screen modal

### **General Tab**
- **Theme** — Toggle Light/Dark mode
- **Clear All Chats** — Delete all conversations (⚠️ irreversible)

### **API Management Tab**
- Add API keys for each provider
- See connection status for each
- Tap "Get API Key" link to open provider pages
- Tap **Connect** button after adding key
- View connected models

### **Help Tab**
- App name and version
- Keyboard shortcuts reference
- Privacy & security info
- About Quasar AI

---

## 🔐 Data & Privacy on Mobile

### **Local Storage**
- All chat history stored **locally on your device**
- API keys stored **securely** in browser's local storage
- **No data sent to servers** (except to AI providers you choose)

### **Clearing Data**
- **Clear chat history**: Settings → General → Delete All
- **Clear browser data**: Go to browser settings, clear cache & storage for this site
- **Clear app data** (some browsers): Device settings → Apps → Browser → Storage → Clear Data

### **Microphone Privacy**
- Voice input uses **Web Speech API**
- Requires explicit permission each time (on some browsers)
- Audio is processed by your browser or the AI provider
- Quasar AI never stores voice recordings

---

## 📊 Performance Tips for Mobile

### **For Better Speed**
✅ Use **WiFi** instead of mobile data when possible  
✅ Close other browser tabs to free up memory  
✅ Clear browser cache periodically  
✅ Use **HTTPS** connection (more secure & faster)  
✅ Update browser to latest version  

### **Battery Life**
✅ Dark mode uses less battery on OLED screens  
✅ Disable animations in browser settings if needed  
✅ Close browser when not in use  
✅ Reduce screen brightness  

### **Data Usage**
✅ Images uploaded are compressed  
✅ Text-only chats use minimal data  
✅ Avoid uploading large images  
✅ Monitor data usage in browser settings  

---

## 🐛 Troubleshooting Mobile Issues

### **Screen Rotates Unexpectedly**
- Lock screen orientation in device settings
- Or allow rotation and app will adapt automatically

### **Keyboard Covers Input**
- Scroll down to see full input box
- Textarea auto-expands below keyboard
- Try landscape orientation for more space

### **Messages Don't Send**
- Check internet connection
- Verify API key is configured
- Ensure model is selected (check Settings)
- Try refreshing the page

### **Sidebar Won't Close**
- Tap outside sidebar to close
- Swipe left (on mobile)
- Or tap ☰ menu button again

### **Voice Not Working**
- Check microphone permission in browser settings
- Ensure device microphone isn't muted
- Try another browser (Chrome, Firefox, Safari)
- Check internet connection

### **App Feels Slow**
- Clear browser cache and storage
- Close other apps to free up RAM
- Check WiFi signal strength
- Update browser to latest version

---

## 💡 Mobile Tips & Tricks

### **Quick Tips**
1. **Swipe up on input** to reveal settings on some devices
2. **Hold Settings button** to pin it for quick access
3. **Use landscape mode** for wider input and chat area
4. **Dark mode** is easier on eyes in low light
5. **Voice input** is faster for longer messages

### **Accessibility**
- High contrast colors for readability
- Touch targets are large enough for all users
- Text is readable at default size
- Voice input available for hands-free use
- Support for screen readers (on compatible browsers)

### **Productivity**
- Rename chats with descriptive names for quick finding
- Use voice input while doing other things
- Upload images directly from camera for visual questions
- Switch between models to compare responses

---

## 🎯 Quick Reference Card

```
HEADER:           [☰]  New Chat  [⚙️]

CHAT AREA:        Scroll freely
                  Long-press message → Copy
                  
SIDEBAR:          [Chat list]
                  Tap to switch
                  Long-press → Rename/Delete
                  
INPUT:            [📎] [🎤] [TEXT INPUT] [Send ↑]
                  Enter = Send
                  Shift+Enter = New line
                  
SETTINGS:         ⚙️ → General/API/Help
                  ← Back to chat
```

---

**Quasar AI Mobile** — AI at your fingertips. 🚀📱