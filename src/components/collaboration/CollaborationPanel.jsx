import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, CheckSquare, StickyNote } from "lucide-react";
import CaseChat from "./CaseChat";
import CaseTaskManager from "./CaseTaskManager";
import CaseNotes from "./CaseNotes";

export default function CollaborationPanel({ caseId, user }) {
  if (!caseId) return null;

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="chat" className="flex-1 flex flex-col">
        <div className="px-1 pb-2">
          <TabsList className="w-full grid grid-cols-3 bg-[#0f1419] border border-gray-800">
            <TabsTrigger value="chat" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400">
              <MessageSquare className="w-4 h-4 mr-2" /> Chat
            </TabsTrigger>
            <TabsTrigger value="tasks" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
              <CheckSquare className="w-4 h-4 mr-2" /> Tasks
            </TabsTrigger>
            <TabsTrigger value="notes" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">
              <StickyNote className="w-4 h-4 mr-2" /> Notes
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <TabsContent value="chat" className="h-full m-0 p-1">
            <CaseChat caseId={caseId} user={user} />
          </TabsContent>
          <TabsContent value="tasks" className="h-full m-0 p-1">
            <CaseTaskManager caseId={caseId} user={user} />
          </TabsContent>
          <TabsContent value="notes" className="h-full m-0 p-1">
            <CaseNotes caseId={caseId} user={user} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}