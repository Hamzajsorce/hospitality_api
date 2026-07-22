const axios = require('axios');

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      case "'":
        return '&#39;';
      default:
        return char;
    }
  });
}

class TelegramNotifier {
  constructor(token, chatId) {
    this.token = token;
    this.chatId = chatId;
    this.url = token && chatId ? `https://api.telegram.org/bot${token}/sendMessage` : null;
  }

  getConfigSummary() {
    return {
      hasToken: Boolean(this.token),
      tokenLength: this.token ? String(this.token).length : 0,
      hasChatId: Boolean(this.chatId),
      chatId: this.chatId ? String(this.chatId) : null,
      isConfigured: Boolean(this.url),
    };
  }

  async send(text) {
    if (!this.url) {
      console.warn('TelegramNotifier skipped: missing Telegram configuration.', this.getConfigSummary());
      return null;
    }

    const formattedText = String(text || '').trim();
    if (!formattedText) {
      console.warn('TelegramNotifier skipped: message text is empty.', this.getConfigSummary());
      return null;
    }

    try {
      const response = await axios.post(this.url, {
        chat_id: this.chatId,
        text: formattedText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      });
      console.info('TelegramNotifier sent message.', {
        chatId: String(this.chatId),
        messageLength: formattedText.length,
        status: response.status,
        telegramOk: response.data?.ok,
        messageId: response.data?.result?.message_id,
      });
      return response;
    } catch (err) {
      const responseData = err.response?.data;
      console.error('TelegramNotifier failed to send message.', {
        ...this.getConfigSummary(),
        messageLength: formattedText.length,
        httpStatus: err.response?.status,
        telegramOk: responseData?.ok,
        telegramErrorCode: responseData?.error_code,
        telegramDescription: responseData?.description,
        errorCode: err.code,
        errorMessage: err.message,
      });
      return null;
    }
  }

  buildMessage(title, text) {
    const escapedTitle = escapeHtml(title);
    const escapedText = escapeHtml(text);
    return [`<b>${escapedTitle}</b>`, escapedText].filter(Boolean).join('\n');
  }
}

module.exports = TelegramNotifier;
