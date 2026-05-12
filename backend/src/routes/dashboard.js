const express = require('express');
const supabase = require('../supabase');
const { authMiddleware, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authMiddleware, requireSuperAdmin, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayISO = todayStart.toISOString();

    const [
      { count: totalConvs },
      { count: activeConvs },
      { count: humanConvs },
      { count: botConvs },
      { count: msgsToday },
      { count: newConvsToday },
      { data: companies },
    ] = await Promise.all([
      supabase.from('conversations').select('id', { count: 'exact', head: true }),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).neq('status', 'closed'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'human'),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).eq('status', 'bot'),
      supabase.from('messages').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('conversations').select('id', { count: 'exact', head: true }).gte('created_at', todayISO),
      supabase.from('companies').select('id, name, active'),
    ]);

    // Conversaciones por empresa (top 5)
    const { data: convsByCompany } = await supabase
      .from('conversations')
      .select('company_id, companies(name)')
      .neq('status', 'closed');

    const companyMap = {};
    (convsByCompany || []).forEach(c => {
      const name = c.companies?.name || c.company_id;
      companyMap[name] = (companyMap[name] || 0) + 1;
    });
    const topCompanies = Object.entries(companyMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    res.json({
      totalConversations:  totalConvs  || 0,
      activeConversations: activeConvs || 0,
      humanConversations:  humanConvs  || 0,
      botConversations:    botConvs    || 0,
      messagesToday:       msgsToday   || 0,
      newConvsToday:       newConvsToday || 0,
      totalCompanies:      companies?.length || 0,
      activeCompanies:     companies?.filter(c => c.active).length || 0,
      topCompanies,
      botToHumanRate: activeConvs > 0
        ? Math.round((humanConvs / activeConvs) * 100)
        : 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
