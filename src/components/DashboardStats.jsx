'use client';

import { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend, 
  Filler 
} from 'chart.js';
import { logger } from '@/lib/logger';
import { Eye, Download, TrendingUp, Monitor } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function DashboardStats({ events, campaignsList = [] }) {
  
  // Aggregate Views vs Downloads
  const summary = useMemo(() => {
    let views = 0;
    let downloads = 0;

    events.forEach(e => {
      if (e.event_type === 'view') views++;
      if (e.event_type === 'download') downloads++;
    });

    return {
      views,
      downloads,
      conversion: views > 0 ? Math.round((downloads / views) * 100) : 0
    };
  }, [events]);

  // Aggregate Trends Line Chart Data (Last 7 days)
  const lineChartData = useMemo(() => {
    // 1. Generate last 7 days keys
    const dates = [];
    const dateMap = {};
    const pad = (n) => n.toString().padStart(2, '0');

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateString = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      dates.push(dateString);
      dateMap[dateString] = { views: 0, downloads: 0 };
    }

    // 2. Count events into map
    events.forEach(event => {
      if (!event.created_at) return;
      const d = new Date(event.created_at);
      const dateString = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      
      if (dateMap[dateString]) {
        if (event.event_type === 'view') dateMap[dateString].views++;
        if (event.event_type === 'download') dateMap[dateString].downloads++;
      }
    });

    // 3. Construct Chart.js datasets
    const labels = dates.map(ds => {
      const parts = ds.split('-');
      return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
    });

    const viewsData = dates.map(ds => dateMap[ds].views);
    const downloadsData = dates.map(ds => dateMap[ds].downloads);

    logger.debug('DashboardStats', 'Calculated 7 day trend lines', { labels, viewsData, downloadsData });

    return {
      labels,
      datasets: [
        {
          fill: true,
          label: 'Views',
          data: viewsData,
          borderColor: 'rgba(168, 85, 247, 1)', // Neon violet accent
          backgroundColor: 'rgba(168, 85, 247, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointBackgroundColor: 'rgba(168, 85, 247, 1)'
        },
        {
          fill: true,
          label: 'Downloads',
          data: downloadsData,
          borderColor: 'rgba(217, 70, 239, 1)', // Neon magenta accent
          backgroundColor: 'rgba(217, 70, 239, 0.08)',
          borderWidth: 2,
          tension: 0.35,
          pointBackgroundColor: 'rgba(217, 70, 239, 1)'
        }
      ]
    };
  }, [events]);

  // Aggregate Device Distribution (Bar Chart Data)
  const deviceChartData = useMemo(() => {
    let desktop = 0;
    let mobile = 0;
    let tablet = 0;

    events.forEach(event => {
      const ua = (event.user_agent || '').toLowerCase();
      if (ua.includes('ipad') || (ua.includes('android') && !ua.includes('mobile'))) {
        tablet++;
      } else if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
        mobile++;
      } else {
        desktop++;
      }
    });

    logger.debug('DashboardStats', 'Calculated device distributions', { desktop, mobile, tablet });

    return {
      labels: ['Mobile', 'Desktop', 'Tablet'],
      datasets: [
        {
          label: 'Downloads & Views',
          data: [mobile, desktop, tablet],
          backgroundColor: [
            'rgba(168, 85, 247, 0.75)', // Violet
            'rgba(217, 70, 239, 0.75)', // Magenta
            'rgba(6, 182, 212, 0.75)'   // Cyan
          ],
          borderColor: [
            'rgba(168, 85, 247, 1)',
            'rgba(217, 70, 239, 1)',
            'rgba(6, 182, 212, 1)'
          ],
          borderWidth: 1,
          borderRadius: 8
        }
      ]
    };
  }, [events]);

  // Aggregate Locale & Regions
  const topLocales = useMemo(() => {
    const counts = {};
    events.forEach(event => {
      if (!event.locale) return;
      const loc = event.locale.toUpperCase();
      counts[loc] = (counts[loc] || 0) + 1;
    });

    const list = Object.entries(counts).map(([locale, count]) => ({
      locale,
      count,
      percent: events.length > 0 ? Math.round((count / events.length) * 100) : 0
    }));

    return list.sort((a, b) => b.count - a.count).slice(0, 5);
  }, [events]);

  // Global Chart Styles
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#a3a3a3',
          font: { weight: '600', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: '#171717',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: '#ffffff',
        bodyColor: '#a3a3a3'
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#737373', font: { size: 10 } }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.03)' },
        ticks: { color: '#737373', font: { size: 10 }, stepSize: 1 }
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      
      {/* 1. Quick Stats Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <Card className="p-6 rounded-2xl flex items-center justify-between border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Total Views</span>
            <span className="text-3xl font-black text-white">{summary.views.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/5 border border-purple-500/10 flex items-center justify-center text-purple-400">
            <Eye className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-6 rounded-2xl flex items-center justify-between border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Total Downloads</span>
            <span className="text-3xl font-black text-emerald-400">{summary.downloads.toLocaleString()}</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400">
            <Download className="w-6 h-6" />
          </div>
        </Card>

        <Card className="p-6 rounded-2xl flex items-center justify-between border border-white/5">
          <div className="flex flex-col gap-1">
            <span className="text-neutral-500 text-xs font-bold uppercase tracking-wider">Conversion Ratio</span>
            <span className="text-3xl font-black text-pink-400">{summary.conversion}%</span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-pink-500/5 border border-pink-500/10 flex items-center justify-center text-pink-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* 2. Visual Graphs Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trend Lines Chart */}
        <Card className="lg:col-span-2 p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <CardHeader className="p-0 border-0 flex flex-col gap-0.5">
            <CardTitle className="font-bold text-white text-sm tracking-wide">Daily Conversion Trends</CardTitle>
            <CardDescription className="text-neutral-500 text-xxs">Telemetry metrics logs for views and downloads compiled over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="h-64 relative w-full p-0">
            {events.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                No activity logs recorded to compile trends.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Distribution Chart */}
        <Card className="p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <CardHeader className="p-0 border-0 flex flex-col gap-0.5">
            <CardTitle className="font-bold text-white text-sm tracking-wide flex items-center gap-1.5">
              <Monitor className="w-4 h-4 text-purple-400" />
              <span>Devices Categories</span>
            </CardTitle>
            <CardDescription className="text-neutral-500 text-xxs">Participant device agent parameters parsed dynamically</CardDescription>
          </CardHeader>
          <CardContent className="h-64 relative w-full p-0">
            {events.length > 0 ? (
              <Bar data={deviceChartData} options={chartOptions} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-600">
                No telemetry data to compile device models.
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* 3. Locale Breakdown Table */}
      {events.length > 0 && topLocales.length > 0 && (
        <Card className="p-6 rounded-2xl border border-white/5 flex flex-col gap-4">
          <CardHeader className="p-0 border-0 flex flex-col gap-0.5">
            <CardTitle className="font-bold text-white text-sm tracking-wide">Top User Locales</CardTitle>
            <CardDescription className="text-neutral-500 text-xxs">Demographics based on browser timezone settings and language configurations</CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-3 p-0">
            {topLocales.map((loc, idx) => (
              <div key={loc.locale} className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-white/5 border border-white/10 flex items-center justify-center font-bold text-xxs text-neutral-400">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-neutral-300 font-semibold">{loc.locale}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400">
                    <span className="font-bold text-white">{loc.count}</span>
                    <span>({loc.percent}%)</span>
                  </div>
                </div>
                {/* Visual Progress Bar */}
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" 
                    style={{ width: `${loc.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
