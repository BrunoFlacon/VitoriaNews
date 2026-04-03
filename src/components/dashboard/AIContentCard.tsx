import { Sparkles, Copy, Check, MousePointer2 } from "lucide-react";
import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface AIContentCardProps {
  topic: string;
  generatedContent: string;
  onEdit?: () => void;
  onApprove?: () => void;
}

export const AIContentCard = ({ topic, generatedContent, onEdit, onApprove }: AIContentCardProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    toast({ title: "Copiado para a área de transferência" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Card className="bg-gradient-to-br from-indigo-500/5 to-purple-500/10 border-indigo-500/20 hover:border-indigo-500/40 transition-all group shadow-lg shadow-indigo-500/5">
      <CardHeader className="pb-3 border-b border-indigo-500/10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
            </div>
            <CardTitle className="text-sm font-black text-indigo-100 uppercase tracking-tight">IA Sugestão para: {topic}</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-black border-indigo-500/30 text-indigo-300">Inteligente</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="bg-black/20 rounded-xl p-4 border border-white/5 relative group-hover:bg-black/30 transition-all">
          <p className="text-sm text-indigo-50/90 leading-relaxed italic line-clamp-4">
            "{generatedContent}"
          </p>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 justify-end pt-2">
        <Button variant="ghost" size="sm" className="text-xs font-bold uppercase tracking-widest hover:bg-white/5" onClick={onEdit}>
          Editar
        </Button>
        <Button size="sm" className="text-xs font-bold uppercase tracking-widest bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20" onClick={onApprove}>
          <MousePointer2 className="w-3 h-3 mr-2" />
          Aprovar
        </Button>
      </CardFooter>
    </Card>
  );
};
