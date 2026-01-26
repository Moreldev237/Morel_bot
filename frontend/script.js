class MorelBot {
    constructor() {
        this.apiUrl = 'http://localhost:8001/api/chat/';
        this.messages = [];
        this.isTyping = false;
        this.initializeElements();
        this.setupEventListeners();
        this.loadFromLocalStorage();
        this.updateMessageCount();
    }

    initializeElements() {
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.messagesContainer = document.getElementById('messagesContainer');
        this.clearChatButton = document.getElementById('clearChat');
        this.messageCountElement = document.getElementById('messageCount');
        this.tokenCountElement = document.getElementById('tokenCount');
        this.connectionStatus = document.getElementById('connectionStatus');
    }

    setupEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.clearChatButton.addEventListener('click', () => this.clearChat());
        
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Suggestions
        document.querySelectorAll('.suggestion-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const suggestion = e.target.textContent;
                this.messageInput.value = suggestion;
                this.sendMessage();
            });
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        
        if (!message || this.isTyping) return;
        
        // Ajouter le message de l'utilisateur
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.autoResizeTextarea();
        
        // Afficher l'indicateur de frappe
        this.showTypingIndicator();
        
        try {
            const response = await this.getBotResponse(message);
            this.removeTypingIndicator();
            this.addMessage(response, 'bot');
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Désolé, une erreur est survenue. Veuillez réessayer.', 'bot');
            console.error('Erreur:', error);
            this.connectionStatus.textContent = 'Erreur de connexion';
            this.connectionStatus.className = 'text-red-400';
        }
        
        this.saveToLocalStorage();
        this.updateMessageCount();
    }

    addMessage(content, sender) {
        const messageId = Date.now();
        const message = {
            id: messageId,
            content: content,
            sender: sender,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        this.messages.push(message);
        
        const messageElement = this.createMessageElement(message);
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
    }

    createMessageElement(message) {
        const messageDiv = document.createElement('div');
        messageDiv.id = `message-${message.id}`;
        messageDiv.className = `message ${message.sender}-message max-w-3/4 rounded-2xl p-4 ${message.sender === 'user' ? 'ml-auto' : ''}`;
        
        const senderName = message.sender === 'user' ? 'Vous' : 'MorelBot 🤖';
        const senderIcon = message.sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        const gradientClass = message.sender === 'user' 
            ? 'from-blue-500 to-blue-600' 
            : 'from-purple-500 to-pink-500';
        
        messageDiv.innerHTML = `
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 rounded-full bg-gradient-to-r ${gradientClass} flex items-center justify-center flex-shrink-0">
                    <i class="${senderIcon} text-white text-sm"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="font-bold text-sm">${senderName}</span>
                        <span class="text-xs text-gray-400">${message.timestamp}</span>
                    </div>
                    <div class="text-gray-100 whitespace-pre-wrap">${this.escapeHtml(message.content)}</div>
                </div>
            </div>
        `;
        
        return messageDiv;
    }

    showTypingIndicator() {
        this.isTyping = true;
        
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="flex items-center space-x-2">
                <div class="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                    <i class="fas fa-robot text-white text-sm"></i>
                </div>
                <div class="flex space-x-1">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async getBotResponse(userMessage) {
        const response = await fetch(this.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: userMessage,
                history: this.messages.slice(0, -1) // Exclure le message actuel de l'utilisateur
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.status === 'success') {
            return data.response;
        } else {
            throw new Error(data.error || 'Erreur inconnue');
        }
    }

    clearChat() {
        if (confirm('Voulez-vous vraiment effacer toute la conversation ?')) {
            this.messages = [];
            this.messagesContainer.innerHTML = `
                <div class="chat-welcome">
                    <div class="text-center py-8">
                        <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                            <i class="fas fa-robot text-4xl text-blue-400"></i>
                        </div>
                        <h3 class="text-xl font-bold mb-2">Conversation effacée</h3>
                        <p class="text-gray-300 mb-4">Commencez une nouvelle conversation avec MorelBot !</p>
                    </div>
                </div>
            `;
            localStorage.removeItem('morelbot_messages');
            this.updateMessageCount();
        }
    }

    saveToLocalStorage() {
        localStorage.setItem('morelbot_messages', JSON.stringify(this.messages));
    }

    loadFromLocalStorage() {
        const saved = localStorage.getItem('morelbot_messages');
        if (saved) {
            try {
                this.messages = JSON.parse(saved);
                this.messagesContainer.innerHTML = '';
                
                if (this.messages.length === 0) {
                    this.showWelcomeMessage();
                } else {
                    this.messages.forEach(msg => {
                        const messageElement = this.createMessageElement(msg);
                        this.messagesContainer.appendChild(messageElement);
                    });
                    this.scrollToBottom();
                }
            } catch (e) {
                console.error('Erreur lors du chargement des messages:', e);
                this.showWelcomeMessage();
            }
        }
    }

    showWelcomeMessage() {
        this.messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="text-center py-8">
                    <div class="w-20 h-20 mx-auto rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                        <i class="fas fa-robot text-4xl text-blue-400"></i>
                    </div>
                    <h3 class="text-xl font-bold mb-2">Bonjour ! Je suis MorelBot 🤖</h3>
                    <p class="text-gray-300 mb-4">Je suis votre assistant IA basé sur GPT-4.1. Comment puis-je vous aider aujourd'hui ?</p>
                    <div class="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                        <button class="suggestion-btn">Explique-moi l'IA</button>
                        <button class="suggestion-btn">Donne-moi une recette</button>
                        <button class="suggestion-btn">Aide-moi à coder</button>
                        <button class="suggestion-btn">Parle-moi de toi</button>
                    </div>
                </div>
            </div>
        `;
        
        // Re-attacher les écouteurs d'événements aux boutons de suggestion
        document.querySelectorAll('.suggestion-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const suggestion = e.target.textContent;
                this.messageInput.value = suggestion;
                this.sendMessage();
            });
        });
    }

    updateMessageCount() {
        const userMessages = this.messages.filter(msg => msg.sender === 'user').length;
        const botMessages = this.messages.filter(msg => msg.sender === 'bot').length;
        const totalMessages = this.messages.length;
        
        this.messageCountElement.textContent = `${totalMessages} messages (${userMessages} vous, ${botMessages} bot)`;
        
        // Estimation des tokens (approximative)
        const totalChars = this.messages.reduce((sum, msg) => sum + msg.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4);
        this.tokenCountElement.textContent = `~${estimatedTokens} tokens`;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    autoResizeTextarea() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialiser le chatbot quand la page est chargée
document.addEventListener('DOMContentLoaded', () => {
    window.morelBot = new MorelBot();
    
    // Focus sur le champ de saisie
    document.getElementById('messageInput').focus();
});