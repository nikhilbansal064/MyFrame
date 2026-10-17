import { createClient } from '@supabase/supabase-js';
import CampaignParticipantClient from '@/components/CampaignParticipantClient';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Initialise a direct database client for Server Components
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseServer = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Dynamic Server-Side SEO & Social Card Preview Tags Generation
export async function generateMetadata({ params }) {
  const { slug } = await params; // Await params promise for Next.js 15+ compatibility
  
  if (!supabaseServer) {
    return { title: 'Configuration Missing | My Story' };
  }

  try {
    const { data: campaign } = await supabaseServer
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (!campaign) {
      return {
        title: 'Campaign Not Found | My Story',
        description: 'This campaign overlay page does not exist or has been disabled by the organiser.'
      };
    }

    const titleStr = `${campaign.title} | My Story Frame Campaign`;
    const descStr = campaign.description || 'Join this campaign by adding your photo to their official custom branded frame! Ready in seconds, no login required.';

    return {
      title: titleStr,
      description: descStr,
      openGraph: {
        title: titleStr,
        description: descStr,
        images: [{ url: campaign.frame_url }],
        type: 'website',
        url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/c/${slug}`
      },
      twitter: {
        card: 'summary_large_image',
        title: titleStr,
        description: descStr,
        images: [campaign.frame_url]
      }
    };
  } catch (err) {
    logger.error('MetadataGenerator', 'Error generating metadata tags', err);
    return { title: 'Campaign Overlay | My Story' };
  }
}

// Server Component: Fetches campaign object and mounts the client component
export default async function CampaignPage({ params }) {
  const { slug } = await params; // Await params promise for Next.js 15+ compatibility
  
  if (!supabaseServer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-6 bg-background text-foreground">
        <h1 className="text-xl font-bold text-white">Database Configuration Error</h1>
        <p className="text-xs text-neutral-500 max-w-sm mt-1">Supabase connection keys are not configured on the Next.js server. Please check your variables.</p>
      </div>
    );
  }

  logger.info('CampaignPageServer', 'Rendering dynamic SSR page for slug:', slug);

  let campaign = null;
  try {
    const { data, error } = await supabaseServer
      .from('campaigns')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw error;
    campaign = data;
  } catch (err) {
    logger.error('CampaignPageServer', 'Database fetch failed', err);
  }

  return <CampaignParticipantClient campaign={campaign} />;
}
