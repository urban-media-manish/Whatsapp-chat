import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { AnalyticsData } from '../../types';
import { Users, MessageSquare, Clock, Award, TrendingUp } from 'lucide-react';

export const AdminAnalyticsView: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await api.getAnalytics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#111b21] text-gray-400">
        <div className="animate-spin w-8 h-8 border-4 border-[#00a884] border-t-transparent rounded-full" />
      </div>
    );
  }

  const { metrics, chartData } = data;

  return (
    <div className="flex-1 bg-[#0b141a] p-6 overflow-y-auto space-y-6 text-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Support Analytics & Performance Dashboard
          </h1>
          <p className="text-xs text-gray-400 mt-1">Real-time metrics, customer satisfaction, and agent resolution KPIs</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#202c33] p-5 rounded-2xl border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Total Customers</p>
            <h2 className="text-2xl font-black text-white mt-1">{metrics.totalCustomers}</h2>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +12.4% this week
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-[#00a884] rounded-2xl">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#202c33] p-5 rounded-2xl border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Active Conversations</p>
            <h2 className="text-2xl font-black text-white mt-1">{metrics.openChats + metrics.pendingChats}</h2>
            <span className="text-[10px] text-sky-400 mt-1 block">Open & Pending Tickets</span>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-2xl">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#202c33] p-5 rounded-2xl border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">Avg Response Time</p>
            <h2 className="text-2xl font-black text-white mt-1">{metrics.avgResponseTimeSec} sec</h2>
            <span className="text-[10px] text-emerald-400 mt-1 block">Sub-3 min resolution</span>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#202c33] p-5 rounded-2xl border border-gray-800 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase">CSAT Score</p>
            <h2 className="text-2xl font-black text-white mt-1">{metrics.csatScorePercentage}%</h2>
            <span className="text-[10px] text-emerald-400 mt-1 block">Based on user feedback</span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Weekly Resolution Volume Bar Graph */}
      <div className="bg-[#202c33] p-6 rounded-2xl border border-gray-800 shadow-lg">
        <h3 className="text-sm font-bold text-gray-200 mb-4">Weekly Ticket Resolution Volume</h3>
        <div className="flex items-end justify-between gap-4 h-48 pt-6 border-b border-gray-700/60 pb-2">
          {chartData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2 group">
              <div className="w-full bg-[#111b21] rounded-t-xl overflow-hidden flex flex-col justify-end h-full">
                <div
                  style={{ height: `${(d.resolved / 100) * 100}%` }}
                  className="w-full bg-[#00a884] group-hover:bg-[#008f70] transition-all rounded-t-lg relative"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 left-1/2 -translate-x-1/2 bg-black px-2 py-0.5 rounded text-[10px] font-bold text-white whitespace-nowrap">
                    {d.resolved} Resolved
                  </span>
                </div>
              </div>
              <span className="text-xs text-gray-400 font-medium">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
