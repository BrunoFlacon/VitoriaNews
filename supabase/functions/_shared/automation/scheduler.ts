import { discoverTrends } from './trend-discovery.ts';
import { generateContent } from './content-generator.ts';
import { collectAnalytics } from './analytics-engine.ts';
import { checkTriggersAndAlerts } from './monitoring.ts';
import { processJobQueue } from './queue-dispatcher.ts';

/**
 * Basic scheduler stub to be called by a cron function or external runner.
 */
export async function runScheduler(supabaseClient: any, type: string) {
  console.log(`Running scheduled task: ${type}`);

  switch (type) {
    case 'scan_trends':
      return await discoverTrends(supabaseClient);
    case 'analytics_refresh':
      return await collectAnalytics(supabaseClient);
    case 'generate_content':
      // Fetch a random trend for generation
      const { data: trends } = await supabaseClient.from('trends').select('id').limit(1);
      if (trends?.length > 0) {
        return await generateContent(supabaseClient, trends[0].id);
      }
      return { success: false, reason: 'No trends found' };
    case 'process_queue':
      return await processJobQueue(supabaseClient);
    case 'monitor_alerts':
      return await checkTriggersAndAlerts(supabaseClient);
    default:
      console.error(`Unknown sync job: ${type}`);
      return { success: false, error: 'Unknown job type' };
  }
}
