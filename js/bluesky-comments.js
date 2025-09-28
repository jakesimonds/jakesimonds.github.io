/**
 * Bluesky Comments Component for Hugo
 * Fetches and displays Bluesky thread replies as blog comments
 */

class BlueskyComments {
    constructor(container, options = {}) {
        this.container = container;
        this.atUri = options.atUri;
        this.maxDepth = options.maxDepth || 5;
        this.apiBase = 'https://public.api.bsky.app/xrpc';
        
        if (!this.atUri) {
            this.showError('No Bluesky post URI provided');
            return;
        }
        
        this.init();
    }
    
    async init() {
        this.showLoading();
        try {
            const thread = await this.fetchThread();
            this.renderComments(thread);
        } catch (error) {
            console.error('Failed to load Bluesky comments:', error);
            this.showError('Failed to load comments. Please try again later.');
        }
    }
    
    async fetchThread() {
        try {
            console.log('Fetching thread for:', this.atUri);
            const url = `${this.apiBase}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(this.atUri)}&depth=10`;
            console.log('API URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });
            
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Thread data:', data);
            return data.thread;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }
    
    showLoading() {
        this.container.innerHTML = `
            <div class="bluesky-comments-loading">
                <p>Loading comments from Bluesky...</p>
            </div>
        `;
    }
    
    showError(message) {
        this.container.innerHTML = `
            <div class="bluesky-comments-error">
                <p>⚠️ ${message}</p>
            </div>
        `;
    }
    
    renderComments(thread) {
        if (!thread.replies || thread.replies.length === 0) {
            this.container.innerHTML = `
                <div class="bluesky-comments-empty">
                    <p>No comments yet. <a href="${this.getBlueskyUrl(thread.post)}" target="_blank" rel="noopener">Join the conversation on Bluesky →</a></p>
                </div>
            `;
            return;
        }
        
        const commentsHtml = `
            <div class="bluesky-comments">
                <h3 class="bluesky-comments-title">
                    Comments from Bluesky
                </h3>
                <div class="bluesky-comments-list">
                    ${thread.replies.map(reply => this.renderReply(reply, 0)).join('')}
                </div>
                <div class="bluesky-comments-footer">
                    <a href="${this.getBlueskyUrl(thread.post)}" target="_blank" rel="noopener">
                        💬 Reply on Bluesky
                    </a>
                </div>
            </div>
        `;
        
        this.container.innerHTML = commentsHtml;
    }
    
    renderReply(thread, depth = 0) {
        if (depth >= this.maxDepth) return '';
        
        const post = thread.post;
        const author = post.author;
        const record = post.record;
        
        // Format timestamp
        const createdAt = new Date(record.createdAt);
        const timeAgo = this.formatTimeAgo(createdAt);
        
        // Handle rich text content
        const content = this.formatPostContent(record);
        
        // Handle embeds (images, links, etc.)
        const embedsHtml = post.embed ? this.renderEmbed(post.embed) : '';
        
        // Render nested replies
        const repliesHtml = thread.replies && depth < this.maxDepth 
            ? thread.replies.map(reply => this.renderReply(reply, depth + 1)).join('')
            : '';
        
        return `
            <div class="bluesky-reply" style="margin-left: ${depth * 20}px">
                <div class="bluesky-reply-header">
                    <img src="${author.avatar || '/img/default-avatar.png'}" 
                         alt="${author.displayName || author.handle}" 
                         class="bluesky-avatar"
                         onerror="this.src='/img/default-avatar.png'">
                    <div class="bluesky-author-info">
                        <span class="bluesky-author-name">${author.displayName || author.handle}</span>
                        <span class="bluesky-author-handle">@${author.handle}</span>
                        <span class="bluesky-timestamp">
                            <a href="${this.getBlueskyUrl(post)}" target="_blank" rel="noopener">${timeAgo}</a>
                        </span>
                    </div>
                </div>
                <div class="bluesky-reply-content">
                    ${content}
                    ${embedsHtml}
                </div>
                ${repliesHtml}
            </div>
        `;
    }
    
    formatPostContent(record) {
        if (!record.text) return '';
        
        let text = record.text;
        
        // Handle facets (links, mentions, hashtags)
        if (record.facets && record.facets.length > 0) {
            // Sort facets by byte start position in reverse order to avoid offset issues
            const sortedFacets = [...record.facets].sort((a, b) => b.index.byteStart - a.index.byteStart);
            
            for (const facet of sortedFacets) {
                const start = facet.index.byteStart;
                const end = facet.index.byteEnd;
                const originalText = text.slice(start, end);
                
                for (const feature of facet.features) {
                    if (feature.$type === 'app.bsky.richtext.facet#link') {
                        text = text.slice(0, start) + 
                               `<a href="${feature.uri}" target="_blank" rel="noopener">${originalText}</a>` + 
                               text.slice(end);
                        break;
                    } else if (feature.$type === 'app.bsky.richtext.facet#mention') {
                        text = text.slice(0, start) + 
                               `<a href="https://bsky.app/profile/${feature.did}" target="_blank" rel="noopener">${originalText}</a>` + 
                               text.slice(end);
                        break;
                    } else if (feature.$type === 'app.bsky.richtext.facet#tag') {
                        text = text.slice(0, start) + 
                               `<a href="https://bsky.app/hashtag/${feature.tag}" target="_blank" rel="noopener">${originalText}</a>` + 
                               text.slice(end);
                        break;
                    }
                }
            }
        }
        
        // Convert line breaks to <br> tags
        text = text.replace(/\n/g, '<br>');
        
        return `<p>${text}</p>`;
    }
    
    renderEmbed(embed) {
        if (!embed) return '';
        
        switch (embed.$type) {
            case 'app.bsky.embed.images#view':
                return this.renderImages(embed.images);
            case 'app.bsky.embed.external#view':
                return this.renderExternalLink(embed.external);
            case 'app.bsky.embed.record#view':
                return this.renderQuotePost(embed.record);
            case 'app.bsky.embed.recordWithMedia#view':
                return this.renderQuotePost(embed.record.record) + this.renderEmbed(embed.media);
            default:
                return `<div class="bluesky-embed-unsupported">Unsupported embed type: ${embed.$type}</div>`;
        }
    }
    
    renderImages(images) {
        if (!images || images.length === 0) return '';
        
        const imageGrid = images.map(img => `
            <img src="${img.fullsize}" 
                 alt="${img.alt || ''}" 
                 class="bluesky-embed-image"
                 onclick="window.open('${img.fullsize}', '_blank')">
        `).join('');
        
        return `<div class="bluesky-embed-images">${imageGrid}</div>`;
    }
    
    renderExternalLink(external) {
        if (!external) return '';
        
        return `
            <div class="bluesky-embed-external">
                ${external.thumb ? `<img src="${external.thumb}" alt="" class="bluesky-embed-thumb">` : ''}
                <div class="bluesky-embed-external-content">
                    <h4><a href="${external.uri}" target="_blank" rel="noopener">${external.title || external.uri}</a></h4>
                    ${external.description ? `<p>${external.description}</p>` : ''}
                    <span class="bluesky-embed-domain">${new URL(external.uri).hostname}</span>
                </div>
            </div>
        `;
    }
    
    renderQuotePost(record) {
        if (!record) return '';
        
        return `
            <div class="bluesky-embed-quote">
                <div class="bluesky-quote-header">
                    <img src="${record.author.avatar || '/img/default-avatar.png'}" 
                         alt="${record.author.displayName || record.author.handle}" 
                         class="bluesky-quote-avatar">
                    <span class="bluesky-quote-author">${record.author.displayName || record.author.handle}</span>
                    <span class="bluesky-quote-handle">@${record.author.handle}</span>
                </div>
                <div class="bluesky-quote-content">
                    ${this.formatPostContent(record.value)}
                </div>
            </div>
        `;
    }
    
    getBlueskyUrl(post) {
        const handle = post.author.handle;
        const postId = post.uri.split('/').pop();
        return `https://bsky.app/profile/${handle}/post/${postId}`;
    }
    
    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'just now';
        if (diffMins < 60) return `${diffMins}m`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        
        return date.toLocaleDateString();
    }
}

// Initialize comments when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, looking for Bluesky comments...');
    const commentsContainer = document.getElementById('bluesky-comments');
    console.log('Comments container:', commentsContainer);
    
    if (commentsContainer) {
        const did = commentsContainer.dataset.did;
        const postId = commentsContainer.dataset.postId;
        console.log('DID from dataset:', did);
        console.log('Post ID from dataset:', postId);
        
        if (did && postId) {
            const atUri = `at://${did}/app.bsky.feed.post/${postId}`;
            console.log('Constructed AT URI:', atUri);
            console.log('Initializing Bluesky comments...');
            new BlueskyComments(commentsContainer, { atUri });
        } else {
            console.error('Missing DID or Post ID in data attributes');
        }
    } else {
        console.log('No bluesky-comments container found');
    }
});
