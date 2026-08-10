import type { Message } from '../types';

export const exportChatAsTxt = (messages: Message[], title: string = 'WhatsApp_Support_Chat') => {
  if (!messages || messages.length === 0) {
    alert('No messages to export.');
    return;
  }

  let content = `==========================================\n`;
  content += `     WHATSAPP SUPPORT CHAT TRANSCRIPT     \n`;
  content += `==========================================\n`;
  content += `Exported At: ${new Date().toLocaleString()}\n`;
  content += `Total Messages: ${messages.length}\n`;
  content += `------------------------------------------\n\n`;

  messages.forEach((msg) => {
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : new Date().toLocaleString();
    const sender = msg.senderName || (msg.senderType === 'customer' ? 'Customer' : 'Agent');
    const text = msg.content || (msg.fileName ? `[Attachment: ${msg.fileName}]` : '');
    content += `[${time}] ${sender}: ${text}\n`;
  });

  content += `\n==========================================\n`;
  content += `End of Chat Transcript\n`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportChatAsPdf = (messages: Message[], title: string = 'WhatsApp_Support_Chat') => {
  if (!messages || messages.length === 0) {
    alert('No messages to export.');
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const rows = messages.map((msg) => {
    const time = msg.createdAt ? new Date(msg.createdAt).toLocaleString() : new Date().toLocaleString();
    const sender = msg.senderName || (msg.senderType === 'customer' ? 'Customer' : 'Agent');
    const isCustomer = msg.senderType === 'customer';
    const text = msg.content || (msg.fileName ? `[Attachment: ${msg.fileName}]` : '');

    return `
      <div style="margin-bottom: 12px; padding: 10px 14px; border-radius: 12px; max-width: 80%; ${isCustomer ? 'margin-left: auto; background-color: #d9fdd3; color: #111b21;' : 'margin-right: auto; background-color: #f0f2f5; color: #111b21;'}">
        <div style="font-size: 11px; font-weight: bold; color: ${isCustomer ? '#008069' : '#027eb5'}; margin-bottom: 4px;">
          ${sender} <span style="font-weight: normal; color: #667781; float: right; font-size: 10px;">${time}</span>
        </div>
        <div style="font-size: 13px; line-height: 1.4;">${text}</div>
      </div>
    `;
  }).join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title} Transcript</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 24px; background: #ffffff; color: #111b21; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #008069; padding-bottom: 12px; }
          .header h1 { color: #008069; margin: 0; font-size: 20px; }
          .header p { margin: 4px 0 0 0; color: #667781; font-size: 12px; }
          .chat-container { max-width: 700px; margin: 0 auto; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>WhatsApp Support Chat Transcript</h1>
          <p>Exported on ${new Date().toLocaleString()}</p>
        </div>
        <div class="chat-container">
          ${rows}
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
