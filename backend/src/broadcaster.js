// In-memory SSE client registry for real-time presence/typing events.
// Each client registers with { userId, companyId, res } and receives broadcasts
// filtered to their company.

const clients = new Map(); // clientId -> { userId, companyId, res }

function register(clientId, userId, companyId, res) {
  clients.set(clientId, { userId, companyId, res });
}

function unregister(clientId) {
  clients.delete(clientId);
}

// Broadcast an event to all clients of a given company, except the sender.
function broadcast(companyId, event, data, excludeUserId = null) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [, client] of clients) {
    if (client.companyId !== companyId) continue;
    if (excludeUserId && client.userId === excludeUserId) continue;
    try { client.res.write(payload); } catch { /* client disconnected */ }
  }
}

module.exports = { register, unregister, broadcast };
