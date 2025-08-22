// src/utils/shortcutConfig.js
// Central registry for default keyboard shortcuts used across the application.
// Import this module wherever you need to reference default keybinds to ensure
// consistency and avoid duplication.

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin' || (typeof navigator !== 'undefined' && navigator.platform.includes('Mac'));
    return {
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        microphoneToggle: 'Shift+Alt+8',
        speakerDetectionToggle: 'Shift+Alt+0',
        reinitializeSession: isMac ? 'Cmd+G' : 'Ctrl+G',
        nextStep: 'Shift+Alt+4',
        nextStepPro: 'Shift+Alt+,',
        previousResponse: isMac ? 'Cmd+Alt+[' : 'Ctrl+Alt+[',
        nextResponse: isMac ? 'Cmd+Alt+]' : 'Ctrl+Alt+]',
        scrollUp: 'Shift+Alt+1',
        scrollDown: 'Shift+Alt+2',
        toggleLayoutMode: 'Shift+Alt+/',
        toggleAutoScroll: 'Shift+Alt+3',
        windowClose: 'Shift+Alt+;',
        
        // Teleprompter Reading Flow Controls
        pauseResumeReading: 'Shift+Alt+P',
        restartCurrentSection: 'Shift+Alt+R',
        skipToNextKeyBlock: 'Shift+Alt+S',
        jumpToResponseEnd: 'Shift+Alt+E',
        
        // Content Navigation
        cycleCodeBlocks: 'Shift+Alt+C',
        jumpBetweenDiagrams: 'Shift+Alt+D',
        highlightNextKeyConcept: 'Shift+Alt+H',
        showQuickSummary: 'Shift+Alt+Q',
        
        // Reading Assistance
        adjustLineSpacing: 'Shift+Alt+L',
        toggleKeyInformationEmphasis: 'Shift+Alt+K',
        adjustReadingTempo: 'Shift+Alt+T',
        toggleFocusMode: 'Shift+Alt+F'
    };
}

// Expose for CommonJS and browser environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getDefaultKeybinds };
}
if (typeof window !== 'undefined') {
    window.getDefaultKeybinds = getDefaultKeybinds;
}