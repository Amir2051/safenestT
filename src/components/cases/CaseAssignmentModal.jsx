import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Loader2, UserPlus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function CaseAssignmentModal({ caseId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState("");
  const queryClient = useQueryClient();

  // Fetch all admins/staff
  const { data: staff = [] } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      // Assuming we can filter users by role, or just fetch all and filter client-side
      // Note: User entity listing might be restricted to admins
      const users = await base44.entities.User.list();
      return users.filter(u => u.role === 'admin' || u.role === 'moderator' || u.role === 'staff');
    },
    enabled: isOpen
  });

  const assignMutation = useMutation({
    mutationFn: async (email) => {
      return await base44.entities.ClientCase.update(caseId, {
        assigned_to: email,
        status: 'In Progress' // Auto update status
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-cases'] });
      toast.success("Case assigned successfully");
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to assign case: " + error.message);
    }
  });

  const handleAssign = () => {
    if (!selectedUser) return;
    assignMutation.mutate(selectedUser);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
          <UserPlus className="w-4 h-4 mr-2" />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#1a2332] border-gray-700 text-white sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Assign Case</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-400">Select a team member to assign this case to.</p>
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="bg-[#0f1419] border-gray-600 text-white w-full">
              <SelectValue placeholder="Select staff member" />
            </SelectTrigger>
            <SelectContent>
              {staff.map(user => (
                <SelectItem key={user.id} value={user.email}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400">
                      {user.full_name?.[0] || user.email[0]}
                    </div>
                    <span>{user.full_name || user.email}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedUser || assignMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
            {assignMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Assign User
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}