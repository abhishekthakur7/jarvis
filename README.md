# Jarvis - Your Personal AI Assistant

Jarvis is a desktop application built with Electron that acts as a personal AI assistant. It leverages Google's Gemini for its core AI capabilities and integrates with Notion for enhanced productivity.

## Features

### Core AI Capabilities
*   **AI-Powered Assistance:** Jarvis uses Google's Gemini to understand and respond to your queries with contextual awareness
*   **Screen Analysis:** Automatic screenshot capture and analysis for visual context
*   **Audio Processing:** Real-time microphone and speaker audio detection and transcription
*   **Multi-Modal Input:** Combines text, voice, and visual inputs for comprehensive assistance

### Interface & Layout
*   **Multiple Layout Modes:** Switch between Normal, Compact, and System Design layouts
*   **Focus Mode:** Distraction-free interface for enhanced productivity
*   **Interview Mode:** Specialized mode with content protection for job interviews
*   **Advanced Mode:** Access to additional features and settings
*   **Click-through Mode:** Make the window transparent to mouse clicks
*   **Customizable Transparency:** Adjust window opacity for different layouts

### Audio & Voice Features
*   **Microphone Toggle:** Enable/disable microphone input with visual feedback
*   **Speaker Detection:** Automatic detection and transcription of system audio
*   **Multi-Language Support:** Support for various speech languages
*   **Audio Quality Control:** Configurable audio processing settings

### Screen Capture & Analysis
*   **Automatic Screenshots:** Configurable intervals (1s, 2s, 5s, 10s) or manual mode
*   **Image Quality Settings:** High, Medium, or Low quality options
*   **Manual Capture:** On-demand screenshot capture with keyboard shortcuts
*   **Visual Context Analysis:** AI analysis of screen content for relevant assistance

### Profiles & Customization
*   **Specialized Profiles:** Job Interview, Sales Call, Business Meeting, Presentation, Negotiation
*   **Custom Prompts:** Personalize AI behavior with specific instructions
*   **Customizable Keybinds:** Set up your own keyboard shortcuts for all features
*   **Google Search Integration:** Optional web search capabilities
*   **Layout-Specific Settings:** Different configurations for each layout mode

### Productivity Features
*   **Response Navigation:** Browse through previous AI responses
*   **Auto-Scroll:** Automatic scrolling with configurable speed
*   **Session Management:** Reinitialize sessions and manage conversation history
*   **Notion Integration:** Connect with your Notion workspace to streamline workflows
*   **Content Protection:** Stealth mode for sensitive environments

### Views & Navigation
*   **Multiple Views:** Main, Customize, Help, History, Assistant, and Advanced views
*   **Onboarding:** Guided setup process for new users
*   **Help System:** Built-in documentation and keyboard shortcut reference
*   **Settings Management:** Comprehensive customization options

### Cross-Platform Support
*   **Windows, macOS, and Linux:** Full compatibility across operating systems
*   **Platform-Specific Optimizations:** Tailored audio capture and shortcuts for each OS

## Keyboard Shortcuts

Jarvis provides extensive keyboard shortcuts for efficient operation. All shortcuts are customizable through the Settings page.

### Window Management
| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| **Move Window Up** | `Ctrl+Up` | `Alt+Up` | Move the application window up |
| **Move Window Down** | `Ctrl+Down` | `Alt+Down` | Move the application window down |
| **Move Window Left** | `Ctrl+Left` | `Alt+Left` | Move the application window left |
| **Move Window Right** | `Ctrl+Right` | `Alt+Right` | Move the application window right |
| **Toggle Window Visibility** | `Ctrl+\` | `Cmd+\` | Show/hide the application window |
| **Toggle Click-through Mode** | `Ctrl+M` | `Cmd+M` | Enable/disable click-through functionality |
| **Close Window/Session** | `Shift+Alt+;` | `Shift+Alt+;` | Close the current session or application window |

### Audio Controls
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Toggle Microphone** | `Shift+Alt+8` | Enable/disable microphone input |
| **Toggle Speaker Detection** | `Shift+Alt+0` | Enable/disable speaker audio detection |

### AI Interaction
| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| **Ask Next Step** | `Shift+Alt+4` | `Shift+Alt+4` | Take screenshot and ask AI for next step suggestion |
| **Ask Next Step (Pro)** | `Shift+Alt+,` | `Shift+Alt+,` | Take screenshot and ask AI for next step with Gemini Pro |
| **Reinitialize Session** | `Ctrl+G` | `Cmd+G` | Restart the AI session |
| **Previous Response** | `Ctrl+Alt+[` | `Cmd+Alt+[` | Navigate to the previous AI response |
| **Next Response** | `Ctrl+Alt+]` | `Cmd+Alt+]` | Navigate to the next AI response |

### Layout & Display
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Toggle Layout Mode** | `Shift+Alt+/` | Switch between compact and normal layout modes |
| **Toggle Focus Mode** | `Shift+Alt+F` | Enable/disable focus mode |
| **Cycle Layout Mode** | `Shift+Alt+L` | Cycle through layout modes |
| **Scroll Response Up** | `Shift+Alt+1` | Scroll the AI response content up |
| **Scroll Response Down** | `Shift+Alt+2` | Scroll the AI response content down |
| **Toggle Auto-Scroll** | `Shift+Alt+3` | Enable/disable automatic scrolling |

### Text Input
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Send Message** | `Enter` | Send text message to AI |
| **New Line** | `Shift+Enter` | Add new line in text input |
| **Start Session** | `Ctrl+Enter` (Windows) / `Cmd+Enter` (macOS) | Start AI session from main view |

### Quick Access
*All shortcuts are fully customizable through the Customize view*
*Use the Help view to see current shortcut assignments*

## Supported Profiles

Jarvis comes with specialized AI profiles optimized for different scenarios:

*   **Job Interview** - Get help with answering interview questions and responses
*   **Sales Call** - Assistance with sales conversations and objection handling
*   **Business Meeting** - Support for professional meetings and discussions
*   **Presentation** - Help with presentations and public speaking
*   **Negotiation** - Guidance for business negotiations and deals

Each profile includes tailored prompts and behavior patterns optimized for the specific use case.

## How to Use

### Basic Setup
1. **Start a Session:** Enter your Gemini API key and click "Start Session"
2. **Choose Profile:** Select your desired profile in the Customize view
3. **Configure Settings:** Set your preferred language, layout mode, and capture settings

### Window Positioning
*   Use keyboard shortcuts to move the window to your desired location
*   Enable click-through mode to make the window transparent to mouse clicks
*   Toggle window visibility to show/hide Jarvis when needed

### AI Interaction
*   **Text Messages:** Type questions or requests using the text input
*   **Voice Input:** Enable microphone to provide voice context
*   **Screen Analysis:** AI automatically analyzes your screen for visual context
*   **Manual Screenshots:** Use the "Ask Next Step" shortcut for on-demand analysis

### Navigation
*   Browse through AI responses using Previous/Next shortcuts
*   Use auto-scroll for hands-free reading
*   Access different views (Main, Customize, Help, History, Advanced) via the header

## Tech Stack

*   **Framework:** [Electron](https://www.electronjs.org/) - Cross-platform desktop application framework
*   **AI:** [Google Gemini](https://ai.google.dev/) - Advanced AI model for natural language processing
*   **Productivity:** [Notion API](https://developers.notion.com/) - Integration with Notion workspace
*   **Frontend:** [Lit](https://lit.dev/) - Lightweight web components library
*   **Audio Processing:** Native Web Audio API with platform-specific optimizations
*   **Build System:** [Electron Forge](https://www.electronforge.io/) - Complete toolchain for building and distributing Electron apps

## Project Structure

```
jarvis/
├── src/
│   ├── assets/                 # Static assets (icons, images, libraries)
│   │   ├── onboarding/         # Onboarding flow SVG illustrations
│   │   └── SystemAudioDump     # Windows audio capture utility
│   ├── components/             # Lit-based UI components
│   │   ├── app/               # Main application components
│   │   │   ├── AppHeader.js   # Navigation header
│   │   │   └── AssistantApp.js # Root application component
│   │   └── views/             # Different application views
│   │       ├── MainView.js    # Primary interface for AI interaction
│   │       ├── CustomizeView.js # Settings and profile configuration
│   │       ├── AdvancedView.js # Advanced settings and Notion integration
│   │       ├── HelpView.js    # Documentation and keyboard shortcuts
│   │       ├── HistoryView.js # Conversation history browser
│   │       ├── AssistantView.js # AI response display
│   │       └── OnboardingView.js # First-time user setup
│   ├── utils/                 # Core utility modules
│   │   ├── gemini.js         # Gemini AI integration and session management
│   │   ├── notion.js         # Notion API integration
│   │   ├── renderer.js       # Main renderer process utilities
│   │   ├── window.js         # Window management and IPC handlers
│   │   ├── prompts.js        # AI prompt templates and profiles
│   │   └── stealthFeatures.js # Privacy and stealth mode functionality
│   ├── audioUtils.js         # Audio processing utilities
│   ├── microphoneUtils.js    # Microphone capture and processing
│   ├── index.js             # Main Electron process entry point
│   ├── preload.js           # Electron preload script for secure IPC
│   └── index.html           # Application HTML template
├── forge.config.js          # Electron Forge build configuration
├── package.json            # Dependencies and scripts
└── README.md              # This file
```

### Key Architecture Components

#### Main Process (`src/index.js`)
- Manages the Electron application lifecycle
- Sets up IPC handlers for communication with renderer
- Handles system-level operations (window management, audio capture)

#### Renderer Process (`src/components/`)
- Built with Lit web components for reactive UI
- Modular view system for different application modes
- Real-time communication with main process via IPC

#### AI Integration (`src/utils/gemini.js`)
- Manages Gemini API sessions and conversations
- Handles audio transcription and processing
- Implements debounce logic and duplicate prevention
- Manages conversation history and context

#### Audio Processing
- **Windows**: Uses SystemAudioDump for speaker capture
- **macOS/Linux**: Native Web Audio API integration
- Real-time transcription with voice activity detection
- Multi-language support for speech recognition

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (version 16 or higher) and npm installed
*   A Google Gemini API key (required for AI functionality)
*   Optional: Notion API key for productivity integrations

### System Requirements

#### Minimum Requirements
- **RAM**: 4GB (8GB recommended for optimal performance)
- **Storage**: 500MB free space
- **Internet**: Stable internet connection for AI functionality

#### Platform-Specific Requirements

**Windows:**
- Windows 10 version 2004 (Build 19041) or later
- Windows 11 (recommended for best audio capture support)
- Audio drivers supporting WASAPI for speaker detection

**macOS:**
- macOS 10.15 (Catalina) or later
- macOS 12 (Monterey) or later recommended
- Microphone and Screen Recording permissions

**Linux:**
- Ubuntu 18.04 LTS or equivalent
- PulseAudio or ALSA for audio support
- X11 or Wayland display server
- GTK 3.0 or later

#### Recommended Hardware
- **CPU**: Multi-core processor (Intel i5/AMD Ryzen 5 or better)
- **RAM**: 8GB or more for smooth multitasking
- **Audio**: Dedicated sound card or high-quality integrated audio
- **Display**: 1920x1080 or higher resolution

### API Key Setup

#### Google Gemini API Key (Required)
1. Visit the [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key or use an existing one
3. Copy the API key - you'll need it when starting Jarvis
4. The API key is stored locally and only sent to Google's Gemini API

#### Notion API Key (Optional)
1. Go to your [Notion Integrations page](https://www.notion.so/my-integrations)
2. Create a new integration and copy the API key
3. Share your Notion pages/databases with the integration
4. Configure the API key in Jarvis Advanced settings

### Installation and Running

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/jarvis.git
    cd jarvis
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Start the application:
    ```bash
    npm start
    ```

4.  On first launch:
    - Enter your Gemini API key in the main interface
    - Complete the onboarding process
    - Configure your preferred settings in the Customize view

## Building the Application

To create a distributable package for your operating system, use the following command:

```bash
npm run make
```

This will generate the necessary files in the `out` directory.

### Available Build Targets

- **Windows**: Squirrel installer (`.exe`)
- **macOS**: DMG package (`.dmg`)
- **Linux**: DEB package (`.deb`) and RPM package (`.rpm`)

## Troubleshooting

### Common Issues

#### API Key Issues
- **"Invalid API key" error**: Verify your Gemini API key is correct and has proper permissions
- **API key not saving**: Check that localStorage is enabled in your browser/Electron
- **Notion integration not working**: Ensure your Notion integration has access to the pages you're trying to use

#### Audio Issues
- **Microphone not working**: Check system permissions for microphone access
- **Speaker detection not working**: Ensure system audio capture is enabled (Windows requires additional setup)
- **Audio processing lag**: Try adjusting audio quality settings in the Advanced view

#### Performance Issues
- **High CPU usage**: Disable automatic screenshots or increase the capture interval
- **Memory issues**: Clear conversation history periodically or restart the session
- **Window positioning issues**: Use keyboard shortcuts to reposition the window

#### Platform-Specific Issues

**Windows:**
- Speaker audio capture requires Windows 10 version 2004 or later
- Some antivirus software may flag the application - add it to exclusions if needed

**macOS:**
- Grant microphone and screen recording permissions in System Preferences
- Code signing may require additional setup for distribution

**Linux:**
- Ensure PulseAudio or ALSA is properly configured for audio capture
- Some distributions may require additional audio packages

### Recent Fixes

#### Audio Processing Improvements (Latest)
- **Fixed double audio processing**: Resolved race condition where speaker audio was processed twice
- **Enhanced debounce logic**: Improved audio input handling to prevent duplicate transcriptions
- **Better duplicate detection**: Added conversation history checks to prevent reprocessing
- **Improved state management**: Enhanced cleanup when toggling speaker detection

#### Font Loading Fix
- **Resolved font family loading issues**: Fixed CSS font-family declarations for better cross-platform compatibility

### Debug Mode

For development and troubleshooting, you can enable debug mode by setting environment variables:

```bash
# Enable audio debugging
DEBUG_AUDIO=true npm start

# Enable general debugging
NODE_ENV=development npm start
```

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

### Development Setup

1. Follow the installation steps above
2. Make your changes
3. Test thoroughly across different platforms if possible
4. Submit a pull request with a clear description of changes

## Security & Privacy

### Data Handling
- **API Keys**: Stored locally using localStorage, never transmitted except to their respective services
- **Audio Data**: Processed locally and sent only to Google's Speech-to-Text API when transcription is enabled
- **Screenshots**: Captured locally and sent to Gemini API only when screen analysis is active
- **Conversation History**: Stored locally in IndexedDB, can be cleared at any time
- **Notion Data**: Only accessed when explicitly configured and authorized by the user

### Privacy Features
- **Stealth Mode**: Disguises the application window title and process name for privacy
- **Interview Mode**: Special privacy protections for sensitive environments
- **Content Protection**: Prevents certain data from being logged or saved
- **Local Storage**: All personal data remains on your device

### Permissions Required
- **Microphone Access**: For voice input and transcription
- **Screen Recording**: For screenshot analysis (macOS)
- **System Audio**: For speaker detection and transcription (platform-dependent)

### Security Best Practices
- Keep your API keys secure and don't share them
- Regularly clear conversation history if handling sensitive information
- Use stealth mode in environments where privacy is critical
- Review and configure audio/screen capture settings based on your needs

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.