console.log('🚀 Auto-ListBuilder content script starting...');

class ListBuilderContentScript {
    constructor() {
        this.apiEndpoint = 'http://localhost:8000/api';
        this.isProcessing = false;
        this.init();
    }
    
    init() {
        this.setupMessageListener();
        this.injectFloatingButton();
        this.observePageChanges();
        console.log('✅ Auto-ListBuilder content script initialized');
    }
    
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async responses
        });
    }
    
    async handleMessage(request, sender, sendResponse) {
        switch (request.action) {
            case 'PROCESS_SCREENSHOT':
                await this.processScreenshot(request.data, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }
    
    injectFloatingButton() {
        // Only inject on supported sites
        if (!this.isSupportedSite(window.location.href)) {
            console.log('❌ Site not supported, skipping floating button injection');
            return;
        }
        
        // Remove existing button if any
        const existingButton = document.getElementById('listbuilder-floating-button');
        if (existingButton) existingButton.remove();
        
        const button = document.createElement('button');
        button.id = 'listbuilder-floating-button';
        button.className = 'listbuilder-floating-button';
        button.innerHTML = '📋';
        button.title = 'Add to Prospect List';
        
        // Add click handler
        button.addEventListener('click', () => this.captureCurrentContext());
        
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.1)';
        });
        
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        document.body.appendChild(button);
        console.log('📋 Floating button injected successfully');
    }
    
    observePageChanges() {
        // Re-inject button when page changes (for SPAs like LinkedIn)
        const observer = new MutationObserver(() => {
            if (!document.getElementById('listbuilder-floating-button')) {
                setTimeout(() => this.injectFloatingButton(), 1000);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('👀 Page change observer set up');
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
    
    async captureCurrentContext() {
        if (this.isProcessing) {
            console.log('Already processing, ignoring click');
            return;
        }
        
        try {
            this.isProcessing = true;
            this.showProcessingOverlay();
            
            console.log('🎯 Floating button clicked - starting capture process');
            
            // Extract page context
            const context = this.extractPageContext();
            console.log('📄 Page context extracted:', context);
            
            // Trigger screenshot capture via background script
            const response = await chrome.runtime.sendMessage({
                action: 'CAPTURE_SCREENSHOT'
            });
            
            if (response && response.success) {
                this.updateProcessingStatus('Analyzing screenshot...', 50);
                
                // Simulate AI analysis
                await this.simulateAnalysis();
                
                this.updateProcessingStatus('Adding to prospect list...', 75);
                
                // Simulate storage
                await this.simulateStorage(context);
                
                this.showSuccess('Added to prospect list! 🎯');
                
            } else {
                this.showError('Failed to capture screenshot');
            }
            
        } catch (error) {
            console.error('❌ Floating button capture failed:', error);
            this.showError('Failed to add to list: ' + error.message);
        } finally {
            this.isProcessing = false;
            setTimeout(() => this.hideProcessingOverlay(), 2000);
        }
    }
    
    extractPageContext() {
        const url = window.location.href;
        const platform = this.detectPlatform(url);
        
        let context = {
            platform: platform,
            url: url,
            timestamp: new Date().toISOString(),
            page_title: document.title
        };
        
        // Platform-specific context extraction
        try {
            switch (platform) {
                case 'linkedin':
                    context = { ...context, ...this.extractLinkedInContext() };
                    break;
                case 'twitter':
                    context = { ...context, ...this.extractTwitterContext() };
                    break;
                case 'facebook':
                    context = { ...context, ...this.extractFacebookContext() };
                    break;
                case 'instagram':
                    context = { ...context, ...this.extractInstagramContext() };
                    break;
            }
        } catch (error) {
            console.error('Context extraction error:', error);
        }
        
        return context;
    }
    
    detectPlatform(url) {
        if (url.includes('linkedin.com')) return 'linkedin';
        if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
        if (url.includes('facebook.com')) return 'facebook';
        if (url.includes('instagram.com')) return 'instagram';
        return 'unknown';
    }
    
    extractLinkedInContext() {
        const context = {};
        
        try {
            // Profile information
            const profileName = document.querySelector('h1.text-heading-xlarge')?.textContent?.trim();
            const profileTitle = document.querySelector('.text-body-medium.break-words')?.textContent?.trim();
            const company = document.querySelector('.inline-show-more-text .hoverable-link-text')?.textContent?.trim();
            
            // Post content if viewing a post
            const postContent = document.querySelector('.feed-shared-update-v2__description')?.textContent?.trim();
            const postAuthor = document.querySelector('.feed-shared-actor__name')?.textContent?.trim();
            
            // Determine page type
            const pageType = this.getLinkedInPageType();
            
            context.profile_name = profileName;
            context.profile_title = profileTitle;
            context.company = company;
            context.post_content = postContent;
            context.post_author = postAuthor;
            context.page_type = pageType;
            
            console.log('LinkedIn context extracted:', context);
            
        } catch (error) {
            console.error('LinkedIn context extraction error:', error);
        }
        
        return context;
    }
    
    extractTwitterContext() {
        const context = {};
        
        try {
            // Profile info
            const profileName = document.querySelector('[data-testid="UserName"]')?.textContent?.trim();
            const handle = document.querySelector('[data-testid="UserScreenName"]')?.textContent?.trim();
            const bio = document.querySelector('[data-testid="UserDescription"]')?.textContent?.trim();
            
            // Tweet content if viewing a tweet
            const tweetContent = document.querySelector('[data-testid="tweetText"]')?.textContent?.trim();
            
            context.profile_name = profileName;
            context.handle = handle;
            context.bio = bio;
            context.tweet_content = tweetContent;
            context.page_type = this.getTwitterPageType();
            
            console.log('Twitter context extracted:', context);
            
        } catch (error) {
            console.error('Twitter context extraction error:', error);
        }
        
        return context;
    }
    
    extractFacebookContext() {
        // Basic Facebook context - can be expanded
        return {
            page_type: 'facebook_page',
            platform_note: 'Facebook context extraction'
        };
    }
    
    extractInstagramContext() {
        // Basic Instagram context - can be expanded
        return {
            page_type: 'instagram_page',
            platform_note: 'Instagram context extraction'
        };
    }
    
    getLinkedInPageType() {
        const url = window.location.href;
        if (url.includes('/in/')) return 'profile';
        if (url.includes('/posts/')) return 'post';
        if (url.includes('/company/')) return 'company';
        if (url.includes('/feed/')) return 'feed';
        return 'unknown';
    }
    
    getTwitterPageType() {
        const url = window.location.href;
        if (url.includes('/status/')) return 'tweet';
        if (url.match(/\/[^\/]+$/)) return 'profile';
        if (url.includes('/home')) return 'feed';
        return 'unknown';
    }
    
    async simulateAnalysis() {
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('🧠 AI analysis completed (simulated)');
                resolve();
            }, 1500);
        });
    }
    
    async simulateStorage(context) {
        return new Promise(resolve => {
            setTimeout(() => {
                console.log('📊 Stored in prospect list (simulated):', context);
                resolve();
            }, 1000);
        });
    }
    
    showProcessingOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'listbuilder-processing-overlay';
        overlay.className = 'listbuilder-processing-overlay';
        
        overlay.innerHTML = `
            <div class="listbuilder-processing-content">
                <div style="font-size: 24px; margin-bottom: 15px;">📋</div>
                <h3 style="margin: 0 0 10px 0;">Adding to Prospect List</h3>
                <p id="listbuilder-processing-status" style="margin: 0; color: #666;">Capturing profile...</p>
                <div style="margin-top: 15px; width: 100%; height: 4px; background: #eee; border-radius: 2px;">
                    <div id="listbuilder-processing-progress" style="width: 25%; height: 100%; background: #4ECDC4; border-radius: 2px; transition: width 0.3s ease;"></div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        console.log('💫 Processing overlay shown');
    }
    
    updateProcessingStatus(message, progress = null) {
        const statusElement = document.getElementById('listbuilder-processing-status');
        const progressElement = document.getElementById('listbuilder-processing-progress');
        
        if (statusElement) statusElement.textContent = message;
        if (progressElement && progress !== null) {
            progressElement.style.width = progress + '%';
        }
        
        console.log('📊 Processing update:', message, progress ? progress + '%' : '');
    }
    
    hideProcessingOverlay() {
        const overlay = document.getElementById('listbuilder-processing-overlay');
        if (overlay) {
            overlay.remove();
            console.log('✨ Processing overlay hidden');
        }
    }
    
    showSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showError(message) {
        this.showNotification(message, 'error');
    }
    
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `listbuilder-notification ${type}`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        console.log(`📢 Notification (${type}):`, message);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize content script
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new ListBuilderContentScript());
} else {
    new ListBuilderContentScript();
}

console.log('📋 Auto-ListBuilder content script loaded successfully');