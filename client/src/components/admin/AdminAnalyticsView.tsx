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
      <div className="flex-1 flex items-center justify-center bg-[#efeae2] dark:bg-[#0b141a] text-[#8696a0]">
        <div className="animate-spin w-8 h-8 border-2 border-[#00a884] border-t-transparent rounded-full" />
      </div>
    );
  }

  const { metrics, chartData } = data;

  return (
    <div className="flex-1 bg-[#efeae2] dark:bg-[#0b141a] p-6 lg:p-8 overflow-y-auto space-y-6 text-[#111b21] dark:text-[#e9edef] transition-colors duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#111b21] dark:text-[#e9edef] flex items-center gap-2">
            Support Insights & Analytics
          </h1>
          <p className="text-xs text-[#667781] dark:text-[#8696a0] mt-1 font-medium">Real-time WhatsApp customer metrics, resolution speed, and team performance</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/90 dark:bg-[#202c33]/90 backdrop-blur-2xl p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-all hover:scale-[1.01]">
          <div>
            <p className="text-[11px] text-[#667781] dark:text-[#8696a0] font-semibold uppercase tracking-wider">Total Customers</p>
            <h2 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] mt-1">{metrics.totalCustomers}</h2>
            <span className="text-[11px] text-[#00a884] font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3.5 h-3.5" /> +12.4% this week
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#00a884]/15 text-[#00a884] flex items-center justify-center shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 dark:bg-[#202c33]/90 backdrop-blur-2xl p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-all hover:scale-[1.01]">
          <div>
            <p className="text-[11px] text-[#667781] dark:text-[#8696a0] font-semibold uppercase tracking-wider">Active Chats</p>
            <h2 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] mt-1">{metrics.openChats + metrics.pendingChats}</h2>
            <span className="text-[11px] text-[#00a884] font-medium mt-1 block">Open & In-Progress</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center shadow-2xs">
            <MessageSquare className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 dark:bg-[#202c33]/90 backdrop-blur-2xl p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-all hover:scale-[1.01]">
          <div>
            <p className="text-[11px] text-[#667781] dark:text-[#8696a0] font-semibold uppercase tracking-wider">Avg Response</p>
            <h2 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] mt-1">{metrics.avgResponseTimeSec}s</h2>
            <span className="text-[11px] text-[#00a884] font-medium mt-1 block">Fast SLA Response</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center shadow-2xs">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white/90 dark:bg-[#202c33]/90 backdrop-blur-2xl p-5 rounded-[22px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs flex items-center justify-between transition-all hover:scale-[1.01]">
          <div>
            <p className="text-[11px] text-[#667781] dark:text-[#8696a0] font-semibold uppercase tracking-wider">CSAT Rating</p>
            <h2 className="text-2xl font-bold text-[#111b21] dark:text-[#e9edef] mt-1">{metrics.csatScorePercentage}%</h2>
            <span className="text-[11px] text-purple-500 font-medium mt-1 block">Positive Feedback</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-500 flex items-center justify-center shadow-2xs">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Weekly Resolution Volume Apple Chart in WhatsApp Emerald */}
      <div className="bg-white/90 dark:bg-[#202c33]/90 backdrop-blur-2xl p-6 rounded-[24px] border border-black/[0.06] dark:border-white/[0.08] shadow-xs">
        <h3 className="text-sm font-bold text-[#111b21] dark:text-[#e9edef] mb-6">Weekly Ticket Resolution Volume</h3>
        <div className="flex items-end justify-between gap-4 h-52 pt-6 border-b border-black/[0.05] dark:border-white/[0.06] pb-3">
          {chartData.map((d) => (
            <div key={d.day} className="flex-1 flex flex-col items-center gap-2.5 group">
              <div className="w-full max-w-[48px] bg-black/[0.03] dark:bg-white/[0.04] rounded-2xl overflow-hidden flex flex-col justify-end h-full">
                <div
                  style={{ height: `${Math.max((d.resolved / 100) * 100, 12)}%` }}
                  className="w-full bg-gradient-to-t from-[#008f70] to-[#00a884] group-hover:brightness-110 transition-all rounded-2xl relative shadow-sm"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 dark:bg-white/90 text-white dark:text-black px-2.5 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap shadow-md pointer-events-none">
                    {d.resolved} Resolved
                  </span>
                </div>
              </div>
              <span className="text-xs text-[#86868b] font-medium">{d.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
