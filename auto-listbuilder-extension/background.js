class ListBuilderBackground {
    constructor() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Handle extension icon clicks
        chrome.action.onClicked.addListener((tab) => {
            this.handleIconClick(tab);
        });
        
        // Handle messages from content scripts and popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });
        
        // Handle tab updates for SPA navigation
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && this.isSupportedSite(tab.url)) {
                this.injectContentScript(tabId);
            }
        });
    }
    
    async handleIconClick(tab) {
        try {
            // Inject content script if not already present
            await this.injectContentScript(tab.id);
            
            // Capture screenshot and process
            await this.captureAndProcess(tab);
            
        } catch (error) {
            console.error('Icon click handling failed:', error);
        }
    }
    
    async handleMessage(request, sender, sendResponse) {
        try {
            switch (request.action) {
                case 'CAPTURE_SCREENSHOT':
                    await this.captureScreenshot(sender.tab, sendResponse);
                    break;
                    
                case 'GET_SETTINGS':
                    await this.getSettings(sendResponse);
                    break;
                    
                case 'SAVE_SETTINGS':
                    await this.saveSettings(request.data, sendResponse);
                    break;
                    
                default:
                    sendResponse({ success: false, error: 'Unknown action' });
            }
        } catch (error) {
            console.error('Message handling error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async injectContentScript(tabId) {
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
        } catch (error) {
            // Content script might already be injected
            console.log('Content script injection skipped:', error.message);
        }
    }
    
    async captureAndProcess(tab) {
        try {
            // Capture screenshot
            const screenshot = await chrome.tabs.captureVisibleTab(null, {
                format: 'png',
                quality: 90
            });
            
            // Send to content script for processing
            await chrome.tabs.sendMessage(tab.id, {
                action: 'PROCESS_SCREENSHOT',
                data: {
                    screenshot: screenshot,
                    url: tab.url,
                    title: tab.title,
                    timestamp: Date.now()
                }
            });
            
        } catch (error) {
            console.error('Capture and process failed:', error);
        }
    }
    
    async captureScreenshot(tab, sendResponse) {
        try {
            const screenshot = await chrome.tabs.captureVisibleTab(null, {
                format: 'png',
                quality: 90
            });
            
            sendResponse({
                success: true,
                screenshot: screenshot,
                tab: {
                    url: tab.url,
                    title: tab.title,
                    id: tab.id
                }
            });
            
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async getSettings(sendResponse) {
        try {
            const settings = await chrome.storage.sync.get([
                'apiEndpoint',
                'autoCapture',
                'notifications',
                'dailyGoal'
            ]);
            
            // Default settings
            const defaultSettings = {
                apiEndpoint: 'http://localhost:5000/api',
                autoCapture: false,
                notifications: true,
                dailyGoal: 10
            };
            
            sendResponse({
                success: true,
                settings: { ...defaultSettings, ...settings }
            });
            
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    
    async saveSettings(settings, sendResponse) {
        try {
            await chrome.storage.sync.set(settings);
            sendResponse({ success: true });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }
    
    isSupportedSite(url) {
        if (!url) return false;
        
        const supportedSites = [
            'linkedin.com',
            'twitter.com',
            'x.com',
            'facebook.com',
            'instagram.com'
        ];
        
        return supportedSites.some(site => url.includes(site));
    }
}

// Initialize background script
new ListBuilderBackground();