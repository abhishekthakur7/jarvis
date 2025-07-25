# Jarvis - Your Personal AI Assistant

Jarvis is a desktop application built with Electron that acts as a personal AI assistant. It leverages Google's Gemini for its core AI capabilities and integrates with Notion for enhanced productivity.

## Features

*   **AI-Powered Assistance:** Jarvis uses Google's Gemini to understand and respond to your queries.
*   **Screen Recording:** Capture your screen activity for various purposes.
*   **Customizable Keybinds:** Set up your own keyboard shortcuts for quick access to Jarvis's features.
*   **Multiple Views:** Switch between different views like Main, Customize, Help, History, and Assistant for a tailored experience.
*   **Onboarding:** A simple onboarding process to get you started.
*   **Notion Integration:** Connect with your Notion workspace to streamline your workflows.
*   **Cross-Platform:** Built with Electron, Jarvis is compatible with Windows, macOS, and Linux.

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