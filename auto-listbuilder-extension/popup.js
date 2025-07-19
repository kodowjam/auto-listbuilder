console.log('Auto-ListBuilder popup script starting...');

class ListBuilderPopup {
    constructor() {
        this.isProcessing = false;
        this.apiEndpoint = 'http://localhost:8000/api'; // Updated to port 8000
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadDailyStats();
        this.checkCurrentPage();
    }
    
    setupEventListeners() {
        const captureButton = document.getElementById('captureButton');
        const settingsButton = document.getElementById('settingsButton');
        
        if (captureButton) {
            captureButton.addEventListener('click', () => this.handleCapture());
            console.log('Capture button listener added');
        }
        
        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.openSettings());
            console.log('Settings button listener added');
        }
        
        console.log('Event listeners setup complete');
    }
    
    async checkCurrentPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const isSupported = this.isSupportedSite(tab.url);
            
            const captureButton = document.getElementById('captureButton');
            if (!isSupported) {
                captureButton.querySelector('.text').textContent = 'Not supported on this site';
                captureButton.disabled = true;
                console.log('Current site not supported:', tab.url);
            } else {
                console.log('Current site supported:', tab.url);
            }
            
        } catch (error) {
            console.error('Error checking current page:', error);
        }
    }
    
    isSupportedSite(url) {
        const supportedSites = [
            'linkedin.com',
            'twitter.com',
            'x.com',
            'facebook.com',
            'instagram.com'
        ];
        
        return supportedSites.some(site => url.includes(site));
    }
    
    async handleCapture() {
        console.log('🚀 Starting REAL Auto-ListBuilder capture process...');
        
        if (this.isProcessing) {
            console.log('Already processing, ignoring click');
            return;
        }
        
        try {
            this.isProcessing = true;
            this.showProgress('Capturing screenshot...', 10);
            
            // Get current tab
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Current tab:', tab.url);
            
            // Capture screenshot
            this.updateProgress('Taking screenshot...', 25);
            const screenshot = await chrome.tabs.captureVisibleTab(null, {
                format: 'png',
                quality: 90
            });
            
            console.log('Screenshot captured, sending to backend...');
            this.updateProgress('Analyzing with AI...', 50);
            
            // Send to REAL backend for analysis
            const response = await fetch(`${this.apiEndpoint}/analyze-screenshot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    screenshot: screenshot,
                    context: {
                        url: tab.url,
                        title: tab.title,
                        platform: this.detectPlatform(tab.url),
                        timestamp: new Date().toISOString()
                    }
                })
            });
            
            console.log('Backend response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }
            
            const result = await response.json();
            console.log('Backend result:', result);
            
            if (result.success) {
                this.updateProgress('Adding to Google Sheets...', 75);
                this.updateProgress('Complete!', 100);
                
                const name = result.analysis?.analysis?.person_name || 'Unknown';
                this.showSuccess(`Added ${name} to prospect list! 🎯`);
                this.updateDailyStats();
                
                console.log('✅ REAL Auto-ListBuilder process completed successfully');
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('❌ REAL Auto-ListBuilder process failed:', error);
            this.showError('Failed to analyze: ' + error.message);
        } finally {
            setTimeout(() => {
                this.isProcessing = false;
            }, 2000);
        }
    }
    
    detectPlatform(url) {
        if (url.includes('linkedin.com')) return 'linkedin';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('facebook.com')) return 'facebook';
        if (url.includes('instagram.com')) return 'instagram';
        return 'unknown';
    }
    
    showProgress(message, progress = 0) {
        const captureButton = document.getElementById('captureButton');
        const progressContainer = document.getElementById('progress');
        const statusText = document.getElementById('statusText');
        const resultContainer = document.getElementById('result');
        
        captureButton.disabled = true;
        captureButton.querySelector('.text').textContent = 'Adding to List...';
        
        progressContainer.style.display = 'block';
        resultContainer.style.display = 'none';
        
        statusText.textContent = message;
        this.updateProgress(message, progress);
        
        console.log('Progress:', message, progress + '%');
    }
    
    updateProgress(message, progress = null) {
        const statusText = document.getElementById('statusText');
        const progressFill = document.getElementById('progressFill');
        
        if (statusText) statusText.textContent = message;
        
        if (progress !== null && progressFill) {
            progressFill.style.width = progress + '%';
        }
    }
    
    showSuccess(message) {
        this.hideProgress();
        this.showResult(message, 'success', '✅');
        console.log('✅ Success:', message);
    }
    
    showError(message) {
        this.hideProgress();
        this.showResult(message, 'error', '❌');
        console.log('❌ Error:', message);
    }
    
    showResult(message, type, icon) {
        const resultContainer = document.getElementById('result');
        const resultIcon = document.getElementById('resultIcon');
        const resultMessage = document.getElementById('resultMessage');
        
        if (resultContainer) {
            resultContainer.className = `result-container ${type}`;
            resultContainer.style.display = 'block';
        }
        
        if (resultIcon) resultIcon.textContent = icon;
        if (resultMessage) resultMessage.textContent = message;
        
        // Auto-close popup after success
        if (type === 'success') {
            setTimeout(() => {
                window.close();
            }, 3000);
        }
    }
    
    hideProgress() {
        const captureButton = document.getElementById('captureButton');
        const progressContainer = document.getElementById('progress');
        
        if (captureButton) {
            captureButton.disabled = false;
            captureButton.querySelector('.text').textContent = 'Add to List';
        }
        
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }
    
    async loadDailyStats() {
        try {
            const today = new Date().toDateString();
            const result = await chrome.storage.local.get([`stats_${today}`]);
            const todayStats = result[`stats_${today}`] || { count: 0 };
            
            const countElement = document.getElementById('todayCount');
            if (countElement) {
                countElement.textContent = todayStats.count;
            }
            
            console.log('Daily stats loaded:', todayStats.count, 'prospects today');
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }
    
    async updateDailyStats() {
        try {
            const today = new Date().toDateString();
            const key = `stats_${today}`;
            const result = await chrome.storage.local.get([key]);
            const todayStats = result[key] || { count: 0 };
            
            todayStats.count += 1;
            
            await chrome.storage.local.set({ [key]: todayStats });
            
            const countElement = document.getElementById('todayCount');
            if (countElement) {
                countElement.textContent = todayStats.count;
            }
            
            console.log('📈 Daily stats updated:', todayStats.count, 'prospects today');
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }
    
    openSettings() {
        console.log('⚙️ Settings clicked - will implement settings panel later');
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing REAL Auto-ListBuilder popup...');
    new ListBuilderPopup();
});

console.log('📋 Auto-ListBuilder popup script loaded successfully');