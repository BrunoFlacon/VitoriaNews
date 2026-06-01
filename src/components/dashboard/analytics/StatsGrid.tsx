import React from "react";
import { motion } from "framer-motion";
import { 
  Eye, 
  Heart, 
  Users, 
  Share2, 
  ArrowUpRight, 
  ArrowDownRight 
} from "lucide-react";

interface StatsGridProps {
  engagement: {
    views: number;
    likes: number;
    comments: number;
    reach: number;
    shares: number;
    growth: string;
  };
  overview: {
    totalPosts: number;
    publishedPosts: number;
    scheduledPosts: number;
    draftPosts: number;
    failedPosts: number;
    publishRate: number;
  };
  messageStats?: {
    totalSent: number;
    totalFailed: number;
  };
}

export const StatsGrid = ({ engagement, overview, messageStats }: StatsGridProps) => {
  const renderTrend = (value: string | number | undefined | null) => {
    if (value === undefined || value === null) return null;
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return null;
    const isPositive = numValue > 0;
    const isNeutral = numValue === 0;

    return (
      <div className={`flex items-center text-[10px] font-black uppercase tracking-widest space-x-1 px-2.5 py-1 rounded-full ${
        isNeutral ? "bg-white/5 text-muted-foreground" : 
        isPositive ? "bg-green-500/10 text-green-400 border border-green-500/10" : "bg-red-500/10 text-red-400 border border-red-500/10"
      }`}>
        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : !isNeutral && <ArrowDownRight className="w-3 h-3" />}
        <span>{numValue > 0 ? "+" : ""}{numValue}%</span>
      </div>
    );
  };

  const topStats = [
    { label: "Visualizações", value: engagement.views, icon: Eye, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Engajamento", value: engagement.likes + engagement.comments, icon: Heart, color: "text-purple-400", bg: "bg-purple-500/10" },
    { label: "Alcance", value: engagement.reach, icon: Users, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Compartilhados", value: engagement.shares, icon: Share2, color: "text-orange-400", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {topStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="p-4 md:p-6 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col hover:border-primary/40 transition-all group"
          >
            <div className="flex justify-between items-start mb-4 md:mb-6">
              <div className={`p-2 md:p-3 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-4 h-4 md:w-6 md:h-6 ${stat.color}`} />
              </div>
              {renderTrend(engagement.growth)}
            </div>
            <div>
              <h3 className="text-2xl md:text-4xl font-black font-display tracking-tighter text-foreground mb-0.5 md:mb-1">
                {(stat.value || 0).toLocaleString()}
              </h3>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>


      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {[
          { label: "Posts", val: overview.totalPosts, color: "text-primary" },
          { label: "Publicados", val: overview.publishedPosts, color: "text-green-400" },
          { label: "Agendados", val: overview.scheduledPosts, color: "text-blue-400" },
          { label: "Rascunhos", val: overview.draftPosts, color: "text-yellow-400" },
          { label: "Falhas", val: overview.failedPosts, color: "text-red-400" },
          { label: "Msgs OK", val: messageStats?.totalSent || 0, color: "text-indigo-400" },
          { label: "Msgs Erro", val: messageStats?.totalFailed || 0, color: "text-red-600" },
          { label: "Sucesso", val: `${overview.publishRate}%`, color: "text-primary" },
        ].map((item, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + (i * 0.05) }}
            className="p-4 rounded-xl bg-white/5 border border-white/5 text-center flex flex-col justify-center backdrop-blur-sm hover:bg-white/10 transition-colors"
          >
            <p className="text-[9px] font-black uppercase tracking-widest mb-2 opacity-50">{item.label}</p>
            <p className={`text-xl font-black tracking-tighter ${item.color}`}>{item.val}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
