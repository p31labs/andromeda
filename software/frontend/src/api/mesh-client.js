
  /**
   * Get message history for conversation
   */
  async getMessages(conversationId, options = {}) {
    const params = new URLSearchParams({
      limit: options.limit || 50,
      ...(options.before && { before: options.before }),
      ...(options.after && { after: options.after })
    });
    return this.request(`/api/messages/${conversationId}?${params}`, {
      method: 'GET'
    });
  }

  /**
   * Send message
   */
  async sendMessage(conversationId, content, type = 'text', metadata = {}) {
    return this.request('/api/messages', {
      method: 'POST',
      body: JSON.stringify({
        conversationId,
        senderId: this.userId,
        content,
        type,
        metadata
      })
    });
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId) {
    return this.request(`/api/messages/${messageId}/read`, {
      method: 'PUT',
      body: JSON.stringify({ userId: this.userId })
    });
  }

  /**
   * Mark message as delivered
   */
  async markAsDelivered(messageId) {
    return this.request(`/api/messages/${messageId}/delivered`, {
      method: 'PUT',
      body: JSON.stringify({ userId: this.userId })
    });
  }

  /**
   * Search messages
   */
  async searchMessages(query, options = {}) {
    const params = new URLSearchParams({
      q: query,
      userId: this.userId,
      limit: options.limit || 20
    });
    return this.request(`/api/messages/search?${params}`, {
      method: 'GET'
    });
  }


  /**
   * Get family member profile
   */
  async getMember(memberId) {
    return this.request(`/api/family/members/${memberId}`);
  }

  /**
   * List all family members
   */
  async listMembers() {
    return this.request('/api/family/members');
  }

  /**
   * Register device for push notifications
   */
  async registerDevice(deviceInfo) {
    return this.request('/api/family/devices', {
      method: 'POST',
      body: JSON.stringify({
        memberId: this.userId,
        ...deviceInfo
      })
    });
  }


  /**
   * Connect to real-time messaging WebSocket
   */
  connectWebSocket(onMessage, onTyping, onPresence, onError) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.warn('[MeshClient] WebSocket already connected');
      return this.ws;
    }

    // Build URL with userId
    const url = `${this.wsUrl}?userId=${encodeURIComponent(this.userId)}`;
    







  /**
   * Get system metrics (admin only)
   */
  async getSystemMetrics() {
    return this.request('/api/admin/mesh/metrics', {
      method: 'GET'
    });
  }

  /**
   * Get system health (admin only)
   */
  async getSystemHealth() {
    return this.request('/api/admin/system/health', {
      method: 'GET'
    });
  }


  /**
   * Generate unique ID for optimistic UI
   */
  generateTempId() {
    return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format timestamp for display
   */
  formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
