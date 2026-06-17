import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SystemFooter } from "@/components/SystemFooter";
import { ManualView } from "@/components/dashboard/ManualView";
import { useNavigate, Link } from "react-router-dom";
import { Newspaper, Bell } from "lucide-react";
import { useSystem } from "@/hooks/useSystem";
import { SubscriberCapture } from "@/components/portal/SubscriberCapture";
import { motion } from "framer-motion";


export default function ManualPage() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab="" 
        setActiveTab={() => navigate("/dashboard")} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className={`flex-1 transition-all duration-300 min-w-0 flex flex-col min-h-screen ${isSidebarCollapsed ? "md:pl-20" : "md:pl-64"}`}>
        <Header onNotificationsClick={() => {}} onNavigate={() => {}} />
        <main className="p-4 md:p-8 flex-1">
          <ManualView />
        </main>
        <SystemFooter />
      </div>
    </div>
  );
}
