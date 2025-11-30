import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Circle, Clock, Plus, User, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export default function CaseTaskManager({ caseId, user }) {
  const [newTask, setNewTask] = useState({ title: "", assigned_to: "", priority: "medium" });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['case-tasks', caseId],
    queryFn: () => base44.entities.CaseTask.filter({ case_id: caseId }, '-created_date'),
    enabled: !!caseId
  });

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['admin-team-tasks'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'admin' || u.is_admin);
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.CaseTask.create({
        ...data,
        case_id: caseId,
        assigned_by: user.email,
        status: 'todo'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['case-tasks', caseId]);
      setIsDialogOpen(false);
      setNewTask({ title: "", assigned_to: "", priority: "medium" });
    }
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.CaseTask.update(id, data);
    },
    onSuccess: () => queryClient.invalidateQueries(['case-tasks', caseId])
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (id) => base44.entities.CaseTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['case-tasks', caseId])
  });

  const priorityColors = {
    low: "bg-gray-500/20 text-gray-300",
    medium: "bg-blue-500/20 text-blue-300",
    high: "bg-orange-500/20 text-orange-300",
    critical: "bg-red-500/20 text-red-300"
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Task Board</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#1a2332] border-gray-800 text-white">
            <DialogHeader>
              <DialogTitle>New Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <Input
                placeholder="Task title"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="bg-[#0f1419] border-gray-700"
              />
              <Select
                value={newTask.assigned_to}
                onValueChange={(v) => setNewTask({ ...newTask, assigned_to: v })}
              >
                <SelectTrigger className="bg-[#0f1419] border-gray-700">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map(m => (
                    <SelectItem key={m.email} value={m.email}>{m.full_name || m.email}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={newTask.priority}
                onValueChange={(v) => setNewTask({ ...newTask, priority: v })}
              >
                <SelectTrigger className="bg-[#0f1419] border-gray-700">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => createTaskMutation.mutate(newTask)}
                disabled={!newTask.title || !newTask.assigned_to}
                className="w-full bg-purple-600"
              >
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {tasks.map(task => (
          <div key={task.id} className="p-3 bg-[#0f1419] rounded-lg border border-gray-800 flex items-center gap-3 group">
            <button
              onClick={() => updateTaskMutation.mutate({
                id: task.id,
                data: { status: task.status === 'done' ? 'todo' : 'done' }
              })}
              className={`flex-shrink-0 transition-colors ${
                task.status === 'done' ? 'text-green-400' : 'text-gray-500 hover:text-white'
              }`}
            >
              {task.status === 'done' ? <CheckCircle className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
            </button>
            
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${task.status === 'done' ? 'text-gray-500 line-through' : 'text-white'}`}>
                {task.title}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {teamMembers.find(m => m.email === task.assigned_to)?.full_name || task.assigned_to}
                </div>
                {task.due_date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(task.due_date), 'MMM d')}
                  </div>
                )}
              </div>
            </div>

            <Badge className={`${priorityColors[task.priority]} capitalize`}>
              {task.priority}
            </Badge>

            <button 
              onClick={() => deleteTaskMutation.mutate(task.id)}
              className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {tasks.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">No tasks assigned for this case.</p>
        )}
      </div>
    </div>
  );
}