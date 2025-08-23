/**
 * Microphone Permission Helper
 * Provides utilities for checking and managing microphone permissions
 * with user-friendly guidance for resolving permission issues.
 */

export class MicrophonePermissionHelper {
    constructor() {
        this.permissionState = 'unknown';
        this.isCheckingPermissions = false;
    }

    /**
     * Check current microphone permission status
     * @returns {Promise<string>} Permission state: 'granted', 'denied', 'prompt', or 'unknown'
     */
    async checkPermissionStatus() {
        try {
            if (!navigator.permissions) {
                return 'unknown';
            }

            const permission = await navigator.permissions.query({ name: 'microphone' });
            this.permissionState = permission.state;
            
            // Listen for permission changes
            permission.onchange = () => {
                this.permissionState = permission.state;
            };

            return permission.state;
        } catch (error) {
            console.error('❌ Error checking microphone permissions:', error);
            return 'unknown';
        }
    }

    /**
     * Request microphone permission with detailed error handling
     * @returns {Promise<{success: boolean, stream?: MediaStream, error?: string}>}
     */
    async requestMicrophoneAccess() {
        try {
            this.isCheckingPermissions = true;

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            this.permissionState = 'granted';
            return { success: true, stream };

        } catch (error) {
            this.permissionState = 'denied';
            
            let errorMessage = 'Microphone access failed';
            let userAction = 'Please try again';

            // Provide specific error messages and solutions
            switch (error.name) {
                case 'NotAllowedError':
                    if (error.message.includes('aborted')) {
                        errorMessage = 'Microphone permission was denied by user';
                        userAction = 'Please click "Allow" when prompted for microphone access';
                    } else {
                        errorMessage = 'Microphone access is blocked';
                        userAction = 'Please enable microphone permissions in browser settings';
                    }
                    break;
                
                case 'NotFoundError':
                    errorMessage = 'No microphone device found';
                    userAction = 'Please connect a microphone and try again';
                    break;
                
                case 'NotReadableError':
                    errorMessage = 'Microphone is being used by another application';
                    userAction = 'Please close other apps using the microphone and try again';
                    break;
                
                case 'OverconstrainedError':
                    errorMessage = 'Microphone constraints not supported';
                    userAction = 'Your microphone may not support the required audio settings';
                    break;
                
                case 'SecurityError':
                    errorMessage = 'Microphone access blocked by security policy';
                    userAction = 'Please check browser security settings';
                    break;
                
                default:
                    errorMessage = `Microphone error: ${error.message}`;
                    userAction = 'Please check your microphone and browser settings';
            }

            return { 
                success: false, 
                error: `${errorMessage}. ${userAction}` 
            };
        } finally {
            this.isCheckingPermissions = false;
        }
    }

    /**
     * Show browser-specific instructions for enabling microphone permissions
     */
    showPermissionInstructions() {
        const userAgent = navigator.userAgent.toLowerCase();
        let browser = 'unknown';
        
        if (userAgent.includes('chrome')) browser = 'chrome';
        else if (userAgent.includes('firefox')) browser = 'firefox';
        else if (userAgent.includes('safari')) browser = 'safari';
        else if (userAgent.includes('edge')) browser = 'edge';

        console.log('\n📝 How to enable microphone permissions:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        switch (browser) {
            case 'chrome':
                console.log('🔹 Chrome Browser:');
                console.log('  1. Look for the 🎤 microphone icon in the address bar');
                console.log('  2. Click it and select "Always allow"');
                console.log('  3. Or go to Settings > Privacy and security > Site Settings > Microphone');
                console.log('  4. Find this site and change permission to "Allow"');
                break;
            
            case 'firefox':
                console.log('🔹 Firefox Browser:');
                console.log('  1. Click the shield icon in the address bar');
                console.log('  2. Turn off blocking for Microphone');
                console.log('  3. Or go to Settings > Privacy & Security > Permissions > Microphone');
                console.log('  4. Find this site and change to "Allow"');
                break;
            
            case 'safari':
                console.log('🔹 Safari Browser:');
                console.log('  1. Go to Safari > Preferences > Websites > Microphone');
                console.log('  2. Find this website and change to "Allow"');
                console.log('  3. Or check the address bar for permission icons');
                break;
            
            case 'edge':
                console.log('🔹 Edge Browser:');
                console.log('  1. Click the 🎤 microphone icon in the address bar');
                console.log('  2. Select "Always allow on this site"');
                console.log('  3. Or go to Settings > Site permissions > Microphone');
                console.log('  4. Find this site and set to "Allow"');
                break;
            
            default:
                console.log('🔹 General Instructions:');
                console.log('  1. Look for microphone/permission icons in your browser');
                console.log('  2. Check browser settings for site permissions');
                console.log('  3. Allow microphone access for this website');
        }

        console.log('\n🔄 After changing permissions:');
        console.log('  • Refresh this page');
        console.log('  • Try the microphone toggle again');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }

    /**
     * Get current permission state
     * @returns {string} Current permission state
     */
    getCurrentPermissionState() {
        return this.permissionState;
    }

    /**
     * Check if we're currently in the process of requesting permissions
     * @returns {boolean} True if requesting permissions
     */
    isRequestingPermissions() {
        return this.isCheckingPermissions;
    }

    /**
     * Reset permission state (useful for retrying)
     */
    resetPermissionState() {
        this.permissionState = 'unknown';
        this.isCheckingPermissions = false;
    }
}

// Export singleton instance
export const microphonePermissionHelper = new MicrophonePermissionHelper();