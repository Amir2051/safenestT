import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckSquare, Clock, AlertCircle, CheckCircle, 
  FileText, Users, Calendar, Filter
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AttorneyTasks() {
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const queryClient = useQueryClient();

  const { data: tasks = [] } = useQuery({
    queryKey: ['attorney-tasks'],
    queryFn: () => base44.entities.AttorneyTask.filter({ assigned_to: user?.email }, '-created_date'),
    enabled: !!user,
    initialData: [],
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AttorneyTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attorney-tasks'] });
      toast.success('Task updated');
    },
  });

  const handleStatusChange = (task, newStatus) => {
    updateTaskMutation.mutate({
      id: task.id,
      data: {
        status: newStatus,
        completed_date: newStatus === 'completed' ? new Date().toISOString() : null
      }
    });
  };

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.status === filterStatus;
    const priorityMatch = filterPriority === 'all' || task.priority === filterPriority;
    return statusMatch && priorityMatch;
  });

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const overdueTasks = tasks.filter(t => 
    t.status !== 'completed' && 
    t.due_date && 
    new Date(t.due_date) < new Date()
  ).length;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <CheckSquare className="w-8 h-8 text-purple-400" />
          My Tasks
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
            Attorney Dashboard
          </Badge>
        </h1>
        <p className="text-gray-400 mt-1">
          Tasks automatically assigned by workflow automation
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-yellow-500/20">
          <CardContent className="p-6">
            <Clock className="w-8 h-8 text-yellow-400 mb-2" />
            <p className="text-3xl font-bold text-yellow-400">{pendingTasks}</p>
            <p className="text-sm text-gray-400">Pending</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-blue-500/20">
          <CardContent className="p-6">
            <AlertCircle className="w-8 h-8 text-blue-400 mb-2" />
            <p className="text-3xl font-bold text-blue-400">{inProgressTasks}</p>
            <p className="text-sm text-gray-400">In Progress</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-green-500/20">
          <CardContent className="p-6">
            <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
            <p className="text-3xl font-bold text-green-400">{completedTasks}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-red-500/20">
          <CardContent className="p-6">
            <AlertCircle className="w-8 h-8 text-red-400 mb-2 animate-pulse" />
            <p className="text-3xl font-bold text-red-400">{overdueTasks}</p>
            <p className="text-sm text-gray-400">Overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <Filter className="w-5 h-5 text-cyan-400" />
            
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('all')}
                className={filterStatus === 'all' ? 'bg-cyan-500' : ''}
              >
                All
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'pending' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('pending')}
                className={filterStatus === 'pending' ? 'bg-yellow-500' : ''}
              >
                Pending
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'in_progress' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('in_progress')}
                className={filterStatus === 'in_progress' ? 'bg-blue-500' : ''}
              >
                In Progress
              </Button>
              <Button
                size="sm"
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                onClick={() => setFilterStatus('completed')}
                className={filterStatus === 'completed' ? 'bg-green-500' : ''}
              >
                Completed
              </Button>
            </div>

            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant={filterPriority === 'urgent' ? 'default' : 'outline'}
                onClick={() => setFilterPriority(filterPriority === 'urgent' ? 'all' : 'urgent')}
                className={filterPriority === 'urgent' ? 'bg-red-500' : ''}
              >
                Urgent Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks List */}
      <Card className="bg-gradient-to-br from-[#1a2332] to-[#0f1419] border-cyan-500/20">
        <CardHeader>
          <CardTitle className="text-white">Tasks ({filteredTasks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckSquare className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-white font-semibold">No tasks found</p>
              <p className="text-gray-400 text-sm mt-1">
                Tasks will appear here when documents are submitted for review
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map(task => {
                const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

                return (
                  <div
                    key={task.id}
                    className={`bg-[#0f1419] rounded-lg p-4 border-2 ${
                      isOverdue ? 'border-red-500/30' : 'border-cyan-500/10'
                    } hover:border-cyan-500/30 transition-all`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-5 h-5 text-cyan-400" />
                          <h3 className="text-white font-bold">{task.title}</h3>
                          <Badge className={getPriorityColor(task.priority)}>
                            {task.priority}
                          </Badge>
                          <Badge className={getStatusColor(task.status)}>
                            {task.status}
                          </Badge>
                          {task.auto_generated && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/50">
                              🤖 Auto
                            </Badge>
                          )}
                          {isOverdue && (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/50 animate-pulse">
                              ⚠️ Overdue
                            </Badge>
                          )}
                        </div>

                        <p className="text-sm text-gray-400 mb-3">{task.description}</p>

                        <div className="flex gap-4 text-xs text-gray-500">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              Due: {format(new Date(task.due_date), 'MMM dd, yyyy')}
                            </div>
                          )}
                          {task.workspace_id && (
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              Workspace
                            </div>
                          )}
                          <div>
                            Created: {format(new Date(task.created_date), 'MMM dd, HH:mm')}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {task.status === 'pending' && (
                          <Button
                            onClick={() => handleStatusChange(task, 'in_progress')}
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600"
                          >
                            Start
                          </Button>
                        )}
                        {task.status === 'in_progress' && (
                          <Button
                            onClick={() => handleStatusChange(task, 'completed')}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Complete
                          </Button>
                        )}
                        {task.workspace_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-cyan-500/20 text-cyan-400"
                            onClick={() => window.location.href = `/collaboration`}
                          >
                            Open Workspace
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}