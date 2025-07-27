const { BrowserWindow, globalShortcut, ipcMain, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const os = require('os');

let mouseEventsIgnored = false;
let interviewMode = false;
let windowResizing = false;
let resizeAnimation = null;
const RESIZE_ANIMATION_DURATION = 500; // milliseconds

function ensureDataDirectories() {
    const homeDir = os.homedir();
    const cheddarDir = path.join(homeDir, 'cheddar');
    const dataDir = path.join(cheddarDir, 'data');
    const imageDir = path.join(dataDir, 'image');
    const audioDir = path.join(dataDir, 'audio');

    [cheddarDir, dataDir, imageDir, audioDir].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    });

    return { imageDir, audioDir };
}

function createWindow(sendToRenderer, geminiSessionRef) {
    // Get layout preference (default to 'normal')
    let windowWidth = 1100;
    let windowHeight = 600;

    const mainWindow = new BrowserWindow({
        width: windowWidth,
        height: windowHeight,
        frame: false,
        transparent: true,
        hasShadow: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        hiddenInMissionControl: true,
        focusable: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false, // TODO: change to true
            backgroundThrottling: false,
            enableBlinkFeatures: 'GetDisplayMedia',
            webSecurity: true,
            allowRunningInsecureContent: false,
        },
        backgroundColor: '#00000000',
    });

    const { session, desktopCapturer } = require('electron');
    session.defaultSession.setDisplayMediaRequestHandler(
        (request, callback) => {
            desktopCapturer.getSources({ types: ['screen'] }).then(sources => {
                callback({ video: sources[0], audio: 'loopback' });
            });
        },
        { useSystemPicker: true }
    );

    mainWindow.setResizable(false);
    mainWindow.setContentProtection(true);
    mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    // Center window at the top of the screen
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth } = primaryDisplay.workAreaSize;
    const x = Math.floor((screenWidth - windowWidth) / 2);
    const y = 0;
    mainWindow.setPosition(x, y);

    if (process.platform === 'win32') {
        mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
    }

    // Set mouse events to be enabled by default
    mainWindow.setIgnoreMouseEvents(false);
    console.log('Mouse events enabled by default');

    mainWindow.loadFile(path.join(__dirname, '../index.html'));

    // After window is created, check for layout preference and resize if needed
    mainWindow.webContents.once('dom-ready', () => {
        setTimeout(() => {
            const defaultKeybinds = getDefaultKeybinds();
            let keybinds = defaultKeybinds;

            mainWindow.webContents
                .executeJavaScript(
                    `
                try {
                    const savedKeybinds = localStorage.getItem('customKeybinds');
                    
                    return {
                        keybinds: savedKeybinds ? JSON.parse(savedKeybinds) : null
                    };
                } catch (e) {
                    return { keybinds: null };
                }
            `
                )
                .then(async savedSettings => {
                    if (savedSettings.keybinds) {
                        keybinds = { ...defaultKeybinds, ...savedSettings.keybinds };
                    }

                    // Apply content protection setting via IPC handler
                    try {
                        const contentProtection = await mainWindow.webContents.executeJavaScript(
                            'cheddar.getContentProtection()'
                        );
                        mainWindow.setContentProtection(contentProtection);
                        console.log('Content protection loaded from settings:', contentProtection);
                    } catch (error) {
                        console.error('Error loading content protection:', error);
                        mainWindow.setContentProtection(true);
                    }

                    updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
                })
                .catch(() => {
                    // Default to content protection enabled
                    mainWindow.setContentProtection(true);
                    updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef);
                });
        }, 150);
    });

    setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef);

    return mainWindow;
}

function getDefaultKeybinds() {
    const isMac = process.platform === 'darwin';
    return {
        moveUp: isMac ? 'Alt+Up' : 'Ctrl+Up',
        moveDown: isMac ? 'Alt+Down' : 'Ctrl+Down',
        moveLeft: isMac ? 'Alt+Left' : 'Ctrl+Left',
        moveRight: isMac ? 'Alt+Right' : 'Ctrl+Right',
        toggleVisibility: isMac ? 'Cmd+\\' : 'Ctrl+\\',
        toggleClickThrough: isMac ? 'Cmd+M' : 'Ctrl+M',
        microphoneToggle: isMac ? 'Shift+Alt+8' : 'Shift+Alt+8',
        reinitializeSession: isMac ? 'Cmd+G' : 'Ctrl+G',
        nextStep: isMac ? 'Shift+Alt+4' : 'Shift+Alt+4',
        previousResponse: isMac ? 'Cmd+Alt+[' : 'Ctrl+Alt+[',
        nextResponse: isMac ? 'Cmd+Alt+]' : 'Ctrl+Alt+]',
        scrollUp: isMac ? 'Shift+Alt+1' : 'Shift+Alt+1',
        scrollDown: isMac ? 'Shift+Alt+2' : 'Shift+Alt+2',
        toggleLayoutMode: 'Shift+Alt+/',
        toggleAutoScroll: isMac ? 'Shift+Alt+3' : 'Shift+Alt+3',
    };
}

function updateGlobalShortcuts(keybinds, mainWindow, sendToRenderer, geminiSessionRef) {
    console.log('Updating global shortcuts with:', keybinds);

    // Unregister all existing shortcuts
    globalShortcut.unregisterAll();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;
    const moveIncrement = Math.floor(Math.min(width, height) * 0.1);

    // Register window movement shortcuts
    const movementActions = {
        moveUp: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX, currentY - moveIncrement);
        },
        moveDown: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX, currentY + moveIncrement);
        },
        moveLeft: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX - moveIncrement, currentY);
        },
        moveRight: () => {
            if (!mainWindow.isVisible()) return;
            const [currentX, currentY] = mainWindow.getPosition();
            mainWindow.setPosition(currentX + moveIncrement, currentY);
        },
    };

    // Register each movement shortcut
    Object.keys(movementActions).forEach(action => {
        const keybind = keybinds[action];
        if (keybind) {
            try {
                globalShortcut.register(keybind, movementActions[action]);
                console.log(`Registered ${action}: ${keybind}`);
            } catch (error) {
                console.error(`Failed to register ${action} (${keybind}):`, error);
            }
        }
    });

    // Register toggle visibility shortcut
    if (keybinds.toggleVisibility) {
        try {
            globalShortcut.register(keybinds.toggleVisibility, () => {
                if (mainWindow.isVisible()) {
                    mainWindow.hide();
                } else {
                    mainWindow.showInactive();
                }
            });
            console.log(`Registered toggleVisibility: ${keybinds.toggleVisibility}`);
        } catch (error) {
            console.error(`Failed to register toggleVisibility (${keybinds.toggleVisibility}):`, error);
        }
    }

    // Register toggle click-through shortcut
    if (keybinds.toggleClickThrough) {
        try {
            globalShortcut.register(keybinds.toggleClickThrough, () => {
                mouseEventsIgnored = !mouseEventsIgnored;
                if (mouseEventsIgnored) {
                    mainWindow.setIgnoreMouseEvents(true, { forward: true });
                    console.log('Mouse events ignored');
                } else {
                    mainWindow.setIgnoreMouseEvents(false);
                    console.log('Mouse events enabled');
                }
                mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
            });
            console.log(`Registered toggleClickThrough: ${keybinds.toggleClickThrough}`);
        } catch (error) {
            console.error(`Failed to register toggleClickThrough (${keybinds.toggleClickThrough}):`, error);
        }
    }

    // Register microphone toggle shortcut
    if (keybinds.microphoneToggle) {
        try {
            globalShortcut.register(keybinds.microphoneToggle, () => {
                console.log('Microphone toggle shortcut triggered');
                // Use the correct shortcut key format for microphone toggle
                const shortcutKey = 'shift+alt+8';
                
                // Use the handleShortcut function to trigger microphone toggle
                mainWindow.webContents.executeJavaScript(`
                    cheddar.handleShortcut('${shortcutKey}');
                `);
            });
            console.log(`Registered microphoneToggle: ${keybinds.microphoneToggle}`);
        } catch (error) {
            console.error(`Failed to register microphoneToggle (${keybinds.microphoneToggle}):`, error);
        }
    }

    // Register reinitialize session shortcut
    if (keybinds.reinitializeSession) {
        try {
            globalShortcut.register(keybinds.reinitializeSession, () => {
                console.log('Reinitialize session shortcut triggered');
                // Determine the shortcut key format
                const isMac = process.platform === 'darwin';
                const shortcutKey = isMac ? 'cmd+g' : 'ctrl+g';
                
                // Use the handleShortcut function to trigger session reinitialization
                mainWindow.webContents.executeJavaScript(`
                    cheddar.handleShortcut('${shortcutKey}');
                `);
            });
            console.log(`Registered reinitializeSession: ${keybinds.reinitializeSession}`);
        } catch (error) {
            console.error(`Failed to register reinitializeSession (${keybinds.reinitializeSession}):`, error);
        }
    }

    // Register next step shortcut (either starts session or takes screenshot based on view)
    if (keybinds.nextStep) {
        try {
            globalShortcut.register(keybinds.nextStep, async () => {
                console.log('Next step shortcut triggered');
                try {
                    // Determine the shortcut key format
                    const isMac = process.platform === 'darwin';
                    const shortcutKey = isMac ? 'shift+alt+4' : 'shift+Alt+4';

                    // Use the new handleShortcut function
                    mainWindow.webContents.executeJavaScript(`
                        cheddar.handleShortcut('${shortcutKey}');
                    `);
                } catch (error) {
                    console.error('Error handling next step shortcut:', error);
                }
            });
            console.log(`Registered nextStep: ${keybinds.nextStep}`);
        } catch (error) {
            console.error(`Failed to register nextStep (${keybinds.nextStep}):`, error);
        }
    }

    // Register previous response shortcut
    if (keybinds.previousResponse) {
        try {
            globalShortcut.register(keybinds.previousResponse, () => {
                console.log('Previous response shortcut triggered');
                sendToRenderer('navigate-previous-response');
            });
            console.log(`Registered previousResponse: ${keybinds.previousResponse}`);
        } catch (error) {
            console.error(`Failed to register previousResponse (${keybinds.previousResponse}):`, error);
        }
    }

    // Register next response shortcut
    if (keybinds.nextResponse) {
        try {
            globalShortcut.register(keybinds.nextResponse, () => {
                console.log('Next response shortcut triggered');
                sendToRenderer('navigate-next-response');
            });
            console.log(`Registered nextResponse: ${keybinds.nextResponse}`);
        } catch (error) {
            console.error(`Failed to register nextResponse (${keybinds.nextResponse}):`, error);
        }
    }

    // Register scroll up shortcut
    if (keybinds.scrollUp) {
        try {
            globalShortcut.register(keybinds.scrollUp, () => {
                console.log('Scroll up shortcut triggered');
                sendToRenderer('scroll-response-up');
            });
            console.log(`Registered scrollUp: ${keybinds.scrollUp}`);
        } catch (error) {
            console.error(`Failed to register scrollUp (${keybinds.scrollUp}):`, error);
        }
    }

    // Register scroll down shortcut
    if (keybinds.scrollDown) {
        try {
            globalShortcut.register(keybinds.scrollDown, () => {
                console.log('Scroll down shortcut triggered');
                sendToRenderer('scroll-response-down');
            });
            console.log(`Registered scrollDown: ${keybinds.scrollDown}`);
        } catch (error) {
            console.error(`Failed to register scrollDown (${keybinds.scrollDown}):`, error);
        }
    }

    // Register layout mode toggle shortcut
    if (keybinds.toggleLayoutMode) {
        try {
            globalShortcut.register(keybinds.toggleLayoutMode, async () => {
                console.log('Layout mode toggle shortcut triggered');
                try {
                    // Get current layout mode and toggle it
                    const currentLayoutMode = await mainWindow.webContents.executeJavaScript(
                        'cheddar.getLayoutMode()'
                    );
                    const newLayoutMode = currentLayoutMode === 'compact' ? 'normal' : 'compact';
                    
                    // Set the new layout mode
                    await mainWindow.webContents.executeJavaScript(
                        `cheddar.setLayoutMode('${newLayoutMode}')`
                    );
                    
                    console.log(`Layout mode toggled from ${currentLayoutMode} to ${newLayoutMode}`);
                } catch (error) {
                    console.error('Error toggling layout mode:', error);
                }
            });
            console.log(`Registered toggleLayoutMode: ${keybinds.toggleLayoutMode}`);
        } catch (error) {
            console.error(`Failed to register toggleLayoutMode (${keybinds.toggleLayoutMode}):`, error);
        }
    }

    // Register auto-scroll toggle shortcut
    if (keybinds.toggleAutoScroll) {
        try {
            globalShortcut.register(keybinds.toggleAutoScroll, () => {
                console.log('Auto-scroll toggle shortcut triggered');
                sendToRenderer('toggle-auto-scroll');
            });
            console.log(`Registered toggleAutoScroll: ${keybinds.toggleAutoScroll}`);
        } catch (error) {
            console.error(`Failed to register toggleAutoScroll (${keybinds.toggleAutoScroll}):`, error);
        }
    }
}

function setupWindowIpcHandlers(mainWindow, sendToRenderer, geminiSessionRef) {
    ipcMain.on('view-changed', (event, view) => {
        if (view !== 'jarvis' && !mainWindow.isDestroyed()) {
            // Only enable mouse events if they're not currently ignored
            if (!mouseEventsIgnored) {
                mainWindow.setIgnoreMouseEvents(false);
            }
        }
    });

    // IPC handler for toggling interview mode
    ipcMain.handle('toggle-interview-mode', (event, enabled) => {
        if (mainWindow) {
            interviewMode = enabled;
            mainWindow.setFocusable(!enabled);
            
            // Sync with existing click-through functionality
            mouseEventsIgnored = enabled;
            if (enabled) {
                mainWindow.setIgnoreMouseEvents(true, { forward: true });
            } else {
                mainWindow.setIgnoreMouseEvents(false);
            }
            
            // Notify renderer about click-through state change
            mainWindow.webContents.send('click-through-toggled', mouseEventsIgnored);
        }
        return interviewMode;
    });

    // IPC handler for getting interview mode state
    ipcMain.handle('get-interview-mode', () => {
        return interviewMode;
    });

    ipcMain.handle('window-minimize', () => {
        if (!mainWindow.isDestroyed()) {
            mainWindow.minimize();
        }
    });

    ipcMain.on('update-keybinds', (event, newKeybinds) => {
        if (!mainWindow.isDestroyed()) {
            updateGlobalShortcuts(newKeybinds, mainWindow, sendToRenderer, geminiSessionRef);
        }
    });

    ipcMain.handle('toggle-window-visibility', async event => {
        try {
            if (mainWindow.isDestroyed()) {
                return { success: false, error: 'Window has been destroyed' };
            }

            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.showInactive();
            }
            return { success: true };
        } catch (error) {
            console.error('Error toggling window visibility:', error);
            return { success: false, error: error.message };
        }
    });

    function animateWindowResize(mainWindow, targetWidth, targetHeight, layoutMode) {
        return new Promise(resolve => {
            // Check if window is destroyed before starting animation
            if (mainWindow.isDestroyed()) {
                console.log('Cannot animate resize: window has been destroyed');
                resolve();
                return;
            }

            // Clear any existing animation
            if (resizeAnimation) {
                clearInterval(resizeAnimation);
                resizeAnimation = null;
            }

            const [startWidth, startHeight] = mainWindow.getSize();

            // If already at target size, no need to animate
            if (startWidth === targetWidth && startHeight === targetHeight) {
                console.log(`Window already at target size for ${layoutMode} mode`);
                resolve();
                return;
            }

            console.log(`Starting animated resize from ${startWidth}x${startHeight} to ${targetWidth}x${targetHeight}`);

            windowResizing = true;
            mainWindow.setResizable(true);

            const frameRate = 60; // 60 FPS
            const totalFrames = Math.floor(RESIZE_ANIMATION_DURATION / (1000 / frameRate));
            let currentFrame = 0;

            const widthDiff = targetWidth - startWidth;
            const heightDiff = targetHeight - startHeight;

            resizeAnimation = setInterval(() => {
                currentFrame++;
                const progress = currentFrame / totalFrames;

                // Use easing function (ease-out)
                const easedProgress = 1 - Math.pow(1 - progress, 3);

                const currentWidth = Math.round(startWidth + widthDiff * easedProgress);
                const currentHeight = Math.round(startHeight + heightDiff * easedProgress);

                if (!mainWindow || mainWindow.isDestroyed()) {
                    clearInterval(resizeAnimation);
                    resizeAnimation = null;
                    windowResizing = false;
                    return;
                }
                mainWindow.setSize(currentWidth, currentHeight);

                // Re-center the window during animation
                const primaryDisplay = screen.getPrimaryDisplay();
                const { width: screenWidth } = primaryDisplay.workAreaSize;
                const x = Math.floor((screenWidth - currentWidth) / 2);
                const y = 0;
                mainWindow.setPosition(x, y);

                if (currentFrame >= totalFrames) {
                    clearInterval(resizeAnimation);
                    resizeAnimation = null;
                    windowResizing = false;

                    // Check if window is still valid before final operations
                    if (!mainWindow.isDestroyed()) {
                        mainWindow.setResizable(false);

                        // Ensure final size is exact
                        mainWindow.setSize(targetWidth, targetHeight);
                        const finalX = Math.floor((screenWidth - targetWidth) / 2);
                        mainWindow.setPosition(finalX, 0);
                    }

                    console.log(`Animation complete: ${targetWidth}x${targetHeight}`);
                    resolve();
                }
            }, 1000 / frameRate);
        });
    }

    ipcMain.handle('update-sizes', async event => {
        try {
            if (mainWindow.isDestroyed()) {
                return { success: false, error: 'Window has been destroyed' };
            }

            // Get current view and layout mode from renderer
            let viewName, layoutMode;
            try {
                viewName = await event.sender.executeJavaScript(
                    'cheddar.getCurrentView()'
                );
                layoutMode = await event.sender.executeJavaScript(
                    'cheddar.getLayoutMode()'
                );
            } catch (error) {
                console.warn('Failed to get view/layout from renderer, using defaults:', error);
                viewName = 'main';
                layoutMode = 'normal';
            }

            console.log('Size update requested for view:', viewName, 'layout:', layoutMode);

            let targetWidth, targetHeight;

            // Determine base size from layout mode using stored values or defaults
            let baseWidth, baseHeight;
            if (layoutMode === 'compact') {
                baseWidth = parseInt(await event.sender.executeJavaScript('localStorage.getItem("compactWidth")')) || 350;
                baseHeight = parseInt(await event.sender.executeJavaScript('localStorage.getItem("compactHeight")')) || 300;
            } else {
                baseWidth = parseInt(await event.sender.executeJavaScript('localStorage.getItem("normalWidth")')) || 550;
                baseHeight = parseInt(await event.sender.executeJavaScript('localStorage.getItem("normalHeight")')) || 500;
            }

            // Adjust height based on view
            switch (viewName) {
                case 'customize':
                case 'settings':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 500 : 600;
                    break;
                case 'help':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 450 : 550;
                    break;
                case 'history':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 450 : 550;
                    break;
                case 'advanced':
                    targetWidth = baseWidth;
                    targetHeight = layoutMode === 'compact' ? 400 : 500;
                    break;
                case 'main':
                case 'jarvis':
                case 'onboarding':
                default:
                    targetWidth = baseWidth;
                    targetHeight = baseHeight;
                    break;
            }

            const [currentWidth, currentHeight] = mainWindow.getSize();
            console.log('Current window size:', currentWidth, 'x', currentHeight);

            // If currently resizing, the animation will start from current position
            if (windowResizing) {
                console.log('Interrupting current resize animation');
            }

            await animateWindowResize(mainWindow, targetWidth, targetHeight, `${viewName} view (${layoutMode})`);

            return { success: true };
        } catch (error) {
            console.error('Error updating sizes:', error);
            return { success: false, error: error.message };
        }
    });
}

module.exports = {
    ensureDataDirectories,
    createWindow,
    getDefaultKeybinds,
    updateGlobalShortcuts,
    setupWindowIpcHandlers,
};
