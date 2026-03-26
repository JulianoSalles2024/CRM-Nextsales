const fs = require('fs');
const d = JSON.parse(fs.readFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V12.json'));

// Fix Upsert Performance: call the RPC aggregate_agent_performance instead of direct upsert
// The RPC was created in migration 075 and handles aggregation correctly from agent_runs
const perfNode = d.nodes.find(n => n.name === 'HTTP - Upsert Performance');
if (perfNode) {
  delete perfNode.parameters.bodyParameters;
  perfNode.parameters.url = 'https://fhkhamwrfwtacwydukvb.supabase.co/rest/v1/rpc/aggregate_agent_performance';
  perfNode.parameters.method = 'POST';
  perfNode.parameters.specifyBody = 'keypair';
  perfNode.parameters.bodyParameters = {
    parameters: [
      { name: 'p_company_id', value: "={{ $('Webhook').first().json.body.company_id }}" },
      { name: 'p_date', value: "={{ new Date().toISOString().slice(0,10) }}" }
    ]
  };
  // Keep only necessary headers
  perfNode.parameters.headerParameters = {
    parameters: [
      { name: 'apikey', value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY' },
      { name: 'Authorization', value: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoa2hhbXdyZnd0YWN3eWR1a3ZiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTMyNjcxMywiZXhwIjoyMDgwOTAyNzEzfQ.slNbow0lzBpryTaPPNNPDOV5x_uBqRHQZR38RRk92sY' },
      { name: 'Content-Type', value: 'application/json' }
    ]
  };
  perfNode.continueOnFail = true;
  console.log('[OK] Upsert Performance → RPC aggregate_agent_performance');
}

d.name = 'WF-07-AGENT-EXECUTOR-V13';
fs.writeFileSync('C:/Users/julia/CRM-Fity/n8n/WF-07-AGENT-EXECUTOR-V13.json', JSON.stringify(d, null, 2));
console.log('WF-07-AGENT-EXECUTOR-V13.json saved!');
