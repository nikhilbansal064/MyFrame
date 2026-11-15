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
import { Card, CardTitle, CardDescription } from '@/components/ui/card';

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

function EmptyChart({ children }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/[0.08] text-sm text-neutral-500 text-center px-6">
      {children}
    </div>
  );
}

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
          pointRadius: 3,
          pointHoverRadius: 5,
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
          pointRadius: 3,
          pointHoverRadius: 5,
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
        align: 'end',
        labels: {
          color: '#a3a3a3',
          boxWidth: 8,
          boxHeight: 8,
          usePointStyle: true,
          pointStyle: 'circle',
          padding: 16,
          font: { weight: '500', size: 12 }
        }
      },
      tooltip: {
        backgroundColor: '#0a0a0a',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        titleColor: '#ffffff',
        bodyColor: '#d4d4d4'
      }
    },
    scales: {
      x: {
        grid: { display: false },
        border: { display: false },
        ticks: { color: '#737373', font: { size: 11 } }
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        border: { display: false },
        ticks: { color: '#737373', font: { size: 11 }, precision: 0, padding: 8 }
      }
    }
  };

  const summaryTiles = [
    { label: 'Total Views', value: summary.views.toLocaleString(), icon: Eye, tone: 'text-sky-300 bg-sky-500/10' },
    { label: 'Total Downloads', value: summary.downloads.toLocaleString(), icon: Download, tone: 'text-emerald-300 bg-emerald-500/10' },
    { label: 'Conversion Ratio', value: `${summary.conversion}%`, icon: TrendingUp, tone: 'text-pink-300 bg-pink-500/10' },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      
      {/* 1. Quick Stats Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {summaryTiles.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="p-5 flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">{label}</span>
              <span className="text-3xl font-semibold tracking-tight text-white tabular-nums">{value}</span>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tone}`}>
              <Icon className="w-5 h-5" />
            </div>
          </Card>
        ))}
      </div>

      {/* 2. Visual Graphs Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* Trend Lines Chart */}
        <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <CardTitle>Daily Trends</CardTitle>
            <CardDescription>Views and downloads over the last 7 days</CardDescription>
          </div>
          <div className="h-64 relative w-full">
            {events.length > 0 ? (
              <Line data={lineChartData} options={chartOptions} />
            ) : (
              <EmptyChart>
                <TrendingUp className="w-5 h-5 text-neutral-600" />
                No activity recorded yet.
              </EmptyChart>
            )}
          </div>
        </Card>

        {/* Device Distribution Chart */}
        <Card className="p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-4 h-4 text-purple-300" />
              <span>Devices</span>
            </CardTitle>
            <CardDescription>Participant device types</CardDescription>
          </div>
          <div className="h-64 relative w-full">
            {events.length > 0 ? (
              <Bar data={deviceChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
            ) : (
              <EmptyChart>
                <Monitor className="w-5 h-5 text-neutral-600" />
                No device data yet.
              </EmptyChart>
            )}
          </div>
        </Card>

      </div>

      {/* 3. Locale Breakdown Table */}
      {events.length > 0 && topLocales.length > 0 && (
        <Card className="p-5 sm:p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <CardTitle>Top Locales</CardTitle>
            <CardDescription>Based on browser language and timezone settings</CardDescription>
          </div>
          
          <div className="flex flex-col gap-4">
            {topLocales.map((loc, idx) => (
              <div key={loc.locale} className="flex flex-col gap-2">
                <div className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-md bg-white/[0.06] flex items-center justify-center text-xs font-medium text-neutral-400 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="font-mono text-neutral-200">{loc.locale}</span>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-500 tabular-nums">
                    <span className="font-semibold text-white">{loc.count}</span>
                    <span>({loc.percent}%)</span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full" 
                    style={{ width: `${loc.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
