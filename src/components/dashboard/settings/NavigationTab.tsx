import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GripVertical, Save, Plus, Shield, Check } from "lucide-react";
import { motion, Reorder } from "framer-motion";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { useSystem } from "@/contexts/SystemContext";

const AVAILABLE_ROLES = [
  { id: 'admin_master', label: 'Master' },
  { id: 'dev_master', label: 'Dev' },
  { id: 'editor', label: 'Editor' },
  { id: 'user', label: 'Usuário' }
];

export const NavigationTab = () => {
  const { toast } = useToast();
  const [navItems, setNavItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLink, setNewLink] = useState({ value: '', key: '' });
  const { refreshSettings } = useSystem();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('*')
        .eq('group', 'navigation')
        .order('order_index');
      
      if (error) throw error;
      
      const rows = (data || []) as any[];
      
      // DEDUPLICATION: Ensure unique keys
      const uniqueNav = new Map();
      rows.forEach(item => {
        if (!uniqueNav.has(item.key)) uniqueNav.set(item.key, item);
      });

      const navItemsFinal = Array.from(uniqueNav.values()).map(item => ({
        ...item,
        allowed_roles: item.allowed_roles || ['admin_master', 'dev_master', 'editor', 'user']
      }));

      setNavItems(navItemsFinal);
    } catch(e) {
      console.error("Error fetching navigation:", e);
    } finally {
      setLoading(false);
    }
  };

  const saveOrder = async (items = navItems) => {
    setLoading(true);
    try {
      // Prepare batch update
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const payload = {
          order_index: i,
          allowed_roles: item.allowed_roles,
          value: item.value,
          active: item.active !== false
        };
        
        await supabase
          .from('system_settings' as any)
          .update(payload)
          .eq('id', item.id);
      }
      
      toast({ title: "Navegação Atualizada", description: "A nova ordem e permissões foram salvas." });
      if (refreshSettings) refreshSettings();
    } catch(e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewLink = async () => {
    if (!newLink.value || !newLink.key) {
      toast({ title: "Erro", description: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        key: newLink.key.toLowerCase().replace(/\s+/g, '_'),
        value: newLink.value,
        group: 'navigation',
        active: true,
        order_index: navItems.length,
        allowed_roles: ['admin_master', 'dev_master', 'editor', 'user']
      };
      
      const { error } = await supabase.from('system_settings' as any).insert([payload]);
      if (error) throw error;

      toast({ title: "Link Adicionado", description: "O novo item foi criado com sucesso." });
      setIsAddModalOpen(false);
      setNewLink({ value: '', key: '' });
      fetchData();
      if (refreshSettings) refreshSettings();
    } catch(e) {
      toast({ title: "Erro ao criar", description: "Verifique se a chave já existe.", variant: "destructive" });
    }
  };

  const updateNavItem = (index: number, changes: any) => {
    const newItems = [...navItems];
    newItems[index] = { ...newItems[index], ...changes };
    setNavItems(newItems);
  };

  const toggleRole = (itemIndex: number, roleId: string) => {
    const item = navItems[itemIndex];
    const roles = item.allowed_roles || [];
    const newRoles = roles.includes(roleId) 
      ? roles.filter((r: string) => r !== roleId)
      : [...roles, roleId];
    
    updateNavItem(itemIndex, { allowed_roles: newRoles });
  };

  if (loading && navItems.length === 0) {
    return <div className="p-8 text-center text-muted-foreground">Carregando navegação...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-background/50 p-4 rounded-2xl border border-border/40">
        <div>
          <h2 className="font-display font-bold text-xl text-primary flex items-center gap-2">
            <GripVertical className="w-5 h-5" /> Estrutura de Navegação
          </h2>
          <p className="text-muted-foreground text-xs mt-1">Arraste para reordenar e defina quem pode ver cada item do menu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 px-4 font-bold border-primary/20 text-primary hover:bg-primary/5" onClick={() => setIsAddModalOpen(true)}>
             <Plus className="w-4 h-4 mr-2" /> Novo Link
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground h-9 px-6 font-bold shadow-lg hover:bg-primary/90" onClick={() => saveOrder()} disabled={loading}>
            <Save className="w-4 h-4 mr-2"/> Salvar Alterações
          </Button>
        </div>
      </div>

      <Reorder.Group axis="y" values={navItems} onReorder={setNavItems} className="space-y-3">
        {navItems.map((item, index) => (
          <Reorder.Item 
            key={item.id || item.key} 
            value={item}
            className="p-4 bg-background/40 backdrop-blur-sm border border-border rounded-xl flex items-center gap-4 group hover:border-primary/30 transition-all cursor-grab active:cursor-grabbing"
          >
            <div className="text-muted-foreground group-hover:text-primary transition-colors">
              <GripVertical className="w-5 h-5" />
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{item.key}</p>
                <Input 
                  value={item.value} 
                  onChange={(e) => updateNavItem(index, { value: e.target.value })}
                  className="h-8 bg-transparent border-none p-0 focus-visible:ring-0 font-bold text-sm"
                />
              </div>

              <div className="flex flex-wrap gap-1 content-center">
                {AVAILABLE_ROLES.map(role => (
                   <div 
                    key={role.id}
                    onClick={() => toggleRole(index, role.id)}
                    className={`
                      px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all border
                      ${item.allowed_roles?.includes(role.id) 
                        ? 'bg-primary/10 border-primary/30 text-primary shadow-sm' 
                        : 'bg-muted/30 border-transparent text-muted-foreground opacity-40 hover:opacity-100'}
                    `}
                   >
                     {role.label}
                   </div>
                ))}
              </div>

              <div className="flex justify-end items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground">{item.active !== false ? 'Ativo' : 'Oculto'}</span>
                  <Switch 
                    checked={item.active !== false} 
                    onCheckedChange={(checked) => updateNavItem(index, { active: checked })}
                  />
                </div>
              </div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      {/* ADICIONAR LINK DIALOG */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Link de Navegação</DialogTitle>
            <DialogDescription>
              Adicione um novo item ao menu lateral do sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome do Menu</Label>
              <Input 
                placeholder="Ex: Minha Nova Página" 
                value={newLink.value}
                onChange={(e) => setNewLink({ ...newLink, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>ID Único (Chave Técnica)</Label>
              <Input 
                placeholder="Ex: my_new_page" 
                value={newLink.key}
                onChange={(e) => setNewLink({ ...newLink, key: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddNewLink}>Adicionar Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
