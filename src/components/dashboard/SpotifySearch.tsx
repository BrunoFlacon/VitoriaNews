import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Music, X, Loader2, Play, Pause, Headphones, Disc, TrendingUp, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SpotifySearchProps {
  onSelect: (track: { name: string; artist: string; url: string; image: string }) => void;
  onClose: () => void;
}

export const SpotifySearch = ({ onSelect, onClose }: SpotifySearchProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Dados demonstrativos — imagens de capas via fontes públicas abertas (sem token)
  const mockTracks = [
    { id: "1", name: "Stay With Me", artist: "Sam Smith", image: "https://upload.wikimedia.org/wikipedia/en/e/ef/Sam_Smith_-_In_the_Lonely_Hour.png", url: "https://open.spotify.com/track/5Nm9ERjZ9Z6O8G90IqOq4M" },
    { id: "2", name: "Blinding Lights", artist: "The Weeknd", image: "https://upload.wikimedia.org/wikipedia/en/e/e6/The_Weeknd_-_Blinding_Lights.png", url: "https://open.spotify.com/track/0VjIj9H9t3YvWpSTU4kYsy" },
    { id: "3", name: "Flowers", artist: "Miley Cyrus", image: "https://upload.wikimedia.org/wikipedia/en/9/97/Miley_Cyrus_-_Flowers.png", url: "https://open.spotify.com/track/0y9u89S9u5Y25I3Z8Vv6P9" },
    { id: "4", name: "As It Was", artist: "Harry Styles", image: "https://upload.wikimedia.org/wikipedia/en/b/b4/Harry_Styles_-_As_It_Was.png", url: "https://open.spotify.com/track/4D796T9G0QY6V6I0Vp6o9M" },
    { id: "5", name: "Cruel Summer", artist: "Taylor Swift", image: "https://upload.wikimedia.org/wikipedia/en/9/9f/Lover_album_cover.jpg", url: "https://open.spotify.com/track/1BxfuISMvbi6f0Ycnba6mE" },
    { id: "6", name: "Anti-Hero", artist: "Taylor Swift", image: "https://upload.wikimedia.org/wikipedia/en/6/6a/Midnights_-_Taylor_Swift.png", url: "https://open.spotify.com/track/0V3wNcy0pduRS896L68zG2" },
  ];

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) {
      setResults(mockTracks);
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const filtered = mockTracks.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.artist.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setResults(filtered);
      setLoading(false);
    }, 800);
  };

  useEffect(() => {
    setResults(mockTracks);
  }, []);

  return (
    <div className="flex flex-col h-[550px] w-full bg-[#121212] border border-[#282828] rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="p-5 border-b border-[#282828] flex items-center justify-between bg-[#181818]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg shadow-[#1DB954]/20">
            <Music className="w-6 h-6 text-black" />
          </div>
          <div>
            <h3 className="font-display font-bold text-lg tracking-tight text-white">Spotify Music</h3>
            <p className="text-[10px] text-[#b3b3b3] uppercase font-bold tracking-widest opacity-70">Search and Attach</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-9 w-9 rounded-full text-[#b3b3b3] hover:text-white hover:bg-[#282828]">
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="p-5 space-y-5 flex-1 flex flex-col min-h-0">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative group">
          <div className="absolute inset-0 bg-[#1DB954]/5 rounded-full blur-xl group-focus-within:bg-[#1DB954]/10 transition-all duration-500" />
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#b3b3b3] group-focus-within:text-[#1DB954] transition-colors" />
            <Input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                if (!e.target.value) setResults(mockTracks);
              }}
              placeholder="What do you want to listen to?"
              className="pl-13 h-12 bg-[#242424] border-none rounded-full text-white placeholder:text-[#7f7f7f] focus-visible:ring-[#1DB954]/30"
            />
          </div>
        </form>

        {/* Results Area */}
        <ScrollArea className="flex-1 -mr-2 pr-4">
          <div className="pb-4">
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                {searchTerm ? (
                  <Disc className="w-5 h-5 text-[#1DB954]" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-[#1DB954]" />
                )}
                <span className="text-sm font-black uppercase tracking-tighter text-[#b3b3b3]">{searchTerm ? 'Top Results' : 'Recently Trending'}</span>
              </div>
              <Badge variant="outline" className="text-[#1DB954] border-[#1DB954]/30 bg-[#1DB954]/5">Verified</Badge>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-[#1DB954]" />
                <p className="text-sm font-medium text-[#b3b3b3] animate-pulse">Scanning the library...</p>
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-1">
                {results.map((track, i) => (
                  <motion.div 
                    key={track.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="group flex items-center gap-4 p-2 rounded-xl hover:bg-[#2a2a2a] transition-all cursor-pointer"
                    onClick={() => onSelect(track)}
                  >
                    <div className="relative w-12 h-12 shrink-0">
                      <img 
                        src={track.image} 
                        alt={track.name} 
                        className="w-full h-full object-cover rounded-md shadow-lg"
                        onError={(e) => { 
                          const t = e.target as HTMLImageElement; 
                          if (!t.dataset.fallback) { t.dataset.fallback='true'; t.src='https://picsum.photos/seed/'+track.id+'/48/48'; }
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Play className="w-5 h-5 text-white fill-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-white truncate group-hover:text-[#1DB954] transition-colors">{track.name}</h4>
                      <p className="text-xs text-[#b3b3b3] truncate">{track.artist}</p>
                    </div>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="secondary" className="h-8 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-[11px] px-4">
                        Attach
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-[#282828] rounded-full flex items-center justify-center mb-4">
                  <Headphones className="w-8 h-8 text-[#535353]" />
                </div>
                <p className="text-lg font-bold text-white">No tracks found</p>
                <p className="text-sm text-[#b3b3b3] max-w-[200px] mx-auto mt-1">Try another search or browse trending songs.</p>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer Info */}
        <div className="pt-2 border-t border-[#282828] flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-[#1DB954]" />
          <p className="text-[10px] text-[#b3b3b3] font-medium">Attach music to increase your post engagement by up to 24%.</p>
        </div>
      </div>
    </div>
  );
};
