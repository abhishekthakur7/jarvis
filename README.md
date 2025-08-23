# Jarvis - AI-Powered Desktop Assistant

**Version:** 0.1.0  
**Platform:** Cross-platform Desktop Application (Windows, macOS, Linux)  
**License:** GPL-3.0

Jarvis is a sophisticated desktop AI assistant built with Electron, designed to provide contextual assistance using Google's Gemini AI. Originally conceived as an interview assistant, it has evolved into a comprehensive productivity tool that combines multi-modal input processing, real-time AI assistance, and specialized workflow optimization for professionals, job seekers, and anyone needing intelligent desktop assistance.

## 🎯 Primary Use Cases

- **Job Interview Assistance** - Real-time coaching and guidance during interviews
- **Business Meeting Support** - Contextual suggestions and note-taking assistance  
- **Sales Call Enhancement** - AI-powered conversation insights and recommendations
- **Presentation Assistance** - Live content analysis and speaking guidance
- **General Productivity** - Multi-modal AI assistant for daily tasks

## Features

### 🤖 Core AI Capabilities
*   **Advanced AI Integration:** Powered by Google Gemini 2.5-Flash-Preview with support for Gemini Pro models
*   **Multi-Modal Processing:** Seamlessly combines text, voice, and visual inputs for comprehensive contextual understanding
*   **Real-Time Screen Analysis:** Automatic screenshot capture with configurable intervals and AI-powered visual context analysis
*   **Intelligent Audio Processing:** Advanced microphone and system audio detection with multi-language transcription
*   **Context-Aware Responses:** Maintains conversation history with smart context management and duplicate prevention
*   **Streaming Response Handling:** Real-time AI response processing with corruption detection and buffer management

### 🎨 Interface & Layout
*   **Adaptive Layout Modes:** Three distinct modes - Normal (feature-rich), Compact (minimal), and System Design (integrated)
*   **Intelligent Focus Mode:** Distraction-free interface with content protection and stealth capabilities
*   **Specialized Interview Mode:** Privacy-enhanced mode with content protection and discrete operation
*   **Advanced Configuration:** Comprehensive settings panel with Notion integration and API management
*   **Click-through Functionality:** Transform window into transparent overlay for unobtrusive assistance
*   **Dynamic Transparency Control:** Per-layout opacity settings with window-level and element-level transparency
*   **Responsive Design:** Adapts to different screen sizes and resolutions with platform-specific optimizations

### 🎵 Audio & Voice Features
*   **Enhanced Microphone Management:** Advanced audio capture with voice activity detection and noise reduction
*   **System Audio Monitoring:** Real-time speaker detection and transcription (Windows: WASAPI, macOS/Linux: Web Audio API)
*   **Multi-Language Speech Recognition:** Support for multiple languages with automatic language detection
*   **Audio Quality Optimization:** Configurable sample rates, bit depths, and processing quality settings
*   **Platform-Specific Audio:** Optimized audio processing for each operating system with fallback mechanisms
*   **Audio Worklet Processing:** Low-latency audio processing using Web Audio API worklets
*   **Debounce and Duplicate Prevention:** Intelligent audio processing to prevent duplicate transcriptions

### 📸 Screen Capture & Analysis
*   **Intelligent Screenshot Automation:** Configurable capture intervals (1s, 2s, 5s, 10s) with smart timing algorithms
*   **Adaptive Image Quality:** Dynamic quality settings (High, Medium, Low) optimized for performance and accuracy
*   **Hotkey-Triggered Capture:** Instant screenshot analysis with "Ask Next Step" and "Ask Next Step Pro" shortcuts
*   **Context-Aware Visual Analysis:** AI-powered screen content analysis with situation-specific insights
*   **Privacy-Conscious Capture:** Content protection features for sensitive environments
*   **Cross-Platform Screen Access:** Native screen capture APIs with permission management

### ⚙️ Profiles & Customization
*   **Professional Profiles:** Pre-configured modes for Job Interviews, Sales Calls, Business Meetings, Presentations, and Negotiations
*   **Advanced Prompt Engineering:** Custom AI behavior configuration with specialized instruction templates
*   **Comprehensive Keybind System:** Fully customizable keyboard shortcuts with platform-specific defaults and conflict detection
*   **Integrated Search Capabilities:** Optional Google Search integration with result processing
*   **Layout-Specific Configuration:** Independent settings for each layout mode with centralized management
*   **UI Component Customization:** Font sizes, animation controls, and visual preferences with real-time preview
*   **Teleprompter Features:** Reading assistance with rhythm markers, breathing cues, and auto-scroll functionality

### 🚀 Productivity Features
*   **Intelligent Response Navigation:** Browse conversation history with keyboard shortcuts and visual indicators
*   **Advanced Auto-Scroll:** Content-aware scrolling with adaptive speed, pause detection, and reading time estimation
*   **Robust Session Management:** Session reinitialization, conversation history persistence, and context cleanup
*   **Deep Notion Integration:** Workspace synchronization, database queries, and content rendering with the Notion API
*   **Privacy & Stealth Mode:** Process name randomization, window title disguising, and content protection for sensitive environments
*   **Reading Enhancement:** Word-by-word reveal animations, completion indicators, and focus highlighting
*   **Performance Optimization:** Incremental content updates, animation state management, and memory-efficient processing

### 🧭 Views & Navigation
*   **Modular View System:** Six specialized views - Main (API setup), Assistant (AI interaction), Customize (preferences), History (conversations), Advanced (integrations), and Onboarding (first-time setup)
*   **Guided Onboarding Experience:** Step-by-step setup with visual guides and interactive tutorials
*   **Centralized Settings Management:** Unified configuration system with layout-specific settings and real-time synchronization
*   **Component-Based Architecture:** Lit web components with reactive rendering and efficient state management
*   **Seamless View Transitions:** Smooth navigation between views with maintained state and context

### 🌐 Cross-Platform Support
*   **Universal Compatibility:** Full support for Windows 10/11, macOS 10.15+, and Linux (Ubuntu 18.04+)
*   **Platform-Specific Optimizations:** Native audio capture (WASAPI on Windows, Core Audio on macOS, ALSA/PulseAudio on Linux)
*   **Adaptive UI Elements:** Platform-appropriate keyboard shortcuts, window management, and visual styling
*   **Security Model:** Platform-specific permission handling for microphone, screen recording, and system audio access
*   **Build Targets:** Electron Forge configuration for Windows (Squirrel), macOS (DMG), and Linux (DEB/RPM) distributions

## ⌨️ Keyboard Shortcuts

Jarvis features an extensive keyboard shortcut system designed for efficient operation. All shortcuts are fully customizable through the Customize view, with platform-specific defaults automatically applied.

### 💼 Window Management
| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| **Move Window Up** | `Ctrl+Up` | `Alt+Up` | Move the application window up |
| **Move Window Down** | `Ctrl+Down` | `Alt+Down` | Move the application window down |
| **Move Window Left** | `Ctrl+Left` | `Alt+Left` | Move the application window left |
| **Move Window Right** | `Ctrl+Right` | `Alt+Right` | Move the application window right |
| **Toggle Window Visibility** | `Ctrl+\` | `Cmd+\` | Show/hide the application window |
| **Toggle Click-through Mode** | `Ctrl+M` | `Cmd+M` | Enable/disable click-through functionality |
| **Close Window/Session** | `Shift+Alt+;` | `Shift+Alt+;` | Close the current session or application window |

### 🎵 Audio Controls
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Toggle Microphone** | `Shift+Alt+8` | Enable/disable microphone input with visual feedback |
| **Toggle Speaker Detection** | `Shift+Alt+0` | Enable/disable system audio detection and transcription |

### 🤖 AI Interaction
| Action | Windows/Linux | macOS | Description |
|--------|---------------|-------|-------------|
| **Ask Next Step** | `Shift+Alt+4` | `Shift+Alt+4` | Take screenshot and request AI guidance for next action |
| **Ask Next Step (Pro)** | `Shift+Alt+,` | `Shift+Alt+,` | Enhanced screenshot analysis using Gemini Pro model |
| **Reinitialize Session** | `Ctrl+G` | `Cmd+G` | Restart the AI session with fresh context |
| **Previous Response** | `Ctrl+Alt+[` | `Cmd+Alt+[` | Navigate to the previous AI response in history |
| **Next Response** | `Ctrl+Alt+]` | `Cmd+Alt+]` | Navigate to the next AI response in history |

### 🎨 Layout & Display
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Toggle Layout Mode** | `Shift+Alt+/` | Cycle between Normal, Compact, and System Design layouts |
| **Toggle Focus Mode** | `Shift+Alt+F` | Enable/disable distraction-free focus mode |
| **Scroll Response Up** | `Shift+Alt+1` | Manually scroll the AI response content up |
| **Scroll Response Down** | `Shift+Alt+2` | Manually scroll the AI response content down |
| **Toggle Auto-Scroll** | `Shift+Alt+3` | Enable/disable automatic content scrolling |

### 📚 Teleprompter & Reading
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Pause/Resume Reading** | `Shift+Alt+P` | Toggle teleprompter reading flow |
| **Restart Current Section** | `Shift+Alt+R` | Restart reading from current section beginning |
| **Skip to Next Key Block** | `Shift+Alt+S` | Jump to next important content block |
| **Jump to Response End** | `Shift+Alt+E` | Navigate to end of current response |
| **Adjust Reading Tempo** | `Shift+Alt+T` | Modify auto-scroll reading speed |

### 🗺️ Content Navigation
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Cycle Code Blocks** | `Shift+Alt+C` | Navigate between code blocks in responses |
| **Jump Between Diagrams** | `Shift+Alt+D` | Move focus between diagrams and visual content |
| **Highlight Key Concepts** | `Shift+Alt+H` | Emphasize next key concept in content |
| **Show Quick Summary** | `Shift+Alt+Q` | Display summary of current response |
| **Adjust Line Spacing** | `Shift+Alt+L` | Modify text line spacing for readability |
| **Toggle Key Information** | `Shift+Alt+K` | Emphasize important information elements |

### ✍️ Text Input
| Action | Shortcut | Description |
|--------|----------|-------------|
| **Send Message** | `Enter` | Send text message to AI assistant |
| **New Line** | `Shift+Enter` | Add new line in text input field |
| **Start Session** | `Ctrl+Enter` (Windows) / `Cmd+Enter` (macOS) | Initiate AI session from main view |

> 💡 **Tip:** All shortcuts are managed through a centralized configuration system in `shortcutConfig.js` and can be customized in the Customize view to match your workflow preferences.

## 🎯 Supported Profiles & Use Cases

Jarvis comes with professionally crafted AI profiles, each optimized for specific scenarios with tailored prompts, behavior patterns, and contextual understanding:

### 💼 Professional Profiles
*   **Job Interview Assistant** - Real-time coaching, answer suggestions, and confidence building during interviews
*   **Sales Call Enhancement** - Conversation insights, objection handling, and persuasion techniques
*   **Business Meeting Support** - Meeting facilitation, note-taking assistance, and action item tracking
*   **Presentation Coach** - Speaking guidance, content suggestions, and audience engagement tips
*   **Negotiation Advisor** - Strategic guidance, leverage identification, and outcome optimization

### 🎯 Custom Profile Creation
*   **Personalized Prompts** - Create custom AI behavior instructions tailored to your specific needs
*   **Context-Aware Responses** - Profiles adapt based on screen content, audio input, and conversation history
*   **Workflow Integration** - Seamlessly integrate with existing tools and processes
*   **Learning Adaptation** - AI learns from your preferences and communication style over time

Each profile includes specialized prompt engineering, contextual awareness settings, and optimized response patterns designed for maximum effectiveness in real-world professional scenarios.

## 🚀 Key Features Overview

### 🤖 AI-Powered Intelligence
- **Dual Model Support**: Gemini 2.5-Flash-Preview for speed, Gemini Pro for complex reasoning
- **Multi-Modal Processing**: Seamlessly processes text, voice, and visual inputs simultaneously
- **Context Preservation**: Maintains up to 25 conversation turns with intelligent summarization
- **Real-Time Streaming**: Live AI responses with buffer management and corruption detection
- **Duplicate Prevention**: Smart filtering to avoid redundant processing and responses

### 🎨 Adaptive User Interface
- **Dynamic Layouts**: Three distinct modes optimized for different usage scenarios
- **Transparency Control**: Window-level and element-level opacity with per-layout settings
- **Click-Through Mode**: Transform window into transparent overlay for unobtrusive assistance
- **Responsive Design**: Automatically adapts to screen sizes and resolutions
- **Accessibility Features**: High contrast ratios, semantic HTML, and keyboard navigation

### 🎵 Advanced Audio Engine
- **Multi-Platform Capture**: Native audio APIs optimized for each operating system
- **Voice Activity Detection**: Intelligent start/stop detection for natural conversation flow
- **Real-Time Transcription**: Multi-language speech-to-text with automatic language detection
- **System Audio Monitoring**: Capture and analyze speaker output for comprehensive context
- **Audio Worklet Processing**: Low-latency processing with custom audio nodes

### 📸 Intelligent Visual Analysis
- **Automated Screenshot Capture**: Configurable intervals with smart timing algorithms
- **Manual Screenshot Hotkeys**: Instant analysis with "Ask Next Step" shortcuts
- **Context-Aware Analysis**: AI understands screen content and provides relevant guidance
- **Privacy Protection**: Content filtering and stealth mode for sensitive environments
- **Quality Optimization**: Adaptive image quality based on content type and bandwidth

### 🔒 Security & Privacy
- **Military-Grade Encryption**: AES-256-CBC encryption for all sensitive data
- **Local Data Storage**: All personal information remains on your device
- **Stealth Mode**: Process name randomization and window title disguising
- **Content Protection**: Prevents data logging in sensitive environments
- **Secure API Communication**: Encrypted channels with automatic key rotation

### 🚀 Productivity Enhancements
- **Teleprompter Features**: Reading assistance with rhythm markers and breathing cues
- **Auto-Scroll Intelligence**: Content-aware scrolling with reading time estimation
- **Response Navigation**: Browse conversation history with visual indicators
- **Notion Integration**: Deep workspace synchronization and database querying
- **Session Management**: Robust session handling with context cleanup and restoration

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
*   Access different views (Main, Customize, History, Advanced) via the header

## 🛠️ Tech Stack

### Core Framework & Runtime
*   **[Electron 30.0.5](https://www.electronjs.org/)** - Cross-platform desktop application framework with Node.js backend and Chromium frontend
*   **[Node.js](https://nodejs.org/)** - JavaScript runtime for main process operations and system-level functionality
*   **[Lit](https://lit.dev/)** - Lightweight web components library for reactive UI with efficient rendering and minimal overhead

### AI & External Services
*   **[Google Generative AI 0.11.4](https://ai.google.dev/)** - Google Gemini API integration for advanced language processing
    - Gemini 2.5-Flash-Preview (default)
    - Gemini Pro support for enhanced reasoning
    - Multi-modal input processing (text, audio, images)
*   **[Notion API 4.0.1](https://developers.notion.com/)** - Productivity workspace integration for database synchronization and content management

### Audio & Media Processing
*   **Native Web Audio API** - Low-latency audio processing with platform-specific optimizations
*   **Audio Worklet Processors** - Custom audio processing nodes for real-time microphone and system audio capture
*   **Platform-Specific Audio Backends:**
    - **Windows:** WASAPI (SystemAudioDump utility)
    - **macOS:** Core Audio
    - **Linux:** ALSA/PulseAudio

### Development & Build Tools
*   **[Electron Forge 7.8.1](https://www.electronforge.io/)** - Complete toolchain for building, packaging, and distributing Electron applications
*   **Cross-Platform Builders:**
    - Windows: Squirrel installer
    - macOS: DMG packages  
    - Linux: DEB and RPM packages

### Security & Data Management
*   **AES-256-CBC Encryption** - API key encryption with locally stored master keys
*   **IndexedDB** - Client-side conversation history and session data storage
*   **localStorage** - User preferences and configuration persistence
*   **Context Isolation** - Electron security model with preload script sandboxing

### Architecture Patterns
*   **Component-Based Architecture** - Modular Lit web components with clear separation of concerns
*   **Event-Driven Communication** - IPC channels for main/renderer process communication
*   **Singleton Pattern** - Centralized utilities for Gemini, Notion, and layout management
*   **Configuration-as-Code** - Centralized shortcut and settings management

## 📱 Project Structure

```
jarvis/
├── src/                           # Main source directory
│   ├── assets/                     # Static assets and resources
│   │   └── prism-tomorrow.min.css   # Syntax highlighting theme for code blocks
│   ├── components/                 # Lit-based UI components
│   │   ├── app/                   # Main application components
│   │   │   ├── AppHeader.js        # Navigation header with view switching
│   │   │   └── AssistantApp.js     # Root application component with layout management
│   │   └── views/                 # Specialized application views
│   │       ├── MainView.js        # API setup and session initialization
│   │       ├── AssistantView.js   # AI interaction interface with response rendering
│   │       ├── CustomizeView.js   # Settings, preferences, and layout configuration
│   │       ├── AdvancedView.js    # Notion integration and advanced features
│   │       ├── HistoryView.js     # Conversation history browser
│   │       └── OnboardingView.js  # First-time user setup and tutorials
│   ├── utils/                      # Core utility modules
│   │   ├── gemini.js               # Gemini AI integration and session management
│   │   ├── apiKeyManager.js        # Secure API key storage and encryption
│   │   ├── notion.js               # Notion API integration and workspace sync
│   │   ├── notionRenderer.js       # Notion content rendering utilities
│   │   ├── enhancedMicrophoneManager.js # Advanced microphone capture and processing
│   │   ├── audioWorkletProcessor.js # Web Audio API worklet for real-time processing
│   │   ├── renderer.js             # Main renderer process utilities and IPC handlers
│   │   ├── window.js               # Window management and system integration
│   │   ├── windowResize.js         # Window resizing and positioning utilities
│   │   ├── layoutSettingsManager.js # Centralized layout and UI settings management
│   │   ├── shortcutConfig.js       # Keyboard shortcut configuration and defaults
│   │   ├── prompts.js              # AI prompt templates and specialized profiles
│   │   ├── stealthFeatures.js      # Privacy and stealth mode functionality
│   │   ├── processNames.js         # Process name management for stealth mode
│   │   ├── processRandomizer.js    # Process name randomization utilities
│   │   ├── teleprompterFormatter.js # Reading assistance and content formatting
│   │   ├── teleprompterTester.js   # Testing utilities for teleprompter features
│   │   └── uiComponentTemplates.js # Reusable UI component templates
│   ├── audioUtils.js              # Core audio processing utilities
│   ├── microphoneUtils.js         # Microphone capture and voice activity detection
│   ├── index.js                   # Main Electron process entry point
│   ├── preload.js                 # Secure IPC communication bridge
│   └── index.html                 # Application HTML template
├── forge.config.js               # Electron Forge build and packaging configuration
├── package.json                  # Project dependencies, scripts, and metadata
├── package-lock.json             # Dependency lock file
├── SystemPrompt.json             # AI system prompt configuration
└── README.md                     # Project documentation (this file)
```

### 🏢 Key Architecture Components

#### Main Process (`src/index.js`)
- **Application Lifecycle Management** - Electron app initialization, window creation, and cleanup
- **IPC Communication Hub** - Handles all inter-process communication between main and renderer
- **System Integration** - Window management, audio capture, screenshot functionality
- **Security Layer** - Implements secure API key storage and context isolation

#### Renderer Process (`src/components/`)
- **Component-Based UI** - Modular Lit web components with reactive rendering
- **State Management** - Local state management with localStorage persistence
- **View Router** - Navigation system between different application views
- **Real-Time Updates** - Live AI response rendering and audio visualization

#### AI Integration (`src/utils/gemini.js`)
- **Session Management** - Gemini API connection handling and conversation persistence
- **Multi-Modal Processing** - Text, audio, and image input coordination
- **Response Streaming** - Real-time AI response handling with buffer management
- **Context Management** - Conversation history with intelligent summarization
- **Error Handling** - Robust fallback mechanisms and API key rotation

#### Audio Processing Pipeline
- **Enhanced Microphone Manager** - Voice activity detection and noise reduction
- **Audio Worklet Processor** - Low-latency real-time audio processing
- **Platform-Specific Capture** - Optimized system audio capture for each OS
- **Multi-Language Transcription** - Speech-to-text with language detection

#### Utility Layer (`src/utils/`)
- **Centralized Configuration** - Layout settings, shortcuts, and user preferences
- **Security & Privacy** - API key encryption, stealth mode, and content protection
- **Productivity Tools** - Notion integration, teleprompter features, and workflow optimization
- **UI Enhancement** - Animation systems, responsive design, and accessibility features

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

### Environment Variables

Jarvis reads several environment variables and local configuration values:

| Variable | Purpose | Required |
|----------|---------|----------|
| `GOOGLE_GEMINI_API_KEY` | Credentials for Google Gemini API calls | **Yes** |
| `NOTION_API_KEY` | Integration token for Notion features | No |
| `DEBUG_AUDIO` | Enable verbose audio-processing logs | No |
| `NODE_ENV` | Set to `development` for extended logging | No |

> Tip: You can create a `.env` file in the project root during development.

## Development Scripts

The project exposes handy npm scripts:

| Script | Description |
|--------|-------------|
| `npm start` | Run the app in development with hot-reload |
| `npm run lint` | ESLint codebase check |
| `npm run format` | Prettier auto-format source files |
| `npm run make` | Build distributable packages via Electron Forge |
| `npm run package` | Package without rebuilding installer |

## 📋 Changelog

### v0.1.0 (Current)
**Core Features Implemented:**
* ✅ Multi-modal AI assistance with Gemini 2.5-Flash-Preview
* ✅ Advanced audio processing with enhanced microphone management
* ✅ Cross-platform desktop application (Windows, macOS, Linux)
* ✅ Comprehensive keyboard shortcut system with customization
* ✅ Multiple layout modes (Normal, Compact, System Design)
* ✅ Notion workspace integration for productivity enhancement
* ✅ Privacy features including stealth mode and content protection
* ✅ Real-time screen capture and AI-powered analysis
* ✅ Teleprompter features with reading assistance
* ✅ Secure API key management with AES-256-CBC encryption

**Technical Achievements:**
* ✅ Component-based architecture with Lit web components
* ✅ Centralized settings management with `LayoutSettingsManager`
* ✅ Advanced audio worklet processing for low-latency capture
* ✅ IPC communication system for secure main/renderer interaction
* ✅ Cross-platform build system with Electron Forge
* ✅ Unified shortcut configuration in `shortcutConfig.js`

**Enhanced Features:**
* ✅ **Gemini Pro Support** - Advanced reasoning capabilities for complex queries
* ✅ **Ask Next Step (Pro)** - Enhanced screenshot analysis with Gemini Pro
* ✅ **Enhanced Animation System** - Word-by-word reveal with blur effects and completion indicators
* ✅ **Advanced Auto-Scroll** - Content-aware scrolling with reading time estimation
* ✅ **UI Component Templates** - Reusable components for consistent interface design
* ✅ **Teleprompter Testing** - Built-in testing utilities for reading assistance features

### Upcoming Features (Roadmap)
* 🔄 Voice command recognition and natural language interface
* 🔄 Advanced Notion database querying and content synchronization
* 🔄 Plugin system for custom AI profiles and integrations
* 🔄 Enhanced privacy features and enterprise compliance tools
* 🔄 Mobile companion app for remote control and monitoring

## 🔧 Development Scripts

The project provides comprehensive npm scripts for development and deployment:

| Script | Command | Description |
|--------|---------|-------------|
| **Development** | `npm start` | Launch the application in development mode with hot-reload |
| **Code Quality** | `npm run lint` | Run ESLint for code quality analysis (currently placeholder) |
| **Formatting** | `npm run format` | Auto-format source files with Prettier (when configured) |
| **Packaging** | `npm run package` | Package the application without creating installers |
| **Distribution** | `npm run make` | Build complete distributable packages for all platforms |
| **Publishing** | `npm run publish` | Publish the application to configured distribution channels |

### 🛠️ Debug Mode

For development and troubleshooting, enable debug mode with environment variables:

```bash
# Enable comprehensive audio debugging
DEBUG_AUDIO=true npm start

# Enable development mode with extended logging
NODE_ENV=development npm start

# Enable specific component debugging
DEBUG_GEMINI=true npm start
DEBUG_NOTION=true npm start
```

### 🔐 Centralized Configuration

All keyboard shortcuts are managed through a unified configuration system:

- **Location:** `src/utils/shortcutConfig.js`
- **Benefits:** Single source of truth for all keybinds across views
- **Customization:** Edit once, automatically propagated to all components
- **Platform Awareness:** Automatic platform-specific defaults (Cmd vs Ctrl)

```javascript
// Example: Adding a new shortcut
const newShortcut = {
    customAction: isMac ? 'Cmd+Shift+N' : 'Ctrl+Shift+N'
};
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