import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Plus, Save, Check, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

const AVAILABLE_ROLES = [
  { id: 'admin_master', label: 'Master' },
  { id: 'dev_master', label: 'Dev' },
  { id: 'editor', label: 'Editor' },
  { id: 'user', label: 'Usuário' }
];

export const PermissionsTab = () => {
  const { toast } = useToast();
  const [sectionPerms, setSectionPerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSection, setNewSection] = useState({ value: '', key: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings' as any)
        .select('*')
        .eq('group', 'permissions');
      
      const rows = (data || []) as any[];

      const defaultSections = [
        { key: 'sec_identity', value: 'Identidade Visual' },
        { key: 'sec_users', value: 'Gestão de Usuários' },
        { key: 'sec_navigation', value: 'Config. Menus' },
        { key: 'sec_internal_rbac', value: 'Permissões Internas' },
        { key: 'sec_theme', value: 'Estúdio de Temas' },
        { key: 'sec_cms', value: 'Páginas & Blocos' },
        { key: 'sec_footer', value: 'Config. Rodapé' },
      ];

      const mergedPerms = defaultSections.map(def => {
        const existing = rows.find((p: any) => p.key === def.key);
        return existing ? { ...existing } : { ...def, group: 'permissions', allowed_roles: ['admin_master', 'dev_master'] };
      });

      // Add custom sections that are not in defaults
      const customSections = rows.filter(r => !defaultSections.some(def => def.key === r.key));
      
      setSectionPerms([...mergedPerms, ...customSections]);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveAll = async () => {
    setLoading(true);
    try {
      for (const perm of sectionPerms) {
        const payload = {
          key: perm.key,
          value: perm.value,
          group: 'permissions',
          allowed_roles: perm.allowed_roles || ['admin_master', 'dev_master']
        };
        if (perm.id) await supabase.from('system_settings' as any).update(payload).eq('id', perm.id);
        else await supabase.from('system_settings' as any).insert([payload]);
      }

      toast({ title: "Permissões Salvas", description: "O controle de acesso interno foi atualizado." });
      fetchData();
    } catch(e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewSection = async () => {
    if (!newSection.value || !newSection.key) {
      toast({ title: "Erro", description: "Preencha o nome e a chave técnica.", variant: "destructive" });
      return;
    }

    try {
      const payload = {
        key: newSection.key.toLowerCase().startsWith('sec_') ? newSection.key : `sec_${newSection.key.toLowerCase().replace(/\s+/g, '_')}`,
        value: newSection.value,
        group: 'permissions',
        allowed_roles: ['admin_master', 'dev_master']
      };
      
      const { error } = await supabase.from('system_settings' as any).insert([payload]);
      if (error) throw error;

      toast({ title: "Sessão Criada", description: "Agora você pode definir as permissões para ela." });
      setIsAddModalOpen(false);
      setNewSection({ value: '', key: '' });
      fetchData();
    } catch(e) {
      toast({ title: "Erro ao criar", description: "Verifique se a chave já existe.", variant: "destructive" });
    }
  };

  const toggleRole = (itemIndex: number, roleId: string) => {
    const newList = [...sectionPerms];
    const roles = newList[itemIndex].allowed_roles || [];
    const newRoles = roles.includes(roleId) 
      ? roles.filter((r: string) => r !== roleId)
      : [...roles, roleId];
    
    newList[itemIndex] = { ...newList[itemIndex], allowed_roles: newRoles };
    setSectionPerms(newList);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-background/50 p-4 rounded-2xl border border-border/40">
        <div>
          <h2 className="font-display font-bold text-xl text-primary flex items-center gap-2">
            <Lock className="w-5 h-5" /> Controle de Acessos Internos (RBAC)
          </h2>
          <p className="text-muted-foreground text-xs mt-1">Determine quais cargos podem ver ou editar seções específicas do dashboard</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 px-4 font-bold border-primary/20 text-primary hover:bg-primary/5" onClick={() => setIsAddModalOpen(true)}>
             <Plus className="w-4 h-4 mr-2" /> Nova Seção/Módulo
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground h-9 px-6 font-bold shadow-lg" onClick={saveAll} disabled={loading}>
            <Save className="w-4 h-4 mr-2"/> Salvar Permissões
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sectionPerms.map((perm, idx) => (
          <motion.div 
            key={perm.key} 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
            className="p-5 rounded-2xl border border-border bg-background/60 shadow-sm flex flex-col gap-4 hover:border-primary/30 transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm group-hover:text-primary transition-colors">{perm.value}</span>
              <Shield className="w-4 h-4 text-primary/60" />
            </div>
            
            <div className="flex flex-wrap gap-1.5 min-h-[60px] content-start">
              {AVAILABLE_ROLES.map(role => (
                <Badge 
                  key={role.id} 
                  variant={perm.allowed_roles?.includes(role.id) ? "default" : "outline"}
                  className={`cursor-pointer transition-all py-1 px-2.5 text-[10px] ${perm.allowed_roles?.includes(role.id) ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/20' : 'opacity-40 hover:opacity-100'}`}
                  onClick={() => toggleRole(idx, role.id)}
                >
                  {perm.allowed_roles?.includes(role.id) && <Check className="w-2.5 h-2.5 mr-1" />}
                  {role.label}
                </Badge>
              ))}
            </div>
            
            <div className="pt-2 border-t border-border/40 flex justify-between items-center">
              <span className="text-[10px] text-muted-foreground font-mono opacity-50">CHAVE: {perm.key}</span>
              {perm.key.startsWith('sec_') === false && (
                <Badge variant="outline" className="text-[9px] bg-amber-500/5 text-amber-500 border-amber-500/20">Custom</Badge>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* NOVO MÓDULO DIALOG */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Seção ou Módulo Interno</DialogTitle>
            <DialogDescription>
              Crie uma nova chave de permissão para restringir o acesso a partes específicas do seu dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Amigável (Ex: Gestão de Leads)</Label>
              <Input 
                placeholder="Ex: Minha Nova Sessão" 
                value={newSection.value}
                onChange={(e) => setNewSection({ ...newSection, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Chave Técnica (Slug único)</Label>
              <Input 
                placeholder="Ex: leads_management" 
                value={newSection.key}
                onChange={(e) => setNewSection({ ...newSection, key: e.target.value })}
              />
              <p className="text-[10px] text-muted-foreground italic">
                * O prefixo 'sec_' será adicionado automaticamente se não houver.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddNewSection}>Criar Seção</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
