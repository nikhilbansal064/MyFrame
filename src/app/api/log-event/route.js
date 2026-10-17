import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// Resilient direct Supabase client for Serverless API route using service role or standard anon credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// In server routes, we prefer to use the standard anonymous key or service role. Since RLS allows public insertion to 'participants' table, standard anon is perfect!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseServer = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function POST(request) {
  logger.info('API_LogEvent', 'Received log request');

  if (!supabaseServer) {
    const errMsg = 'Supabase environment config is missing on the server.';
    logger.error('API_LogEvent', errMsg);
    return new Response(JSON.stringify({ error: errMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { campaignId, eventType } = body;

    if (!campaignId || !eventType) {
      return new Response(JSON.stringify({ error: 'Missing campaignId or eventType parameters' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Extract headers telemetry
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const acceptLanguage = request.headers.get('accept-language') || '';
    
    // Parse primary locale (e.g. "en-US,en;q=0.9" -> "en-US")
    const locale = acceptLanguage ? acceptLanguage.split(',')[0] : 'en-US';
    
    // Fallback region extraction based on locale / browser configs
    const region = locale.split('-')[1] || 'IN'; // Defaults to India region context if empty

    logger.debug('API_LogEvent', 'Logging participant telemetry:', {
      campaignId,
      eventType,
      locale,
      region,
      userAgent: userAgent.substring(0, 50) + '...'
    });

    // Write record anonymously to database
    const { data, error } = await supabaseServer
      .from('participants')
      .insert({
        campaign_id: campaignId,
        event_type: eventType,
        user_agent: userAgent,
        locale,
        region,
        metadata: {}
      })
      .select();

    if (error) throw error;

    logger.info('API_LogEvent', 'Event successfully logged to database', eventType);

    return new Response(JSON.stringify({ success: true, loggedEvent: data[0] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    logger.error('API_LogEvent', 'Failed logging event telemetry', err);
    return new Response(JSON.stringify({ error: 'Internal Server Error logs failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
