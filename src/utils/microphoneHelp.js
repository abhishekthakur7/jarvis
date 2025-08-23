/**
 * Microphone Troubleshooting Helper
 * Call helpMicrophone() from the browser console for guidance
 */

function helpMicrophone() {
    console.clear();
    console.log(`
%c🎤 MICROPHONE TROUBLESHOOTING GUIDE
%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

%c⚠️  PROBLEM: "DOMException: The user aborted a request"
%cThis error means you clicked "Block" or "Deny" when asked for microphone permission.

%c🔧 SOLUTION STEPS:

%c1. LOOK FOR THE MICROPHONE ICON
   → Check your browser's address bar for 🎤 or 🔊 icons
   → This icon shows current permission status

%c2. ENABLE MICROPHONE ACCESS
   🔹 Chrome/Edge: Click the 🎤 icon → "Always allow"
   🔹 Firefox: Click shield icon → Allow microphone
   🔹 Safari: Preferences → Websites → Microphone → Allow

%c3. REFRESH AND RETRY
   → Press F5 to refresh the page
   → Try Shift+Alt+8 to toggle microphone again

%c4. CHECK BROWSER SETTINGS (if step 2 doesn't work)
   🔹 Chrome: Settings → Privacy → Site Settings → Microphone
   🔹 Firefox: Settings → Privacy → Permissions → Microphone
   🔹 Safari: Preferences → Websites → Microphone
   🔹 Edge: Settings → Site permissions → Microphone

%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

%c🚨 OTHER COMMON ISSUES:

%c• "No microphone found" 
  → Check if microphone is connected and working
  → Test in other apps (Windows Voice Recorder, etc.)

%c• "Microphone is being used by another application"
  → Close Teams, Zoom, Discord, or other voice apps
  → Check Windows Sound settings for exclusive access

%c• Permissions keep getting denied
  → Clear browser cookies/data for this site
  → Try in an incognito/private window first

%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

%c✅ QUICK TEST:
   Run: %ctestMicrophone()%c in console to test access

%c🎯 SHORTCUT REMINDER:
   %cShift+Alt+8%c = Toggle microphone on/off
   %cShift+Alt+4%c = Send transcription to AI

%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`, 
    'color: #00ff00; font-size: 16px; font-weight: bold;',
    'color: #888; font-size: 12px;',
    'color: #ff4444; font-weight: bold;',
    'color: #ccc;',
    'color: #44ff44; font-weight: bold;',
    'color: #ffff44; font-weight: bold;',
    'color: #ccc;',
    'color: #ccc;',
    'color: #ccc;',
    'color: #ccc;',
    'color: #888; font-size: 12px;',
    'color: #ff8800; font-weight: bold;',
    'color: #ccc;',
    'color: #ccc;',
    'color: #ccc;',
    'color: #ccc;',
    'color: #888; font-size: 12px;',
    'color: #44ff44; font-weight: bold;',
    'color: #ffdd00; background: #333; padding: 2px 4px; border-radius: 3px;',
    'color: #ccc;',
    'color: #44ff44; font-weight: bold;',
    'color: #ffdd00; background: #333; padding: 2px 4px; border-radius: 3px;',
    'color: #ccc;',
    'color: #ffdd00; background: #333; padding: 2px 4px; border-radius: 3px;',
    'color: #ccc;',
    'color: #888; font-size: 12px;'
    );
}

async function testMicrophone() {
    console.log('🧪 Testing microphone access...');
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ SUCCESS: Microphone access granted!');
        
        // Stop the test stream
        stream.getTracks().forEach(track => track.stop());
        
        console.log('🎉 Your microphone is working. Try Shift+Alt+8 now!');
    } catch (error) {
        console.error('❌ FAILED: Microphone access denied');
        console.log('Error:', error.message);
        console.log('\n📋 Follow the steps in helpMicrophone() to fix this.');
    }
}

// Make functions globally available
window.helpMicrophone = helpMicrophone;
window.testMicrophone = testMicrophone;

// Show initial hint
console.log('💡 Having microphone issues? Type helpMicrophone() in console for help!');