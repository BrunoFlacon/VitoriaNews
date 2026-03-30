import { dispatchPost } from '../platforms/dispatcher.ts';
import { discoverTrends } from './trend-discovery.ts';
import { generateContent } from './content-generator.ts';
import { collectAnalytics } from './analytics-engine.ts';

export async function processJobQueue(supabaseClient: any) {
  // console.log('Processing distributed job queue...');
  // Fetch pending jobs
  const { data: jobs, error } = await supabaseClient
    .from('job_queue')
    .select('*')
    .eq('status', 'pending')
    .limit(10);

  if (error || !jobs) {
    console.error('Error fetching jobs', error);
    return { success: false, error };
  }

  let processed = 0;
  for (const job of jobs) {
    // console.log(`Processing job ${job.id} of type ${job.job_type}`);
    // Mark as in-progress (stub)
    await supabaseClient.from('job_queue').update({ status: 'processing' }).eq('id', job.id);

    try {
      if (job.job_type === 'publish_post') {
        await dispatchPost(supabaseClient, job.payload);
      } else if (job.job_type === 'scan_trends') {
        await discoverTrends(supabaseClient);
      } else if (job.job_type === 'generate_content') {
        if (job.payload?.trendId) await generateContent(supabaseClient, job.payload.trendId);
      } else if (job.job_type === 'update_analytics') {
        await collectAnalytics(supabaseClient);
      } else if (job.job_type === 'media_transcoding') {
        // console.log(`Sending job ${job.id} to transcoding service.`);
        // To be handled by transcoder function
      }

      await supabaseClient.from('job_queue').update({ status: 'completed' }).eq('id', job.id);
      processed++;
    } catch (e: any) {
      console.error(`Error processing job ${job.id}`, e);
      await supabaseClient.from('job_queue').update({ status: 'failed', error: e.message }).eq('id', job.id);
    }
  }

  return { success: true, processed };
}
