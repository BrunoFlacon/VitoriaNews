import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FolderKanban, Plus, Search, Trash2, ArrowLeft, GripVertical, Check, Loader2,
  Calendar as CalendarIcon, Clock, Edit3, Send, Globe, Layout, ListTodo, Video, ExternalLink, FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePublisher } from "@/hooks/usePublisher";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { platformMetadata, socialPlatforms } from "@/components/icons/platform-metadata";

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ProjectModule {
  id: string;
  project_id: string;
  name: string;
  content: string | null;
  drive_link: string | null;
  is_recorded: boolean;
  order_index: number;
}

interface DraftPost {
  id: string;
  content: string;
  platforms: string[];
  media_ids: string[];
  media_type: string;
  status: string;
  created_at: string;
}

interface Task {
  id: string;
  project_id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: string;
  due_date: string | null;
  platforms: string[];
  published_post_id: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_COLUMNS = [
  { key: 'pending', label: 'Pendente', color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
  { key: 'in_progress', label: 'Em Andamento', color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
  { key: 'done', label: 'Concluído', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
];

const DRAFT_COLUMN = { key: 'drafts', label: 'Rascunhos', color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' };

const PUBLISH_PLATFORMS = [
  "instagram", "facebook", "twitter", "linkedin",
  "telegram", "whatsapp", "site"
] as const;

const PRIORITY_CONFIG = {
  low: { label: 'Baixa', color: 'bg-slate-500/20 text-slate-400' },
  medium: { label: 'Média', color: 'bg-blue-500/20 text-blue-400' },
  high: { label: 'Alta', color: 'bg-orange-500/20 text-orange-400' },
  urgent: { label: 'Urgente', color: 'bg-red-500/20 text-red-400' },
};

export const ProjectsView = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { publishNow, publishing } = usePublisher();
  const [publishingTaskId, setPublishingTaskId] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<ProjectModule[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [drafts, setDrafts] = useState<DraftPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  const [viewTab, setViewTab] = useState('modules');

  // Module dialog state
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false);
  const [moduleDialogName, setModuleDialogName] = useState('');
  const [editingModule, setEditingModule] = useState<ProjectModule | null>(null);

  // Task form state
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    status: 'pending' as string,
    due_date: null as string | null,
    platforms: [] as string[],
  });

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar projetos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const fetchTasks = async (projectId: string) => {
    try {
      setTasksLoading(true);
      setModulesLoading(true);
      const [tasksRes, modulesRes] = await Promise.all([
        (supabase as any)
          .from("tasks")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("project_modules")
          .select("*")
          .eq("project_id", projectId)
          .order("order_index", { ascending: true })
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setTasks(tasksRes.data || []);
      setModules(modulesRes.data || []);
    } catch (err: any) {
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
    } finally {
      setTasksLoading(false);
      setModulesLoading(false);
    }
  };

  const handleAddModule = async () => {
    if (!selectedProject) return;
    setEditingModule(null);
    setModuleDialogName('');
    setModuleDialogOpen(true);
  };

  const handleEditModule = async (module: ProjectModule) => {
    setEditingModule(module);
    setModuleDialogName(module.name);
    setModuleDialogOpen(true);
  };

  const handleSaveModule = async () => {
    if (!selectedProject || !moduleDialogName.trim()) return;
    try {
      if (editingModule) {
        const { error } = await (supabase as any)
          .from("project_modules")
          .update({ name: moduleDialogName.trim() })
          .eq("id", editingModule.id);
        if (error) throw error;
        setModules(prev => prev.map(m => m.id === editingModule.id ? { ...m, name: moduleDialogName.trim() } : m));
        toast({ title: "Módulo atualizado!" });
      } else {
        const { data, error } = await (supabase as any)
          .from("project_modules")
          .insert([{
            project_id: selectedProject.id,
            name: moduleDialogName.trim(),
            order_index: modules.length
          }])
          .select();
        if (error) throw error;
        setModules(prev => [...prev, ...data]);
        toast({ title: "Módulo adicionado!" });
      }
      setModuleDialogOpen(false);
      setEditingModule(null);
      setModuleDialogName('');
    } catch (err: any) {
      toast({ title: editingModule ? "Erro ao editar módulo" : "Erro ao adicionar módulo", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteModule = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este módulo?")) return;
    try {
      const { error } = await (supabase as any)
        .from("project_modules")
        .delete()
        .eq("id", id);
      if (error) throw error;
      setModules(prev => prev.filter(m => m.id !== id));
      toast({ title: "Módulo removido!" });
    } catch (err: any) {
      toast({ title: "Erro ao remover módulo", description: err.message, variant: "destructive" });
    }
  };

  const fetchDrafts = async () => {
    if (!user) return;
    setDraftsLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("scheduled_posts")
        .select("id, content, platforms, media_ids, media_type, status, created_at")
        .eq("user_id", user.id)
        .eq("status", "draft")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setDrafts(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar rascunhos:", err);
    } finally {
      setDraftsLoading(false);
    }
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setShowTaskForm(false);
    setEditingTask(null);
    fetchTasks(project.id);
    fetchDrafts();
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setTasks([]);
    setShowTaskForm(false);
    setEditingTask(null);
  };

  const handleSaveProject = async () => {
    if (!user || !newProject.name) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("projects")
        .insert([{ ...newProject, user_id: user.id }]);
      if (error) throw error;
      toast({ title: "Projeto Criado!" });
      setShowNewProject(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("projects").delete().eq("id", id);
      if (error) throw error;
      setProjects(projects.filter(p => p.id !== id));
      toast({ title: "Projeto Removido" });
      if (selectedProject?.id === id) handleBackToList();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const openTaskForm = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setTaskForm({
        title: task.title,
        description: task.description || '',
        priority: task.priority,
        status: task.status,
        due_date: task.due_date,
        platforms: task.platforms || [],
      });
    } else {
      setEditingTask(null);
      setTaskForm({ title: '', description: '', priority: 'medium', status: 'pending', due_date: null, platforms: [] });
    }
    setShowTaskForm(true);
    setViewTab('tasks');
  };

  const handleSaveTask = async () => {
    if (!user || !selectedProject || !taskForm.title) return;
    setSaving(true);
    try {
      const payload = {
        title: taskForm.title,
        description: taskForm.description,
        priority: taskForm.priority,
        status: taskForm.status,
        due_date: taskForm.due_date,
        platforms: taskForm.platforms,
      };
      if (editingTask) {
        const { error } = await (supabase as any)
          .from("tasks")
          .update(payload)
          .eq("id", editingTask.id);
        if (error) throw error;
        toast({ title: "Tarefa Atualizada!" });
      } else {
        const { error } = await (supabase as any)
          .from("tasks")
          .insert([{ ...payload, user_id: user.id, project_id: selectedProject.id }]);
        if (error) throw error;
        toast({ title: "Tarefa Criada!" });
      }
      setShowTaskForm(false);
      setEditingTask(null);
      fetchTasks(selectedProject.id);
    } catch (err: any) {
      toast({ title: "Erro ao salvar tarefa", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("tasks").delete().eq("id", id);
      if (error) throw error;
      setTasks(tasks.filter(t => t.id !== id));
      toast({ title: "Tarefa Removida" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const handleMoveTask = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", taskId);
      if (error) throw error;
      setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    } catch (err: any) {
      toast({ title: "Erro ao mover", description: err.message, variant: "destructive" });
    }
  };

  const handlePublishDraft = async (draft: DraftPost) => {
    if (!draft.platforms || draft.platforms.length === 0) {
      toast({ title: "Selecione plataformas", description: "Edite o post e escolha as plataformas.", variant: "destructive" });
      return;
    }
    setPublishingTaskId(draft.id);
    try {
      const { data: mediaItems } = await (supabase as any)
        .from("media")
        .select("file_url")
        .in("id", draft.media_ids);
      const mediaUrls = (mediaItems || []).map((m: any) => m.file_url);
      await publishNow(draft.content, draft.platforms, mediaUrls);
      await (supabase as any).from("scheduled_posts").update({ status: "published" }).eq("id", draft.id);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));
      toast({ title: "Rascunho publicado!" });
    } catch (err: any) {
      toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" });
    } finally {
      setPublishingTaskId(null);
    }
  };

  const convertDraftToTask = async (draft: DraftPost) => {
    if (!selectedProject || !user) return;
    try {
      const { error } = await (supabase as any)
        .from("tasks")
        .insert([{
          user_id: user.id,
          project_id: selectedProject.id,
          title: draft.content.slice(0, 100),
          description: draft.content.length > 100 ? draft.content : null,
          platforms: draft.platforms,
          status: "pending",
          priority: "medium",
        }]);
      if (error) throw error;

      // Remove o rascunho para não duplicar
      await (supabase as any).from("scheduled_posts").delete().eq("id", draft.id);
      setDrafts(prev => prev.filter(d => d.id !== draft.id));

      toast({ title: "Rascunho convertido em tarefa!" });
      fetchTasks(selectedProject.id);
    } catch (err: any) {
      toast({ title: "Erro ao converter", description: err.message, variant: "destructive" });
    }
  };

  const deleteDraft = async (id: string) => {
    try {
      await (supabase as any).from("scheduled_posts").delete().eq("id", id);
      setDrafts(prev => prev.filter(d => d.id !== id));
      toast({ title: "Rascunho removido" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const getTasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  const handlePublishTask = async (task: Task) => {
    if (!task.platforms || task.platforms.length === 0) {
      toast({ title: "Selecione plataformas", description: "Edite a tarefa e escolha as plataformas de publicação.", variant: "destructive" });
      return;
    }
    setPublishingTaskId(task.id);
    try {
      const content = `${task.title}${task.description ? `\n\n${task.description}` : ''}`;
      const postId = await publishNow(content, task.platforms);
      if (postId) {
        const { error } = await (supabase as any)
          .from("tasks")
          .update({ published_post_id: postId })
          .eq("id", task.id);
        if (error) console.error("Erro ao vincular post à tarefa:", error);
        setTasks(prev => prev.map(t => t.id === task.id ? { ...t, published_post_id: postId } : t));
        toast({ title: "Tarefa publicada!", description: "O conteúdo foi enviado para as plataformas selecionadas." });
      }
    } catch (err: any) {
      toast({ title: "Erro ao publicar", description: err.message, variant: "destructive" });
    } finally {
      setPublishingTaskId(null);
    }
  };

  if (selectedProject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBackToList}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-2xl font-display font-bold">{selectedProject.name}</h2>
              {selectedProject.description && (
                <p className="text-sm text-muted-foreground">{selectedProject.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => openTaskForm()} size="sm">
              <Plus className="w-4 h-4 mr-2" />Nova Tarefa
            </Button>
          </div>
        </div>

        <Tabs value={viewTab} onValueChange={setViewTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="modules" className="flex items-center gap-2">
              <Layout className="w-4 h-4" /> Módulos
            </TabsTrigger>
            <TabsTrigger value="tasks" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" /> Tarefas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="modules" className="space-y-4 pt-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Estrutura do Projeto</h3>
              <Button size="sm" variant="outline" onClick={() => handleAddModule()}>
                <Plus className="w-4 h-4 mr-2" />Adicionar Módulo
              </Button>
            </div>

            {modulesLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
            ) : modules.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed rounded-xl">
                <p className="text-muted-foreground">Nenhum módulo definido.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module, idx) => (
                  <Card key={module.id} className="glass-card border-border/40 overflow-hidden">
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="text-2xl font-bold opacity-20 w-8">{idx + 1}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{module.name}</h4>
                          {module.is_recorded && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              <Video className="w-3 h-3 mr-1" /> Gravado
                            </Badge>
                          )}
                        </div>
                        {module.content && <p className="text-sm text-muted-foreground line-clamp-1">{module.content}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        {module.drive_link && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                            <a href={module.drive_link} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditModule(module)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDeleteModule(module.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <Dialog open={moduleDialogOpen} onOpenChange={setModuleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingModule ? "Editar Módulo" : "Adicionar Módulo"}</DialogTitle>
                <DialogDescription>
                  {editingModule ? "Altere o nome do módulo." : "Defina um nome para o novo módulo."}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Input
                  value={moduleDialogName}
                  onChange={e => setModuleDialogName(e.target.value)}
                  placeholder="Nome do módulo"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveModule(); }}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setModuleDialogOpen(false); setEditingModule(null); }}>Cancelar</Button>
                <Button onClick={handleSaveModule} disabled={!moduleDialogName.trim()}>
                  <Check className="w-4 h-4 mr-2" />
                  {editingModule ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <TabsContent value="tasks" className="space-y-4 pt-4">
            {showTaskForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="glass-card border-primary/20">
              <CardHeader>
                <CardTitle>{editingTask ? "Editar Tarefa" : "Nova Tarefa"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Título da tarefa"
                  value={taskForm.title}
                  onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={taskForm.description}
                  onChange={e => setTaskForm({ ...taskForm, description: e.target.value })}
                  rows={3}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select
                      value={taskForm.priority}
                      onValueChange={(v: Task['priority']) => setTaskForm({ ...taskForm, priority: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={taskForm.status}
                      onValueChange={(v) => setTaskForm({ ...taskForm, status: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_COLUMNS.map(col => (
                          <SelectItem key={col.key} value={col.key}>{col.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Limite</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {taskForm.due_date ? format(new Date(taskForm.due_date), "dd/MM/yyyy", { locale: ptBR }) : "Definir data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={taskForm.due_date ? new Date(taskForm.due_date) : undefined}
                          onSelect={(date) => setTaskForm({ ...taskForm, due_date: date?.toISOString() || null })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Publicar nas plataformas</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PUBLISH_PLATFORMS.map(pid => {
                      const meta = platformMetadata[pid];
                      return (
                        <Button
                          key={pid}
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 gap-1.5 text-xs transition-all",
                            taskForm.platforms.includes(pid) && "border-primary bg-primary/10 text-primary"
                          )}
                          onClick={() => setTaskForm({
                            ...taskForm,
                            platforms: taskForm.platforms.includes(pid)
                              ? taskForm.platforms.filter(p => p !== pid)
                              : [...taskForm.platforms, pid]
                          })}
                        >
                          {meta ? <meta.icon className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                          {meta?.name || pid}
                        </Button>
                      );
                    })}
                  </div>
                  {taskForm.platforms.length === 0 && (
                    <p className="text-[10px] text-muted-foreground">Nenhuma plataforma selecionada — a tarefa não poderá ser publicada.</p>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setShowTaskForm(false); setEditingTask(null); }}>Cancelar</Button>
                <Button onClick={handleSaveTask} disabled={saving || !taskForm.title}>
                  {saving ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                  {editingTask ? "Atualizar" : "Criar Tarefa"}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}

        {tasksLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : tasks.length === 0 && !showTaskForm ? (
          <div className="py-20 text-center glass-card rounded-2xl border-dashed">
            <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
            <p className="text-muted-foreground">Nenhuma tarefa neste projeto.</p>
            <Button variant="outline" className="mt-4" onClick={() => openTaskForm()}>
              <Plus className="w-4 h-4 mr-2" />Criar Primeira Tarefa
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 min-h-[400px]">
            {STATUS_COLUMNS.map(column => (
              <div key={column.key} className="space-y-3">
                <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium", column.color)}>
                  <div className={cn("w-2 h-2 rounded-full", column.key === 'pending' ? 'bg-yellow-400' : column.key === 'in_progress' ? 'bg-blue-400' : 'bg-emerald-400')} />
                  {column.label}
                  <Badge variant="outline" className="ml-auto text-xs">{getTasksByStatus(column.key).length}</Badge>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  <AnimatePresence>
                    {getTasksByStatus(column.key).map(task => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Card className="glass-card border-border/40 hover:shadow-md transition-all cursor-pointer group">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{task.title}</p>
                                {task.description && (
                                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => openTaskForm(task)}>
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className={cn("text-[10px] px-1.5 py-0", PRIORITY_CONFIG[task.priority].color)}>
                                {PRIORITY_CONFIG[task.priority].label}
                              </Badge>
                              {task.due_date && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {format(new Date(task.due_date), "dd/MM", { locale: ptBR })}
                                </span>
                              )}
                            </div>
                            {column.key === 'pending' && (
                              <div className="flex gap-1 pt-1 border-t border-border/20">
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400" onClick={() => handleMoveTask(task.id, 'in_progress')}>
                                  Iniciar
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400" onClick={() => handleMoveTask(task.id, 'done')}>
                                  Concluir
                                </Button>
                              </div>
                            )}
                            {column.key === 'in_progress' && (
                              <div className="flex gap-1 pt-1 border-t border-border/20">
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-yellow-400" onClick={() => handleMoveTask(task.id, 'pending')}>
                                  Pausar
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-emerald-400" onClick={() => handleMoveTask(task.id, 'done')}>
                                  Concluir
                                </Button>
                              </div>
                            )}
                            {column.key === 'done' && (
                              <div className="flex flex-wrap gap-1 pt-1 border-t border-border/20">
                                {task.platforms && task.platforms.length > 0 && (
                                  <div className="flex flex-wrap gap-1 w-full mb-1">
                                    {task.platforms.map(pid => {
                                      const meta = platformMetadata[pid];
                                      return (
                                        <span key={pid} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                                          {meta ? <meta.icon className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                                          {meta?.name || pid}
                                        </span>
                                      );
                                    })}
                                  </div>
                                )}
                                <div className="flex gap-1 w-full">
                                  <Button variant="ghost" size="sm" className="h-6 text-[10px] text-yellow-400" onClick={() => handleMoveTask(task.id, 'pending')}>
                                    Reabrir
                                  </Button>
                                  {!task.published_post_id && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 text-[10px] text-emerald-400"
                                      onClick={() => handlePublishTask(task)}
                                      disabled={publishingTaskId === task.id}
                                    >
                                      {publishingTaskId === task.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                      ) : (
                                        <Send className="w-3 h-3 mr-1" />
                                      )}
                                      Publicar
                                    </Button>
                                  )}
                                  {task.published_post_id && (
                                    <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                                      <Check className="w-2.5 h-2.5 mr-0.5" /> Publicado
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ))}

            <div key="drafts" className="space-y-3">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium", DRAFT_COLUMN.color)}>
                <FileText className="w-3.5 h-3.5" />
                {DRAFT_COLUMN.label}
                <Badge variant="outline" className="ml-auto text-xs">{drafts.length}</Badge>
              </div>
              <div className="space-y-2 min-h-[100px]">
                {draftsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
                ) : drafts.length === 0 ? (
                  <div className="py-8 text-center text-[10px] text-muted-foreground border border-dashed border-border/30 rounded-xl">
                    Nenhum rascunho
                  </div>
                ) : (
                  <AnimatePresence>
                    {drafts.map(draft => (
                      <motion.div
                        key={draft.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                      >
                        <Card className="glass-card border-border/40 hover:shadow-md transition-all group">
                          <CardContent className="p-3 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs line-clamp-3">{draft.content || "Sem conteúdo"}</p>
                                {draft.media_ids && draft.media_ids.length > 0 && (
                                  <p className="text-[10px] text-muted-foreground mt-1">
                                    {draft.media_ids.length} mídia(s)
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => deleteDraft(draft.id)}>
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                            {draft.platforms && draft.platforms.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {draft.platforms.map(pid => {
                                  const meta = platformMetadata[pid];
                                  return (
                                    <span key={pid} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted/50 px-1 py-0.5 rounded">
                                      {meta ? <meta.icon className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                                      {meta?.name || pid}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                            <div className="flex gap-1 pt-1 border-t border-border/20">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-[10px] text-emerald-400"
                                onClick={() => handlePublishDraft(draft)}
                                disabled={publishingTaskId === draft.id}
                              >
                                {publishingTaskId === draft.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                Publicar
                              </Button>
                              {selectedProject && (
                                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-400" onClick={() => convertDraftToTask(draft)}>
                                  <Plus className="w-3 h-3 mr-1" /> Tarefa
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
          )}
        </TabsContent>
        </Tabs>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Projetos & Tarefas</h2>
          <p className="text-muted-foreground">Gerencie seus projetos e organize tarefas no estilo Kanban.</p>
        </div>
        <Button onClick={() => setShowNewProject(!showNewProject)} className="shadow-lg shadow-primary/20">
          {showNewProject ? <FolderKanban className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showNewProject ? "Ver Projetos" : "Novo Projeto"}
        </Button>
      </div>

      {showNewProject && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Criar Novo Projeto</CardTitle>
              <CardDescription>Organize tarefas e acompanhe o progresso.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                placeholder="Nome do projeto"
                value={newProject.name}
                onChange={e => setNewProject({ ...newProject, name: e.target.value })}
              />
              <Textarea
                placeholder="Descrição (opcional)"
                value={newProject.description}
                onChange={e => setNewProject({ ...newProject, description: e.target.value })}
                rows={3}
              />
              <Button onClick={handleSaveProject} disabled={saving || !newProject.name} className="w-full">
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                Salvar Projeto
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="py-20 text-center glass-card rounded-2xl border-dashed">
          <FolderKanban className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
          <p className="text-muted-foreground">Nenhum projeto criado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <motion.div key={project.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card
                className="glass-card hover:shadow-xl hover:shadow-primary/5 transition-all group border-border/40 cursor-pointer"
                onClick={() => handleSelectProject(project)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <FolderKanban className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{project.name}</CardTitle>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                      className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                {project.description && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                  </CardContent>
                )}
                <CardFooter className="text-xs text-muted-foreground border-t border-border/20 pt-3">
                  <CalendarIcon className="w-3 h-3 mr-1" />
                  {format(new Date(project.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
