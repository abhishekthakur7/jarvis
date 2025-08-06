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

*   **Framework:** [Electron](https://www.electronjs.org/)
*   **AI:** [Google Gemini](https://ai.google.dev/)
*   **Productivity:** [Notion API](https://developers.notion.com/)
*   **Frontend:** [Lit](https://lit.dev/)

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) and npm installed.

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

## Building the Application

To create a distributable package for your operating system, use the following command:

```bash
npm run make
```

This will generate the necessary files in the `out` directory.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.