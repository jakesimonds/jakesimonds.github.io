/**
 * Simple Modal Component for Hugo
 * Provides modal functionality similar to React patterns
 */

class Modal {
    constructor(modalId, options = {}) {
        this.modalId = modalId;
        this.options = {
            closeOnOverlayClick: true,
            closeOnEscape: true,
            ...options
        };
        
        this.modal = null;
        this.isOpen = false;
        
        this.init();
    }
    
    init() {
        // Create modal if it doesn't exist
        if (!document.getElementById(this.modalId)) {
            this.createModal();
        }
        
        this.modal = document.getElementById(this.modalId);
        this.bindEvents();
    }
    
    createModal() {
        const modalHTML = `
            <div id="${this.modalId}" class="modal-overlay">
                <div class="modal-content">
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                    <div id="modal-react-root" class="modal-react-content">
                        <div class="modal-loading">Loading React component...</div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.loadReactComponent();
    }
    
    bindEvents() {
        if (!this.modal) return;
        
        // Close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }
        
        // Overlay click
        if (this.options.closeOnOverlayClick) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) {
                    this.close();
                }
            });
        }
        
        // Escape key
        if (this.options.closeOnEscape) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isOpen) {
                    this.close();
                }
            });
        }
    }
    
    open() {
        if (!this.modal) return;
        
        this.modal.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
        
        // Focus management for accessibility
        const firstFocusable = this.modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }
    
    close() {
        if (!this.modal) return;
        
        this.modal.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = ''; // Restore scrolling
    }
    
    loadReactComponent() {
        // Load React and ReactDOM from CDN if not already loaded
        if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
            this.loadReactLibraries().then(() => {
                this.loadModalReactBundle();
            });
        } else {
            this.loadModalReactBundle();
        }
    }
    
    loadReactLibraries() {
        return new Promise((resolve) => {
            const reactScript = document.createElement('script');
            reactScript.src = 'https://unpkg.com/react@18/umd/react.production.min.js';
            reactScript.onload = () => {
                const reactDOMScript = document.createElement('script');
                reactDOMScript.src = 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js';
                reactDOMScript.onload = resolve;
                document.head.appendChild(reactDOMScript);
            };
            document.head.appendChild(reactScript);
        });
    }
    
    loadModalReactBundle() {
        const script = document.createElement('script');
        script.src = '/js/modal-react.js';
        script.onload = () => {
            if (typeof window.renderModalReact === 'function') {
                window.renderModalReact('modal-react-root');
            }
        };
        script.onerror = () => {
            document.getElementById('modal-react-root').innerHTML = 
                '<div style="padding: 24px;"><h2>Hello World!</h2><p>React component failed to load, but the modal works!</p></div>';
        };
        document.head.appendChild(script);
    }
    
    setContent(title, body) {
        // This method is now handled by React component
        console.log('Content is now managed by React component');
    }
}

// Global modal instance
let globalModal = null;

// Initialize modal when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Create a global modal instance
    globalModal = new Modal('global-modal');
    
    // Bind to modal trigger buttons
    const modalTriggers = document.querySelectorAll('[data-modal-trigger]');
    modalTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            if (globalModal) {
                globalModal.open();
            }
        });
    });
});

// Export for use in other scripts
window.Modal = Modal;
window.globalModal = globalModal;
